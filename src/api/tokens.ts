import * as SecureStore from "expo-secure-store";
import type { TokenPair } from "./types";

/**
 * Where a signed-in server's credentials live.
 *
 * One entry per server rather than a single current one: pointing a phone at
 * both a laptop and a homelab is the normal case, and re-running the device
 * flow on every switch would make it the annoying case.
 *
 * SecureStore keys are restricted to alphanumerics and `._-`, so servers are
 * addressed by a generated id and the URL is carried in the value.
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

export async function listServers(): Promise<ServerRecord[]> {
  const raw = await SecureStore.getItemAsync(SERVERS_KEY);
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
  await SecureStore.setItemAsync(SERVERS_KEY, JSON.stringify(servers));
}

export async function upsertServer(server: ServerRecord): Promise<void> {
  const servers = await listServers();
  const at = servers.findIndex((s) => s.id === server.id);
  if (at >= 0) servers[at] = server;
  else servers.push(server);
  await writeServers(servers);
}

/** Forget a server and its credentials. */
export async function removeServer(id: string): Promise<void> {
  await writeServers((await listServers()).filter((s) => s.id !== id));
  await SecureStore.deleteItemAsync(tokensKey(id));
}

export async function readTokens(id: string): Promise<TokenPair | null> {
  const raw = await SecureStore.getItemAsync(tokensKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TokenPair;
  } catch {
    return null;
  }
}

export async function writeTokens(id: string, tokens: TokenPair): Promise<void> {
  await SecureStore.setItemAsync(tokensKey(id), JSON.stringify(tokens));
}

export async function clearTokens(id: string): Promise<void> {
  await SecureStore.deleteItemAsync(tokensKey(id));
}

/** An opaque id for a new server entry. Only has to be unique on this device. */
export function newServerId(): string {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** `https://Horsie.Example:3789/` → `https://horsie.example:3789`. */
export function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withScheme);
  url.hash = "";
  url.search = "";
  // A pasted URL often ends at the UI's own path. `/api` is appended by the
  // client, so anything left here would produce `/sessions/api/...`.
  url.pathname = url.pathname.replace(/\/api\/?$/, "");
  return url.toString().replace(/\/+$/, "");
}
