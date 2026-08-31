import { useState } from "react";
import { Image, Pressable, View } from "react-native";

import { FileText, ImageOff } from "lucide-react-native";
import { api } from "@/api/client";
import { authHeaders } from "@/api/connection";
import { Body, Mono } from "@/components/ui";
import type { ArtifactRef } from "@/api/types";
import { radii, space, useColors } from "@/theme";

/** `1048576` → `1.0 MB`. */
function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * What an agent produced or was handed: images and documents.
 *
 * The fold already collects these off every message and every tool result —
 * they were simply never drawn, so an agent that answered with a screenshot
 * appeared to have answered with nothing.
 *
 * The bytes live behind the same authenticated route as everything else, so
 * the image carries the bearer header rather than being a public URL.
 */
export function Artifacts({ items }: { items: ArtifactRef[] }) {
  if (items.length === 0) return null;
  return (
    <View style={{ gap: space.sm }}>
      {items.map((item) => (
        <Artifact key={item.id} item={item} />
      ))}
    </View>
  );
}

function Artifact({ item }: { item: ArtifactRef }) {
  const c = useColors();
  const [failed, setFailed] = useState(false);
  const name = item.filename ?? item.id;

  if (item.kind.kind === "Image" && !failed) {
    return (
      <Pressable>
        <Image
          source={{ uri: api.artifacts.url(item.id), headers: authHeaders() }}
          // Wide and capped rather than sized from the artifact's own
          // dimensions: a tall screenshot would otherwise take the whole
          // screen and bury the answer underneath it.
          style={{
            width: "100%",
            height: 220,
            borderRadius: radii.block,
            backgroundColor: c.codeFill,
          }}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      </Pressable>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        backgroundColor: c.codeFill,
        borderRadius: radii.block,
        padding: space.md,
      }}
    >
      {failed ? (
        <ImageOff size={16} color={c.redInk} />
      ) : (
        <FileText size={16} color={c.legendDim} />
      )}
      <View style={{ flex: 1 }}>
        <Body size="sm" numberOfLines={1}>
          {name}
        </Body>
        <Mono size="xs">
          {/* Says why, when an image would not load. A silent fall back to a
              file row reads as "this was always a document". */}
          {failed ? "could not be loaded" : `${item.mediaType} · ${bytes(item.byteSize)}`}
        </Mono>
      </View>
    </View>
  );
}
