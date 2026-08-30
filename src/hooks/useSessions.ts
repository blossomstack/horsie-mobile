import { useEffect } from "react";
import { AppState } from "react-native";
import EventSource from "react-native-sse";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { authHeaders, scopedUrl } from "@/api/connection";
import { useConnection } from "@/state/connection";
import type { ListSessionsResponse } from "@/api/types";

export const sessionsKey = (project: string | null) => ["sessions", project] as const;

export function useSessions() {
  const { project } = useConnection();
  return useQuery({
    queryKey: sessionsKey(project),
    queryFn: () => api.sessions.list(),
    enabled: project !== null,
  });
}

export function useSession(id: string) {
  const { project } = useConnection();
  return useQuery({
    queryKey: ["session", project, id],
    queryFn: () => api.sessions.get(id),
    enabled: project !== null,
  });
}

/**
 * Keep the session list live.
 *
 * `react-native-sse` rather than `EventSource`: React Native ships no
 * `EventSource` at all, and the browser one could not carry the bearer token
 * this app authenticates with even if it did.
 *
 * A frame carries the whole list — the server's revision counter says *that*
 * the list moved, never what moved in it — so this replaces the cache rather
 * than patching it.
 *
 * The stream is dropped while the app is backgrounded. iOS will tear the
 * socket down anyway, and a held connection that the OS has quietly killed
 * looks exactly like a connection with nothing to say.
 */
export function useSessionFeed() {
  const client = useQueryClient();
  const { project, signedIn } = useConnection();

  useEffect(() => {
    if (!project || !signedIn) return;

    let es: EventSource | null = null;

    const open = () => {
      if (es) return;
      es = new EventSource(scopedUrl("/events"), {
        headers: authHeaders(),
        // A frame arrives when something changed, which can be minutes apart.
        // Without this the library treats a quiet stream as a dead one.
        timeout: 0,
        timeoutBeforeConnection: 0,
      });
      es.addEventListener("message", (event) => {
        if (!event.data) return;
        try {
          client.setQueryData(
            sessionsKey(project),
            JSON.parse(event.data) as ListSessionsResponse,
          );
          // The inbox has no feed of its own. A frame is published when a
          // session's state moves, which is exactly when an agent has parked
          // on a question or said something — cheaper than a second stream,
          // and it never fires when nothing happened.
          void client.invalidateQueries({ queryKey: ["inbox", project] });
        } catch {
          /* a truncated frame; the next one carries the whole list again */
        }
      });
    };

    const close = () => {
      es?.removeAllEventListeners();
      es?.close();
      es = null;
    };

    open();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        open();
        // The list moved while we were not listening, and the feed only
        // speaks when it moves again.
        void client.invalidateQueries({ queryKey: sessionsKey(project) });
        void client.invalidateQueries({ queryKey: ["inbox", project] });
      } else {
        close();
      }
    });

    return () => {
      sub.remove();
      close();
    };
  }, [client, project, signedIn]);
}
