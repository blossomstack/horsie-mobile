import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { Trash2 } from "lucide-react-native";
import { Body } from "@/components/ui";
import { isIOS, space, useColors } from "@/theme";

/** How wide the revealed action is. Android's card slides further than the
 * panel is wide, so the track keeps showing behind it. */
const PANEL_WIDTH = isIOS ? 84 : 72;

/**
 * A row you can swipe left to delete.
 *
 * One component for both lists, because a second copy is how the inbox and the
 * session list would end up with different frictions and different thresholds
 * for the same gesture.
 *
 * It renders no confirmation of its own: the caller owns the alert, because
 * only the caller knows what the thing being deleted is called and what goes
 * with it. This is the gesture and the panel, nothing else.
 *
 * The reveal has no radius. Its corners belong to the card above it — a
 * `GroupedCell` clips this, and a panel that rounded itself would show a
 * sliver of ground in the corner of every row it sat under.
 */
export function SwipeToDelete({
  children,
  onDelete,
  label = "Delete",
  accessibilityLabel,
}: {
  children: ReactNode;
  onDelete: () => void;
  label?: string;
  accessibilityLabel: string;
}) {
  const c = useColors();
  return (
    <Swipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={({ pressed }) => ({
            width: PANEL_WIDTH,
            backgroundColor: c.redQuiet,
            alignItems: isIOS ? "center" : "flex-end",
            justifyContent: "center",
            paddingRight: isIOS ? 0 : space.lg,
            gap: space.xs,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Trash2 size={isIOS ? 18 : 24} color={c.redInk} />
          <Body role="micro" tone="danger">
            {label}
          </Body>
        </Pressable>
      )}
    >
      {/* The row is opaque and shadowed so it reads as sliding *over* the
          panel rather than as the panel being a second row beside it. */}
      <View
        style={{
          backgroundColor: "transparent",
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 10,
          shadowOffset: { width: -2, height: 0 },
        }}
      >
        {children}
      </View>
    </Swipeable>
  );
}
