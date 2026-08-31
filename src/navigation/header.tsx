import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, X } from "lucide-react-native";
import { Body, IconButton } from "@/components/ui";
import { space, useColors } from "@/theme";
import { useScrollOffset } from "./scroll";

/** Where the medium bar has finished collapsing into a small one. */
const COLLAPSE_OVER = 48;

/**
 * Material 3's medium top app bar, and the small one it collapses into.
 *
 * One component for both states rather than two that swap, because swapping
 * them at a threshold makes the title jump: the whole point of the medium bar
 * is that the large title travels up into the small bar's slot as you scroll,
 * and it can only travel if it is the same view throughout.
 *
 * Android only. iOS gets this from `headerLargeTitle` and never renders here.
 */
export function TopAppBar({
  title,
  leading,
  actions,
  onBack,
}: {
  title: string;
  /** A glyph in the 56dp row above the title — a screen's own mark. */
  leading?: ReactNode;
  actions?: ReactNode;
  onBack?: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const scrollY = useScrollOffset();

  const large = useAnimatedStyle(() => {
    const t = scrollY
      ? interpolate(scrollY.value, [0, COLLAPSE_OVER], [1, 0], Extrapolation.CLAMP)
      : 1;
    return { opacity: t, height: 52 * t, marginBottom: space.md * t };
  });

  const inline = useAnimatedStyle(() => {
    const t = scrollY
      ? interpolate(scrollY.value, [0, COLLAPSE_OVER], [0, 1], Extrapolation.CLAMP)
      : 0;
    return { opacity: t };
  });

  return (
    <View style={{ backgroundColor: c.chassis, paddingTop: insets.top }}>
      <View
        style={{
          height: 56,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: space.xs,
        }}
      >
        {onBack ? (
          <IconButton accessibilityLabel="Back" onPress={onBack}>
            <ArrowLeft size={24} color={c.legend} />
          </IconButton>
        ) : (
          <View style={{ paddingLeft: space.md }}>{leading}</View>
        )}
        <Animated.View style={[{ flex: 1, paddingLeft: space.sm }, inline]}>
          <Body role="heading" numberOfLines={1}>
            {title}
          </Body>
        </Animated.View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {actions}
        </View>
      </View>
      <Animated.View
        style={[{ justifyContent: "flex-end", paddingHorizontal: space.lg }, large]}
      >
        <Body role="largeTitle" numberOfLines={1}>
          {title}
        </Body>
      </Animated.View>
    </View>
  );
}

/**
 * The bar that replaces the app bar while rows are selected.
 *
 * A separate component rather than a mode of the one above: it has a different
 * ground, a different height and a different job — it counts and it deletes,
 * where the other one names and navigates. Sharing them would mean every
 * property of both being conditional on a flag.
 */
export function ContextualAppBar({
  count,
  onClose,
  actions,
}: {
  count: number;
  onClose: () => void;
  actions?: ReactNode;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: c.panelRaised, paddingTop: insets.top }}>
      <View
        style={{
          height: 64,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: space.xs,
          gap: space.xs,
        }}
      >
        <IconButton accessibilityLabel="Leave selection" onPress={onClose}>
          <X size={24} color={c.legend} />
        </IconButton>
        <Body role="heading" style={{ flex: 1 }}>
          {`${count} selected`}
        </Body>
        {actions}
      </View>
    </View>
  );
}
