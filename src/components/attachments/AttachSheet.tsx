import { ActionSheetIOS, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, FileText, Image as ImageIcon } from "lucide-react-native";
import { Body, Separator } from "@/components/ui";
import { isIOS, radii, space, useColors } from "@/theme";
import type { PickSource } from "@/lib/pickers";

const CHOICES: { source: PickSource; label: string }[] = [
  { source: "photos", label: "Photo Library" },
  { source: "camera", label: "Take Photo" },
  { source: "files", label: "Choose File" },
];

/**
 * Ask which picker to open.
 *
 * iOS has one of these built in and it is the right one — `ActionSheetIOS` is
 * the system sheet, so it inherits the exposure, the blur and the dismissal
 * behaviour without any of them being reimplemented. Android has no equivalent
 * native call from JS, so its bottom sheet is drawn here.
 */
export function openAttachSheet(onPick: (source: PickSource) => void): void {
  ActionSheetIOS.showActionSheetWithOptions(
    {
      title: "Attach to this message",
      options: [...CHOICES.map((choice) => choice.label), "Cancel"],
      cancelButtonIndex: CHOICES.length,
    },
    (index) => {
      const choice = CHOICES[index];
      if (choice) onPick(choice.source);
    },
  );
}

/** Android's sheet. Rendered rather than called, so it needs somewhere to live
 * and a flag to open it — which is the whole difference from the iOS path. */
export function AttachSheet({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (source: PickSource) => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  if (isIOS) return null;

  const glyph = (source: PickSource) =>
    source === "photos" ? (
      <ImageIcon size={24} color={c.legendDim} />
    ) : source === "camera" ? (
      <Camera size={24} color={c.legendDim} />
    ) : (
      <FileText size={24} color={c.legendDim} />
    );

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,.4)" }}
      />
      <View
        style={{
          backgroundColor: c.panelRaised,
          borderTopLeftRadius: radii.sheet,
          borderTopRightRadius: radii.sheet,
          paddingBottom: insets.bottom + space.sm,
        }}
      >
        <View style={{ alignItems: "center", paddingVertical: space.md }}>
          <View
            style={{
              width: 32,
              height: 4,
              borderRadius: 2,
              backgroundColor: c.edge,
            }}
          />
        </View>
        <Body
          role="body"
          tone="dim"
          style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}
        >
          Attach to this message
        </Body>
        <Separator />
        {CHOICES.map((choice) => (
          <Pressable
            key={choice.source}
            android_ripple={{ color: c.ripple }}
            onPress={() => {
              onClose();
              onPick(choice.source);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.lg,
              paddingHorizontal: space.lg,
              paddingVertical: 14,
            }}
          >
            {glyph(choice.source)}
            <Body role="body">{androidLabel(choice.source)}</Body>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

/** Android names the sources after what they are, not after Apple's apps. */
function androidLabel(source: PickSource): string {
  return source === "photos"
    ? "Photo"
    : source === "camera"
      ? "Camera"
      : "File";
}
