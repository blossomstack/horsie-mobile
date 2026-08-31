import { Pressable, ScrollView, View } from "react-native";
import { Check } from "lucide-react-native";
import { Body, Card, Segmented, SectionHeader } from "@/components/ui";
import {
  isIOS,
  space,
  TINTS,
  useColors,
  useTheme,
  useTintRamp,
  type ThemeChoice,
  type TintName,
} from "@/theme";

const MODES: { key: ThemeChoice; label: string }[] = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];

/**
 * How the app looks: the exposure, and the one hue that is yours to pick.
 *
 * A page of its own rather than two blocks on the settings screen, because the
 * two are one decision made twice and neither is anything you set more than
 * once. Left inline they were the tallest thing above the configuration list —
 * a settled choice pushing the rows people actually navigate to off the bottom
 * of the screen.
 */
export default function SettingsAppearanceScreen() {
  const { choice, setChoice, tint, setTint } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={{ paddingVertical: space.lg, gap: space.xl }}
    >
      <View style={{ gap: space.sm }}>
        <SectionHeader>Exposure</SectionHeader>
        <View style={{ paddingHorizontal: space.lg }}>
          <Segmented
            size="large"
            options={MODES}
            value={choice}
            onChange={setChoice}
          />
        </View>
        <Body
          role="subhead"
          tone="faint"
          style={{ paddingHorizontal: space.lg, paddingTop: space.xs }}
        >
          System follows the phone&apos;s own light and dark switch.
        </Body>
      </View>

      <View style={{ gap: space.sm }}>
        <SectionHeader>Tint</SectionHeader>
        <Card style={{ marginHorizontal: space.lg }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: space.lg,
              paddingHorizontal: space.md,
            }}
          >
            {TINTS.map((entry) => (
              <TintCircle
                key={entry.key}
                name={entry.key}
                label={entry.label}
                selected={entry.key === tint}
                onPress={() => setTint(entry.key)}
              />
            ))}
          </View>
        </Card>
        <Body
          role="subhead"
          tone="faint"
          style={{ paddingHorizontal: space.lg, paddingTop: space.xs }}
        >
          Every tint carries a light and a dark value, so the exposure decides
          which one is drawn — never the choice above.
        </Body>
      </View>
    </ScrollView>
  );
}

/**
 * One hue, in the exposure that is currently on.
 *
 * Drawn from the tint's own ramp rather than from a fixed swatch, so the
 * circles restate the rule the footnote makes: flip to dark and all five
 * change with it, because a tint was never one colour.
 */
function TintCircle({
  name,
  label,
  selected,
  onPress,
}: {
  name: TintName;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const ramp = useTintRamp(name);
  const diameter = isIOS ? 44 : 48;
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <View
        // The double ring is two nested borders, not a shadow: a ring drawn in
        // `panel` between the swatch and the accent is what keeps a dark tint
        // from touching its own outline.
        style={{
          borderRadius: (diameter + 9) / 2,
          borderWidth: selected && isIOS ? 2 : 0,
          borderColor: c.accent,
          padding: selected && isIOS ? 2.5 : 0,
        }}
      >
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected }}
          style={{
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            backgroundColor: ramp.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {selected ? (
            <Check size={isIOS ? 20 : 22} color={ramp.accentInk} />
          ) : null}
        </Pressable>
      </View>
      <Body role={isIOS ? "micro" : "caption"} tone="dim" weight="400">
        {label}
      </Body>
    </View>
  );
}
