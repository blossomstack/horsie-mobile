import { parse, unreachable } from "./http";
import type {
  AuthStatus,
  DeviceCodeResponse,
  DeviceTokenRequest,
  TokenPair,
} from "./types";

/**
 * The three calls made against a server before it is a *connection*: is it
 * there, does it want a credential, and here is a device code.
 *
 * Separate from `client.ts` because those all read the module's current
 * server, and at this point there isn't one — the whole question is whether
 * this URL should become it.
 */
async function json<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw unreachable();
  }
  return parse<T>(res);
}

/** Is a horsie server listening here? */
export const health = (baseUrl: string): Promise<{ ok: boolean }> =>
  json(`${baseUrl}/api/health`);

/** Whether this deployment wants a credential, and who issues it. */
export const authStatus = (baseUrl: string): Promise<AuthStatus> =>
  json(`${baseUrl}/api/auth/status`);

export const deviceCode = (baseUrl: string): Promise<DeviceCodeResponse> =>
  json(`${baseUrl}/api/device/auth/code`, { method: "POST", body: "{}" });

export const deviceToken = (baseUrl: string, deviceCode: string): Promise<TokenPair> =>
  json(`${baseUrl}/api/device/auth/token`, {
    method: "POST",
    body: JSON.stringify({ deviceCode } satisfies DeviceTokenRequest),
  });
