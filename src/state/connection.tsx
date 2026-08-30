import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getServer,
  onSignedOut,
  resume,
  setProject as setModuleProject,
  setServer,
  signOut as moduleSignOut,
} from "@/api/connection";
import {
  listServers,
  readTokens,
  upsertServer,
  writeTokens,
  removeServer as forgetServer,
  type ServerRecord,
} from "@/api/tokens";
import type { TokenPair } from "@/api/types";

/**
 * Which server and project the UI is on, mirrored into React so screens
 * re-render when it changes. The api module holds the same values because it
 * is not a React module and cannot read a context; this provider is the one
 * writer, so the two cannot disagree.
 */
interface ConnectionValue {
  /** null until the boot read of SecureStore finishes. */
  ready: boolean;
  server: ServerRecord | null;
  signedIn: boolean;
  project: string | null;
  servers: ServerRecord[];

  connect: (server: ServerRecord, tokens: TokenPair) => Promise<void>;
  /** Reconnect to a server already on the device. Returns false if its
   * credentials are gone and the device flow has to run again. */
  switchTo: (server: ServerRecord) => Promise<boolean>;
  chooseProject: (id: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  forget: (id: string) => Promise<void>;
}

const ConnectionContext = createContext<ConnectionValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [server, setServerState] = useState<ServerRecord | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [project, setProjectState] = useState<string | null>(null);
  const [servers, setServers] = useState<ServerRecord[]>([]);

  // Anything cached belongs to the server and project it was read from.
  // Keeping it across a switch paints one deployment's sessions under
  // another's name, which reads as data loss rather than as a stale cache.
  const reset = useCallback(() => queryClient.clear(), [queryClient]);

  useEffect(() => {
    void (async () => {
      const stored = await listServers();
      setServers(stored);
      const first = stored[0];
      if (first) {
        const ok = await resume(first);
        setServerState(first);
        setSignedIn(ok);
        setProjectState(first.project ?? null);
      }
      setReady(true);
    })();
  }, []);

  // A refresh that could not be renewed lands here. The screens watch
  // `signedIn` and send the person back to the device flow.
  useEffect(() => onSignedOut(() => setSignedIn(false)), []);

  const value = useMemo<ConnectionValue>(
    () => ({
      ready,
      server,
      signedIn,
      project,
      servers,

      connect: async (next, tokens) => {
        reset();
        await upsertServer(next);
        // Both, and in this order: the record says which server, the tokens
        // say we are signed in to it. Writing only the record left every
        // relaunch back at the device flow with a server already listed.
        await writeTokens(next.id, tokens);
        setServer(next, tokens);
        setServerState(next);
        setSignedIn(true);
        setProjectState(next.project ?? null);
        setServers(await listServers());
      },

      switchTo: async (next) => {
        reset();
        const tokens = await readTokens(next.id);
        setServer(next, tokens);
        setServerState(next);
        setSignedIn(tokens !== null);
        setProjectState(next.project ?? null);
        return tokens !== null;
      },

      chooseProject: async (id) => {
        reset();
        setModuleProject(id);
        setProjectState(id);
        const current = getServer();
        if (current) await upsertServer({ ...current, project: id ?? undefined });
      },

      signOut: async () => {
        reset();
        await moduleSignOut();
        setSignedIn(false);
      },

      forget: async (id) => {
        reset();
        await forgetServer(id);
        const rest = await listServers();
        setServers(rest);
        if (server?.id === id) {
          setServer(null, null);
          setServerState(null);
          setSignedIn(false);
          setProjectState(null);
        }
      },
    }),
    [ready, server, signedIn, project, servers, reset],
  );

  return (
    <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>
  );
}

export function useConnection(): ConnectionValue {
  const value = useContext(ConnectionContext);
  if (!value) throw new Error("useConnection outside ConnectionProvider");
  return value;
}
