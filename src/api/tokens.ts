import * as Keychain from "react-native-keychain";
import type { TokenPair } from "./types";

/**
 * Where a signed-in server's credentials live.
 *
 * One entry per server rather than a single current one: pointing a phone at
 * both a laptop and a homelab is the normal case, and re-running the device
 * flow on every switch would make it the annoying case.
 *
 * Servers are addressed by a generated id rather than by their URL: the URL is
 * the one field a person can edit, and keying the credential on it would
 * orphan the tokens the moment somebody fixed a typo in it.
 */
export interface ServerRecord {
  id: string;
  /** Origin with no trailing slash and no `/api` — e.g. `https://horsie.example`. */
  baseUrl: string;
  /** What the person called it. Falls back to the URL's host. */
  label: string;
  /** The project last used on this server, re-selected on reconnect. */
  project?: string;
}

const SERVERS_KEY = "horsie.servers.v1";
const tokensKey = (id: string) => `horsie.tokens.${id}`;

// react-native-keychain stores a username/password pair per "service". Only
// the password carries anything, so the username is a constant — the service
// name is the key.
const ACCOUNT = "horsie";

export async function readItem(key: string): Promise<string | null> {
  const entry = await Keychain.getGenericPassword({ service: key });
  return entry === false ? null : entry.password;
}

export async function writeItem(key: string, value: string): Promise<void> {
  await Keychain.setGenericPassword(ACCOUNT, value, { service: key });
}

async function deleteItem(key: string): Promise<void> {
  await Keychain.resetGenericPassword({ service: key });
}

export async function listServers(): Promise<ServerRecord[]> {
  const raw = await readItem(SERVERS_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ServerRecord[]) : [];
  } catch {
    // A corrupt index would otherwise wedge the app on every launch with no
    // way back short of reinstalling. An empty list sends you to the connect
    // screen, which is recoverable.
    return [];
  }
}

async function writeServers(servers: ServerRecord[]): Promise<void> {
  await writeItem(SERVERS_KEY, JSON.stringify(servers));
}

/**
 * Add or update a server, and make it the most recent.
 *
 * Order is meaningful: boot resumes `listServers()[0]`, so "first added" would
 * mean a second sign-in resumed the *older* server — with whatever project and
 * credentials it happened to have — while the app said it was connected to the
 * new one.
 */
export async function upsertServer(server: ServerRecord): Promise<void> {
  const rest = (await listServers()).filter((s) => s.id !== server.id);
  await writeServers([server, ...rest]);
}

/** Forget a server and its credentials. */
export async function removeServer(id: string): Promise<void> {
  await writeServers((await listServers()).filter((s) => s.id !== id));
  await deleteItem(tokensKey(id));
}

export async function readTokens(id: string): Promise<TokenPair | null> {
  const raw = await readItem(tokensKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TokenPair;
  } catch {
    return null;
  }
}

export async function writeTokens(id: string, tokens: TokenPair): Promise<void> {
  await writeItem(tokensKey(id), JSON.stringify(tokens));
}

export async function clearTokens(id: string): Promise<void> {
  await deleteItem(tokensKey(id));
}

/** An opaque id for a new server entry. Only has to be unique on this device. */
export function newServerId(): string {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}


/** `https://Horsie.Example:3789/api/` → `https://horsie.example:3789`.
 *
 * String surgery rather than `URL`: React Native's `URL` exposes its
 * components read-only, so the web version of this — which assigned to
 * `hash`, `search` and `pathname` — throws at runtime rather than failing to
 * compile.
 */
export function normalizeBaseUrl(input: string): string {
  let url = input.trim();
  url = url.split("#")[0].split("?")[0];
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  // A pasted address often ends at the UI's own path. `/api` is appended by
  // the client, so anything left here produces `/sessions/api/...`.
  url = url.replace(/\/api\/?$/i, "");
  return url.replace(/\/+$/, "");
}
