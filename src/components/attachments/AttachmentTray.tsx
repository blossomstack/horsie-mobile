import { Image, Pressable, ScrollView, View } from "react-native";
import { CircleAlert, FileText, X } from "lucide-react-native";
import { Body, Mono, TextAction } from "@/components/ui";
import { bytes } from "@/components/transcript/Artifacts";
import { isIOS, radii, space, useColors } from "@/theme";
import type { PendingAttachment } from "@/hooks/useAttachments";

/**
 * What is attached to the message being written.
 *
 * Three states in one row, because they are three moments of the same thing
 * and moving between them must not move the row: a thumbnail going up carries
 * a scrim and a bar, a thumbnail that arrived carries neither, and one that
 * was refused is replaced in place by the server's reason and a Retry.
 */
export function AttachmentTray({
  items,
  onRemove,
  onRetry,
}: {
  items: PendingAttachment[];
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  if (items.length === 0) return null;

  const failed = items.filter((item) => item.error !== undefined);
  const ok = items.filter((item) => item.error === undefined);

  return (
    <View style={{ gap: space.sm }}>
      {ok.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm }}
        >
          {ok.map((item) =>
            item.mediaType.startsWith("image/") ? (
              <Thumbnail key={item.id} item={item} onRemove={onRemove} />
            ) : (
              <FileChip key={item.id} item={item} onRemove={onRemove} />
            ),
          )}
        </ScrollView>
      ) : null}
      {failed.map((item) => (
        <FailedRow
          key={item.id}
          item={item}
          onRemove={onRemove}
          onRetry={onRetry}
        />
      ))}
    </View>
  );
}

function Thumbnail({
  item,
  onRemove,
}: {
  item: PendingAttachment;
  onRemove: (id: string) => void;
}) {
  const c = useColors();
  const uploading = item.ref === undefined;
  const size = isIOS ? 58 : 60;
  return (
    <View style={{ width: size, height: size }}>
      <Image
        source={{ uri: item.uri }}
        style={{
          width: size,
          height: size,
          borderRadius: radii.block,
          backgroundColor: c.keycap,
        }}
      />
      {uploading ? (
        <View
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radii.block,
            backgroundColor: "rgba(0,0,0,.35)",
            justifyContent: "flex-end",
            overflow: "hidden",
          }}
        >
          {/* A real fraction, not a spinner: XHR reports bytes sent, and a
              determinate bar is the one thing that tells you whether a slow
              upload is moving. */}
          <View style={{ height: 3, backgroundColor: "rgba(255,255,255,.25)" }}>
            <View
              style={{
                height: 3,
                width: `${Math.round(item.progress * 100)}%`,
                backgroundColor: c.accent,
              }}
            />
          </View>
        </View>
      ) : null}
      <RemoveBadge onPress={() => onRemove(item.id)} />
    </View>
  );
}

function FileChip({
  item,
  onRemove,
}: {
  item: PendingAttachment;
  onRemove: (id: string) => void;
}) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        maxWidth: 220,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radii.chip,
        backgroundColor: c.keycap,
      }}
    >
      <FileText size={isIOS ? 17 : 20} color={c.legendDim} />
      <View style={{ flex: 1 }}>
        <Body role="subhead" numberOfLines={1}>
          {item.name}
        </Body>
        <Mono size="xs">
          {item.ref
            ? `${item.mediaType} · ${bytes(item.byteSize)}`
            : `uploading · ${bytes(Math.round(item.byteSize * item.progress))} of ${bytes(item.byteSize)}`}
        </Mono>
      </View>
      <Pressable
        onPress={() => onRemove(item.id)}
        hitSlop={space.md}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.name}`}
      >
        <X size={15} color={c.legendDim} />
      </Pressable>
    </View>
  );
}

/** The server's refusal, verbatim. A 413 says what the limit is, and a made-up
 * "upload failed" would throw that away. */
function FailedRow({
  item,
  onRemove,
  onRetry,
}: {
  item: PendingAttachment;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        padding: space.md,
        borderRadius: radii.block,
        backgroundColor: c.redQuiet,
      }}
    >
      <CircleAlert size={17} color={c.red} />
      <View style={{ flex: 1 }}>
        <Body role="callout" numberOfLines={1}>
          {item.name}
        </Body>
        <Mono size="xs" tone="danger" numberOfLines={2}>
          {item.error}
        </Mono>
      </View>
      <TextAction role="callout" label="Retry" onPress={() => onRetry(item.id)} />
      <Pressable
        onPress={() => onRemove(item.id)}
        hitSlop={space.md}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.name}`}
      >
        <X size={15} color={c.redInk} />
      </Pressable>
    </View>
  );
}

function RemoveBadge({ onPress }: { onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={space.md}
      accessibilityRole="button"
      accessibilityLabel="Remove attachment"
      style={{
        position: "absolute",
        top: -6,
        right: -6,
        width: 17,
        height: 17,
        borderRadius: 8.5,
        backgroundColor: c.legend,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <X size={11} color={c.chassis} strokeWidth={3} />
    </Pressable>
  );
}
