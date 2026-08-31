import { StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, Paperclip, Plus, Send } from "lucide-react-native";
import type { ReactNode } from "react";
import { Body, IconButton } from "@/components/ui";
import { isIOS, radii, space, touchTarget, type, useColors } from "@/theme";

/**
 * The two attachment buttons, placed the way each platform places them.
 *
 * iOS puts them outside the field as tinted circles; M3 puts them inside it at
 * the trailing edge. Both are bumped to the platform's minimum target — the
 * mock draws them at 38pt, and 38pt is a miss.
 */
export function AttachButtons({
  onAttach,
  onCamera,
}: {
  onAttach: () => void;
  onCamera: () => void;
}) {
  const c = useColors();
  return (
    <>
      <IconButton
        accessibilityLabel="Attach a file"
        fill={isIOS ? "keycap" : "none"}
        size={touchTarget}
        onPress={onAttach}
      >
        {isIOS ? (
          <Plus size={21} color={c.accent} />
        ) : (
          <Paperclip size={22} color={c.legendDim} />
        )}
      </IconButton>
      <IconButton
        accessibilityLabel="Take a photo"
        fill={isIOS ? "keycap" : "none"}
        size={touchTarget}
        onPress={onCamera}
      >
        <Camera size={isIOS ? 20 : 22} color={isIOS ? c.accent : c.legendDim} />
      </IconButton>
    </>
  );
}

/**
 * The bar you say something from.
 *
 * Two bars behind one name. iOS floats a glass strip over the transcript with
 * round buttons either side of a pill field; M3 puts one raised pill field on a
 * `surface-container` bar with its actions *inside* the field and a filled
 * square send beside it. The difference is not decoration — it is where each
 * platform expects your thumb to be.
 *
 * `leading` is where attachment actions go. It is a slot rather than a set of
 * props because iOS wants those buttons outside the field and Android wants
 * them inside it, and only the caller can know which of its own affordances
 * it is offering.
 */
export function Composer({
  value,
  onChangeText,
  onSend,
  canSend,
  leading,
  above,
  placeholder = "Say something",
}: {
  value: string;
  onChangeText: (next: string) => void;
  onSend: () => void;
  canSend: boolean;
  leading?: ReactNode;
  /** Thumbnails and file chips, which sit above the field on both platforms. */
  above?: ReactNode;
  placeholder?: string;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: isIOS ? c.glass : c.panelRaised,
        borderTopWidth: isIOS ? StyleSheet.hairlineWidth : 0,
        borderTopColor: c.edge,
        paddingHorizontal: isIOS ? space.md : space.md,
        paddingTop: isIOS ? 10 : space.sm,
        paddingBottom: (isIOS ? 10 : space.sm) + insets.bottom,
        gap: space.sm,
      }}
    >
      {above}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: space.sm,
        }}
      >
        {isIOS ? leading : null}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "flex-end",
            backgroundColor: isIOS ? c.panel : c.surfaceHigh,
            borderRadius: radii.field,
            borderWidth: isIOS ? StyleSheet.hairlineWidth : 0,
            borderColor: c.edge,
            paddingLeft: isIOS ? 14 : 18,
            paddingRight: isIOS ? 14 : space.xs,
          }}
        >
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={c.legendFaint}
            multiline
            style={{
              flex: 1,
              maxHeight: 120,
              paddingVertical: isIOS ? 10 : 12,
              color: c.legend,
              ...type.body,
            }}
          />
          {isIOS ? null : leading}
        </View>
        <IconButton
          accessibilityLabel="Send"
          disabled={!canSend}
          onPress={onSend}
          shape={isIOS ? "circle" : "square"}
          fill={isIOS ? "accent" : "quiet"}
          size={isIOS ? 44 : 48}
        >
          <Send
            size={isIOS ? 19 : 22}
            color={isIOS ? c.accentInk : c.accentQuietInk}
          />
        </IconButton>
      </View>
    </View>
  );
}

/** What a bar that cannot take a message says instead. Said rather than
 * disabled: a greyed-out box reads as "not yet", and this one is never going
 * to accept anything. */
export function ComposerNotice({ children }: { children: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: isIOS ? c.glass : c.panelRaised,
        borderTopWidth: isIOS ? StyleSheet.hairlineWidth : 0,
        borderTopColor: c.edge,
        paddingHorizontal: space.lg,
        paddingTop: space.md,
        paddingBottom: space.md + insets.bottom,
      }}
    >
      <Body role="subhead" tone="faint">
        {children}
      </Body>
    </View>
  );
}
