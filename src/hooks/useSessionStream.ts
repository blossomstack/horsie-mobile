import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { AppState } from "react-native";
import EventSource from "react-native-sse";
import { useQueryClient } from "@tanstack/react-query";
import { MAIN_AGENT, api } from "@/api/client";
import { authHeaders, scopedUrl } from "@/api/connection";
import {
  INITIAL,
  PAGE,
  deriveStream,
  fold,
  reducer,
  type SessionStream,
} from "@/core/transcript";
import { useConnection } from "@/state/connection";
import type { MessageFrame } from "@/api/types";
import { useAgent, useSession } from "./useSessions";

let optimisticSeq = 0;

/**
 * Reads one agent's log through `GET /sessions/:id/messages`.
 *
 * One connection, one order, one source. The stream replays from the start and
 * then goes live, so there is no seam between a backfill and a subscription for
 * a turn to fall through. Status, the queue, the task list and the last error
 * are folded from the same entries the transcript is built from.
 *
 * Every decision above the transport lives in `@/core/transcript`, which has
 * no React and no React Native in it — the transport is the only part of the
 * web client's version that could not be carried over as-is.
 */
export function useSessionStream(
  sessionId: string | undefined,
  agentId: string = MAIN_AGENT,
): {
  stream: SessionStream;
  addOptimisticUser: (text: string) => string;
  removeOptimisticUser: (id: string) => void;
  ackOptimisticUser: (id: string, serverId: string) => void;
  loadMore: () => void;
} {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const queryClient = useQueryClient();
  const { project } = useConnection();
  const { data: agentDoc } = useAgent(sessionId, agentId);

  const earliestRef = useRef<number | null>(null);
  earliestRef.current = state.entries[0]?.seq ?? null;
  const canLoadMore = state.hasMoreBefore && !state.loadingMore;
  const canLoadMoreRef = useRef(canLoadMore);
  canLoadMoreRef.current = canLoadMore;

  useEffect(() => {
    dispatch({ kind: "reset" });
    if (!sessionId || !project) return;

    let es: EventSource | null = null;

    const open = () => {
      if (es) return;
      es = new EventSource(
        scopedUrl(
          `/sessions/${encodeURIComponent(sessionId)}/messages?aid=${encodeURIComponent(agentId)}`,
        ),
        {
          headers: authHeaders(),
          // A quiet agent sends nothing for minutes at a time; without this
          // the library treats a silent stream as a dead one and tears it down
          // mid-turn.
          timeout: 0,
          timeoutBeforeConnection: 0,
        },
      );
      es.addEventListener("open", () => dispatch({ kind: "connected", value: true }));
      es.addEventListener("message", (event) => {
        if (!event.data) return;
        try {
          dispatch({ kind: "frame", frame: JSON.parse(event.data) as MessageFrame });
        } catch {
          /* a truncated frame; the stream replays from the cursor on reconnect */
        }
      });
      es.addEventListener("error", () => {
        dispatch({ kind: "connected", value: false });
        // A session that has been deleted answers a non-200, and the library
        // will keep retrying against something that is gone. Re-ask whether it
        // exists and let the answer decide what to draw — a reset rather than
        // an invalidation, because the cached copy is exactly what is no
        // longer true.
        void queryClient.resetQueries({ queryKey: ["session", project, sessionId] });
      });
    };

    const close = () => {
      es?.removeAllEventListeners();
      es?.close();
      es = null;
    };

    open();
    // A backgrounded app cannot keep a socket, and one the OS has quietly
    // killed looks exactly like a connection with nothing to say. Dropping and
    // reopening costs a replay, which is the same thing a reconnect does.
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") open();
      else close();
    });

    return () => {
      sub.remove();
      close();
    };
  }, [sessionId, agentId, project, queryClient]);

  // Re-read the documents when a turn boundary passes, and again whenever the
  // roster moves — which is not the same moment. A subagent spawned in the
  // middle of a long turn changes no status, so a status-only trigger left it
  // undrawn until the turn ended. Both counters feed the same read; React
  // Query coalesces a frame that bumps both.
  const { statusSeq, rosterSeq } = useMemo(() => fold(state.entries), [state.entries]);
  useEffect(() => {
    if (!sessionId || statusSeq + rosterSeq === 0) return;
    void queryClient.invalidateQueries({ queryKey: ["agent", project, sessionId, agentId] });
    void queryClient.invalidateQueries({ queryKey: ["session", project, sessionId] });
  }, [sessionId, agentId, project, statusSeq, rosterSeq, queryClient]);

  const docTasks = agentDoc?.agent.tasks;
  const docSeq = agentDoc?.agent.asOfSeq;
  useEffect(() => {
    if (docTasks && docSeq !== undefined) {
      dispatch({ kind: "doc-tasks", tasks: docTasks, asOfSeq: docSeq });
    }
  }, [docTasks, docSeq]);

  const loadMore = useCallback(() => {
    const before = earliestRef.current;
    if (!sessionId || before === null || !canLoadMoreRef.current) return;
    dispatch({ kind: "loading-more", value: true });
    api.sessions
      .messages(sessionId, agentId, { before, max: PAGE })
      .then((page) => dispatch({ kind: "prepend", page }))
      .catch(() => dispatch({ kind: "loading-more", value: false }));
  }, [sessionId, agentId]);

  const addOptimisticUser = useCallback((text: string) => {
    const id = `optim-${optimisticSeq++}`;
    dispatch({ kind: "optimistic", id, text });
    return id;
  }, []);

  const removeOptimisticUser = useCallback(
    (id: string) => dispatch({ kind: "remove-optimistic", id }),
    [],
  );

  const ackOptimisticUser = useCallback(
    (id: string, serverId: string) => dispatch({ kind: "ack-optimistic", id, serverId }),
    [],
  );

  const stream = useMemo(() => deriveStream(state), [state]);

  return { stream, addOptimisticUser, removeOptimisticUser, ackOptimisticUser, loadMore };
}

export { useSession };
