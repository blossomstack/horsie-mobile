import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { errorCodes, isErrorWithCode, pick } from "@react-native-documents/picker";

/** Which picker to show. */
export type PickSource = "photos" | "camera" | "files";

export interface PickedFile {
  uri: string;
  name: string;
  mediaType: string;
  byteSize: number;
}

/**
 * The three native pickers, behind one call.
 *
 * Two libraries, because no single one does both a camera and a document
 * provider well, and one shape out of them, because everything downstream —
 * the upload, the thumbnail, the chip — only ever wants a uri, a name, a type
 * and a size.
 *
 * A cancel answers with an empty list rather than throwing. Backing out of a
 * picker is not an error; it is the most common thing a person does with one,
 * and a caller that had to catch it would catch real failures with it.
 */
export async function pickFrom(source: PickSource): Promise<PickedFile[]> {
  if (source === "files") return await pickDocuments();
  return await pickImages(source);
}

async function pickImages(source: PickSource): Promise<PickedFile[]> {
  const options = { mediaType: "photo" as const, selectionLimit: 1 };
  const result =
    source === "camera"
      ? await launchCamera(options)
      : await launchImageLibrary(options);

  if (result.didCancel) return [];
  if (result.errorCode) {
    throw new Error(result.errorMessage ?? describe(result.errorCode));
  }
  return (result.assets ?? [])
    .filter((asset) => asset.uri !== undefined)
    .map((asset) => ({
      uri: asset.uri as string,
      name: asset.fileName ?? "photo.jpg",
      mediaType: asset.type ?? "image/jpeg",
      byteSize: asset.fileSize ?? 0,
    }));
}

async function pickDocuments(): Promise<PickedFile[]> {
  try {
    const picked = await pick({ mode: "import" });
    return picked
      .filter((file) => file.error === null)
      .map((file) => ({
        uri: file.uri,
        name: file.name ?? "document",
        mediaType: file.type ?? "application/octet-stream",
        byteSize: file.size ?? 0,
      }));
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) return [];
    throw e;
  }
}

function describe(code: string): string {
  switch (code) {
    case "camera_unavailable":
      return "This device has no camera available.";
    case "permission":
      return "Horsie has not been allowed to use that. Grant it in Settings.";
    default:
      return "That picker could not be opened.";
  }
}
