import { ApiRequestError } from "./errors";

/**
 * Turn a `Response` into either a value or an `ApiRequestError`.
 *
 * Shared by the authenticated client and by the unauthenticated probe the
 * connect screen runs, so a server's error message reads the same before and
 * after sign-in.
 */
export async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let code = `http_${res.status}`;
    // `statusText` is empty over HTTP/2, so `${status} ${statusText}` renders
    // as a bare `422 ` with a trailing space. The status alone says more.
    let message = res.statusText ? `${res.status} ${res.statusText}` : `${res.status}`;
    // Read once as text, then try to parse. `res.json()` throws on a non-JSON
    // body and axum's own body rejections are `text/plain`, so the server's
    // real message would be discarded in favour of the bare status.
    const raw = await res.text().catch(() => "");
    let parsed: { message?: unknown; code?: unknown } | undefined;
    try {
      parsed = JSON.parse(raw) as { message?: unknown; code?: unknown };
    } catch {
      /* not JSON — the text itself is the message */
    }
    if (parsed && typeof parsed.message === "string") {
      message = parsed.message;
      if (typeof parsed.code === "string") code = parsed.code;
    } else if (raw.trim()) {
      message = raw.trim();
    }
    throw new ApiRequestError(res.status, code, message);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const unreachable = (): ApiRequestError =>
  new ApiRequestError(
    0,
    "network",
    "Could not reach the horsie server. Is it running, and is this device on the same network?",
  );
