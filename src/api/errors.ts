/** A structured error carrying the server's `ApiError` envelope when present. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

/** No server reachable at all, as opposed to a server that answered badly. */
export function isNetworkError(e: unknown): boolean {
  return e instanceof ApiRequestError && e.status === 0 && e.code === "network";
}
