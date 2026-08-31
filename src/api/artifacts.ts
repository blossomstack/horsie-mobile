import { ApiRequestError } from "./errors";
import { authHeaders, scopedUrl } from "./connection";
import { parse } from "./http";
import type { ArtifactRef } from "./types";

/**
 * The largest file the server will take, restated here.
 *
 * A client-side cap so a 12 MB photo is refused before it is read into memory
 * and pushed over a phone connection to be rejected. Not a substitute for the
 * server's own check — that one is authoritative and its refusal is shown
 * verbatim — but a copy of it that costs nothing to enforce early.
 */
export const MAX_ARTIFACT_BYTES = 10 * 1024 * 1024;

export interface UploadHandle {
  ref: Promise<ArtifactRef>;
  /** Stop the transfer. The promise rejects with `upload_cancelled`. */
  cancel: () => void;
}

/**
 * Send one file's bytes and get back the reference a message carries.
 *
 * `XMLHttpRequest` rather than `fetch`, for one reason: progress. A phone
 * uploading a photo over a slow link needs to show that something is
 * happening, and `fetch` reports nothing until it is finished. XHR is also the
 * only one of the two that can be aborted mid-body here.
 *
 * The body is the raw bytes, not multipart — that is the shape the server
 * takes, and the filename rides in the query string because a paste has none.
 * The `Content-Type` is deliberately not asserted: the server sniffs the bytes
 * and ignores whatever a client claims, so sending a guess would only be a way
 * to be wrong.
 */
export function uploadArtifact(
  file: { uri: string; filename?: string },
  onProgress?: (fraction: number) => void,
): UploadHandle {
  const request = new XMLHttpRequest();
  let cancelled = false;

  const ref = (async (): Promise<ArtifactRef> => {
    // `file://` and `content://` both read through RN's own blob support, so
    // this is the one path that works for a camera capture, a photo library
    // pick and a document provider alike.
    const blob = await readBlob(file.uri);
    if (blob.size > MAX_ARTIFACT_BYTES) {
      throw new ApiRequestError(
        0,
        "artifact-too-large",
        `That file is ${Math.round(blob.size / (1024 * 1024))} MB. The limit is ${MAX_ARTIFACT_BYTES / (1024 * 1024)} MB.`,
      );
    }

    const query = file.filename
      ? `?filename=${encodeURIComponent(file.filename)}`
      : "";
    const url = scopedUrl(`/artifacts${query}`);

    return await new Promise<ArtifactRef>((resolve, reject) => {
      request.open("POST", url);
      for (const [name, value] of Object.entries(authHeaders())) {
        request.setRequestHeader(name, value);
      }
      if (request.upload && onProgress) {
        request.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            onProgress(event.loaded / event.total);
          }
        };
      }
      request.onload = () => {
        // Reuse the one place that knows how to read a horsie error envelope,
        // so a 413 here says what a 413 anywhere else says.
        void parse<ArtifactRef>(
          new Response(request.responseText, { status: request.status }),
        ).then(resolve, reject);
      };
      request.onerror = () =>
        reject(
          new ApiRequestError(
            0,
            "network",
            "Could not reach the horsie server to upload that.",
          ),
        );
      request.onabort = () =>
        reject(new ApiRequestError(0, "upload_cancelled", "Upload cancelled."));
      request.send(blob);
    });
  })();

  return {
    ref,
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      request.abort();
    },
  };
}

async function readBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return await res.blob();
}
