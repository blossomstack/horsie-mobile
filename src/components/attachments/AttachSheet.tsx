import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, FileText, Image as ImageIcon } from "lucide-react-native";
import { Body, Separator } from "@/components/ui";
import { isIOS, radii, space, useColors } from "@/theme";
import type { PickSource } from "@/lib/pickers";

const CHOICES: { source: PickSource; ios: string; android: string }[] = [
  { source: "photos", ios: "Photo Library", android: "Photo" },
  { source: "camera", ios: "Take Photo", android: "Camera" },
  { source: "files", ios: "Choose File", android: "File" },
];

/**
 * Ask which picker to open.
 *
 * Drawn here on both platforms rather than called from `ActionSheetIOS`, which
 * is what this used to do. From iOS 26 an action sheet with nothing to anchor
 * to no longer rises from the bottom — it lands in the middle of the screen as
 * an alert, Cancel folded in with the choices. That is a dialog interrupting
 * you, not a menu answering the button you pressed, and it is not what the
 * handoff draws.
 *
 * So one component, two looks: an iOS action sheet with its Cancel on its own
 * card, and an M3 bottom sheet with a drag handle and leading glyphs.
 */
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

  const choose = (source: PickSource) => {
    onClose();
    onPick(source);
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* The dim is the whole screen, not the part above the sheet: an iOS
          sheet is inset from the edges, and a backdrop that stopped at its top
          left the tab bar showing brightly through the gap beside Cancel. */}
      <Pressable
        onPress={onClose}
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,.4)" }]}
      />
      <View style={{ flex: 1 }} pointerEvents="none" />
      {isIOS ? (
        <View
          style={{
            paddingHorizontal: space.sm,
            paddingBottom: insets.bottom + space.sm,
            gap: space.sm,
          }}
        >
          <View
            style={{
              backgroundColor: c.panel,
              borderRadius: radii.ask,
              overflow: "hidden",
            }}
          >
            <View style={{ paddingVertical: space.md }}>
              <Body role="caption" tone="faint" align="center">
                Attach to this message
              </Body>
            </View>
            {CHOICES.map((choice) => (
              <View key={choice.source}>
                <Separator />
                <SheetRow label={choice.ios} onPress={() => choose(choice.source)} />
              </View>
            ))}
          </View>
          {/* Its own card, as iOS has always drawn it: backing out is not one
              of the three things this sheet is for. */}
          <View style={{ backgroundColor: c.panel, borderRadius: radii.ask }}>
            <SheetRow label="Cancel" weight="600" onPress={onClose} />
          </View>
        </View>
      ) : (
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
              onPress={() => choose(choice.source)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.lg,
                paddingHorizontal: space.lg,
                paddingVertical: 14,
              }}
            >
              <Glyph source={choice.source} />
              <Body role="body">{choice.android}</Body>
            </Pressable>
          ))}
        </View>
      )}
    </Modal>
  );
}

/** One line of the iOS sheet: a centred verb, nothing else. Regular weight for
 * the three things you came for, semibold for the one that leaves. */
function SheetRow({
  label,
  weight = "400",
  onPress,
}: {
  label: string;
  weight?: "400" | "600";
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 15,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Body role="heading" tone="accent" weight={weight} align="center">
        {label}
      </Body>
    </Pressable>
  );
}

function Glyph({ source }: { source: PickSource }) {
  const c = useColors();
  if (source === "photos") return <ImageIcon size={24} color={c.legendDim} />;
  if (source === "camera") return <Camera size={24} color={c.legendDim} />;
  return <FileText size={24} color={c.legendDim} />;
}
