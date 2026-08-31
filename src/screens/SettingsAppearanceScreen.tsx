import { ScrollView, View } from "react-native";
import { Check } from "lucide-react-native";
import { Body, Card, Row } from "@/components/ui";
import {
  palettes,
  radii,
  space,
  SKINS,
  useColors,
  useTheme,
  type Skin,
  type ThemeChoice,
} from "@/theme";

const MODES: { key: ThemeChoice; label: string }[] = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];

/**
 * How the app looks: the exposure, and the world it is lit in.
 *
 * A page of its own rather than two blocks on the settings screen, because the
 * two are one decision made twice and neither is anything you set more than
 * once. Left inline they were the tallest thing above the configuration list —
 * a settled choice pushing the rows people actually navigate to off the bottom
 * of the screen.
 */
export default function SettingsAppearanceScreen() {
  const c = useColors();
  const { choice, setChoice, skin, setSkin, scheme } = useTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      <Section title="Exposure">
        <View style={{ flexDirection: "row", gap: space.sm }}>
          {MODES.map((mode) => {
            const on = mode.key === choice;
            return (
              <View
                key={mode.key}
                style={{
                  flex: 1,
                  borderRadius: radii.md,
                  overflow: "hidden",
                  backgroundColor: on ? c.accentQuiet : c.keycap,
                }}
              >
                <Row first onPress={() => setChoice(mode.key)}>
                  <Body
                    weight="600"
                    tone={on ? "accent" : "dim"}
                    style={{ textAlign: "center" }}
                  >
                    {mode.label}
                  </Body>
                </Row>
              </View>
            );
          })}
        </View>
        <Body tone="faint" size="sm">
          System follows the phone&apos;s own light and dark switch.
        </Body>
      </Section>

      <Section title="Skin">
        <Card>
          {SKINS.map((entry, i) => (
            <Row key={entry.key} first={i === 0} onPress={() => setSkin(entry.key)}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <Swatch skin={entry.key} scheme={scheme} />
                <View style={{ flex: 1 }}>
                  <Body weight="600">{entry.label}</Body>
                  <Body size="sm" tone="faint">
                    {entry.detail}
                  </Body>
                </View>
                {entry.key === skin ? <Check size={18} color={c.accent} /> : null}
              </View>
            </Row>
          ))}
        </Card>
        <Body tone="faint" size="sm">
          A skin changes the colours, never the layout. Every skin has both
          exposures, so choosing one never decides the other.
        </Body>
      </Section>
    </ScrollView>
  );
}

/**
 * What a skin looks like, in three chips: its ground, its raised surface and
 * its accent — read from the palette itself, in whichever exposure is on.
 *
 * A name cannot say this. "Signal" means nothing until you have seen the lime,
 * and a picker for a purely visual choice that shows none of it is a picker
 * you have to guess at.
 */
function Swatch({ skin, scheme }: { skin: Skin; scheme: "light" | "dark" }) {
  const p = palettes[skin][scheme];
  return (
    <View
      style={{
        flexDirection: "row",
        borderRadius: radii.sm,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: p.edge,
      }}
    >
      {[p.chassis, p.panelRaised, p.accent].map((fill, i) => (
        <View key={i} style={{ width: 12, height: 24, backgroundColor: fill }} />
      ))}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Body tone="faint" size="xs" weight="700" style={{ letterSpacing: 0.8 }}>
        {title.toUpperCase()}
      </Body>
      {children}
    </View>
  );
}
