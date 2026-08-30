import { ApiRequestError } from "./errors";
import { parse, unreachable } from "./http";
import {
  clearTokens,
  readTokens,
  writeTokens,
  type ServerRecord,
} from "./tokens";
import type { RefreshRequest, TokenPair } from "./types";

/**
 * Which server and project every request goes to.
 *
 * Module state rather than an argument on eighty functions, and rather than a
 * React context this non-React module cannot read: the app is pointed at one
 * server in one project at a time. The connect and project screens set it
 * before any query runs, and clear React Query's cache when it changes, so a
 * switch refetches rather than painting one server's data under another's name.
 */
let server: ServerRecord | null = null;
let tokens: TokenPair | null = null;
let project: string | null = null;

/** Fired when a credential can no longer be renewed and the app must re-auth. */
type SignedOutListener = () => void;
const signedOutListeners = new Set<SignedOutListener>();

export function onSignedOut(fn: SignedOutListener): () => void {
  signedOutListeners.add(fn);
  return () => signedOutListeners.delete(fn);
}

export function getServer(): ServerRecord | null {
  return server;
}

export function getProject(): string | null {
  return project;
}

export function setProject(id: string | null): void {
  project = id;
}

/** Point the client at a server. `null` disconnects. */
export function setServer(next: ServerRecord | null, pair: TokenPair | null): void {
  server = next;
  tokens = pair;
  project = next?.project ?? null;
}

/** The origin every path below hangs off, e.g. `https://host:3789/api`. */
function apiBase(): string {
  if (!server) {
    throw new ApiRequestError(
      0,
      "no_server",
      "Not connected to a horsie server — this is a routing bug, not something to retry.",
    );
  }
  return `${server.baseUrl}/api`;
}

/**
 * A scoped path, prefixed with the project.
 *
 * Throws rather than falling back to some default when no project is set: a
 * default would make a routing bug look like an empty account, which is the
 * failure mode this whole design is built to avoid.
 */
export function scopedUrl(path: string): string {
  if (!project) {
    throw new ApiRequestError(
      0,
      "no_project",
      "No project selected — this is a routing bug, not something to retry.",
    );
  }
  return `${apiBase()}/p/${project}${path}`;
}

export function unscopedUrl(path: string): string {
  return `${apiBase()}${path}`;
}

/** The header an SSE client needs, so streams authenticate like everything else. */
export function authHeaders(): Record<string, string> {
  return tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {};
}

// One refresh at a time. A screen mounting six queries at once will see six
// simultaneous 401s, and the refresh token rotates on every use — six parallel
// refreshes would spend five dead tokens and sign the person out.
let refreshing: Promise<TokenPair | null> | null = null;

async function refreshTokens(): Promise<TokenPair | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    if (!server || !tokens) return null;
    try {
      const res = await fetch(`${server.baseUrl}/api/device/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refreshToken: tokens.refreshToken,
        } satisfies RefreshRequest),
      });
      if (!res.ok) {
        // Only the server saying no is terminal. A 502 from a proxy in front
        // of a restarting server is not a revoked credential, and deleting a
        // valid login over one is how you make a transient blip permanent.
        if (res.status >= 400 && res.status < 500) {
          await signOut();
        }
        return null;
      }
      const pair = (await res.json()) as TokenPair;
      tokens = pair;
      await writeTokens(server.id, pair);
      return pair;
    } catch {
      // Network failure: keep what we have and let the caller surface it.
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Drop this server's credentials and tell the app to show sign-in again. */
export async function signOut(): Promise<void> {
  const id = server?.id;
  tokens = null;
  if (id) await clearTokens(id);
  signedOutListeners.forEach((fn) => fn());
}

/** Reconnect to a stored server, if its credentials are still on the device. */
export async function resume(record: ServerRecord): Promise<boolean> {
  const pair = await readTokens(record.id);
  setServer(record, pair);
  return pair !== null;
}

async function once(url: string, init: RequestInit | undefined): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...init?.headers,
    },
  });
}

/**
 * Every request the app makes. Retries exactly once behind a refresh, because
 * an access token lives an hour and the app is mostly used in short visits
 * after a long gap — the first request of a session is the one that 401s.
 */
export async function send<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await once(url, init);
    if (res.status === 401 && tokens) {
      const pair = await refreshTokens();
      if (pair) {
        res = await once(url, init);
        // A token minted a moment ago and rejected on the very next request
        // is not an expiry — the credential is genuinely no longer accepted,
        // so send the person back to the device flow rather than leaving
        // every screen on a permission error it cannot act on.
        if (res.status === 401) await signOut();
      }
      // `pair === null` is deliberately NOT a sign-out here. `refreshTokens`
      // already signed out if the server *said no*; a null it returns for a
      // network failure must leave the credential alone, or a tunnel or a
      // restarting proxy costs the person their login.
    }
  } catch {
    throw unreachable();
  }
  return parse<T>(res);
}
