import { useCallback, useRef, useState } from "react";
import { ApiRequestError } from "@/api/errors";
import { uploadArtifact, type UploadHandle } from "@/api/artifacts";
import type { ArtifactRef } from "@/api/types";
import { pickFrom, type PickedFile, type PickSource } from "@/lib/pickers";

/**
 * One thing attached to a message that has not been sent yet.
 *
 * `ref` is the whole point: bytes go up on their own, and the message that
 * carries them names them by id. A pending item with no `ref` has not finished
 * uploading, and a message cannot be sent while one of those is in the tray —
 * sending it would silently drop the attachment.
 */
export interface PendingAttachment {
  id: string;
  uri: string;
  name: string;
  mediaType: string;
  byteSize: number;
  /** 0 to 1 while uploading; 1 once the server has the bytes. */
  progress: number;
  /** Present once the upload succeeded. */
  ref?: ArtifactRef;
  /** The server's own words, when it refused. */
  error?: string;
}

let counter = 0;
const nextId = () => `pending-${(counter += 1)}`;

/**
 * The tray under a composer.
 *
 * Uploads start the moment a file is picked rather than on send, so the wait
 * happens while the message is still being typed. That is also why a failure
 * is a row with Retry rather than an alert: by the time it fails the person
 * has moved on to writing, and a modal over the keyboard would take the screen
 * away from what they were doing.
 */
export function useAttachments() {
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const handles = useRef(new Map<string, UploadHandle>());

  const patch = useCallback(
    (id: string, change: Partial<PendingAttachment>) =>
      setPending((current) =>
        current.map((item) => (item.id === id ? { ...item, ...change } : item)),
      ),
    [],
  );

  const start = useCallback(
    (id: string, file: { uri: string; filename?: string }) => {
      const handle = uploadArtifact(file, (fraction) =>
        patch(id, { progress: fraction }),
      );
      handles.current.set(id, handle);
      handle.ref.then(
        (ref) => {
          handles.current.delete(id);
          patch(id, { ref, progress: 1, error: undefined });
        },
        (e: unknown) => {
          handles.current.delete(id);
          // A cancel is not a failure — the row is already gone.
          if (e instanceof ApiRequestError && e.code === "upload_cancelled") {
            return;
          }
          patch(id, {
            error:
              e instanceof ApiRequestError
                ? e.message
                : e instanceof Error
                  ? e.message
                  : "Could not be uploaded.",
          });
        },
      );
    },
    [patch],
  );

  const add = useCallback(
    (files: PickedFile[]) => {
      for (const file of files) {
        const id = nextId();
        setPending((current) => [
          ...current,
          {
            id,
            uri: file.uri,
            name: file.name,
            mediaType: file.mediaType,
            byteSize: file.byteSize,
            progress: 0,
          },
        ]);
        start(id, { uri: file.uri, filename: file.name });
      }
    },
    [start],
  );

  /** Show a picker of the given kind and attach whatever comes back. */
  const pick = useCallback(
    async (source: PickSource) => {
      const files = await pickFrom(source);
      if (files.length > 0) add(files);
    },
    [add],
  );

  const remove = useCallback((id: string) => {
    handles.current.get(id)?.cancel();
    handles.current.delete(id);
    setPending((current) => current.filter((item) => item.id !== id));
  }, []);

  const retry = useCallback(
    (id: string) => {
      setPending((current) => {
        const item = current.find((entry) => entry.id === id);
        if (item) start(id, { uri: item.uri, filename: item.name });
        return current.map((entry) =>
          entry.id === id
            ? { ...entry, error: undefined, progress: 0 }
            : entry,
        );
      });
    },
    [start],
  );

  const clear = useCallback(() => {
    for (const handle of handles.current.values()) handle.cancel();
    handles.current.clear();
    setPending([]);
  }, []);

  /** The ids to send with the message. */
  const refs = pending
    .map((item) => item.ref)
    .filter((ref): ref is ArtifactRef => ref !== undefined);

  /** False while anything is still going up or has failed: sending now would
   * post the text and quietly lose the file. */
  const settled = pending.every((item) => item.ref !== undefined);

  return { pending, add, pick, remove, retry, clear, refs, settled };
}
