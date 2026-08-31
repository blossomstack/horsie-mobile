import { Alert, ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Brain,
  ChevronRight,
  Cpu,
  FolderTree,
  LogOut,
  Package,
  Plug,
  Server,
  Sparkles,
} from "lucide-react-native";
import { Body, Card, Mono, Row } from "@/components/ui";
import { useConnection } from "@/state/connection";
import { radii, space, useColors, useTheme, type ThemeChoice } from "@/theme";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CHOICES: { key: ThemeChoice; label: string }[] = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const c = useColors();
  const { choice, setChoice } = useTheme();
  const { server, project, signOut } = useConnection();

  const readOnly = [
    { route: "SettingsProjects" as const, label: "Projects", icon: FolderTree },
    { route: "SettingsModels" as const, label: "Models", icon: Sparkles },
    { route: "SettingsRuntimes" as const, label: "Runtimes", icon: Cpu },
    { route: "SettingsSkills" as const, label: "Skills", icon: Package },
    { route: "SettingsMemory" as const, label: "Memory", icon: Brain },
    { route: "SettingsMcp" as const, label: "MCP servers", icon: Plug },
  ] as const;

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      <Section title="Connected to">
        <Card>
          <Row first>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Server size={18} color={c.legendDim} />
              <View style={{ flex: 1 }}>
                <Body weight="600">{server?.label ?? "Not connected"}</Body>
                {server ? <Mono size="xs">{server.baseUrl}</Mono> : null}
              </View>
            </View>
          </Row>
          <Row onPress={() => navigation.navigate("Projects")}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <FolderTree size={18} color={c.legendDim} />
              <Body style={{ flex: 1 }}>Project</Body>
              <Body tone="dim">{project ?? "none"}</Body>
              <ChevronRight size={18} color={c.legendFaint} />
            </View>
          </Row>
        </Card>
      </Section>

      <Section title="Appearance">
        <View style={{ flexDirection: "row", gap: space.sm }}>
          {CHOICES.map((t) => {
            const on = t.key === choice;
            return (
              <View
                key={t.key}
                style={{
                  flex: 1,
                  borderRadius: radii.md,
                  overflow: "hidden",
                  backgroundColor: on ? c.accentQuiet : c.keycap,
                }}
              >
                <Row first onPress={() => setChoice(t.key)}>
                  <Body
                    weight="600"
                    tone={on ? "accent" : "dim"}
                    style={{ textAlign: "center" }}
                  >
                    {t.label}
                  </Body>
                </Row>
              </View>
            );
          })}
        </View>
      </Section>

      <Section title="Configuration">
        <Card>
          {readOnly.map((entry, i) => (
            <Row key={entry.route} first={i === 0} onPress={() => navigation.push(entry.route)}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <entry.icon size={18} color={c.legendDim} />
                <Body style={{ flex: 1 }}>{entry.label}</Body>
                <ChevronRight size={18} color={c.legendFaint} />
              </View>
            </Row>
          ))}
        </Card>
        <Body tone="faint" size="sm">
          Read-only. There is no account or admin surface here by design.
        </Body>
      </Section>

      <Card>
        <Row
          first
          onPress={() =>
            Alert.alert(
              "Sign out?",
              `This forgets the credentials for ${server?.label ?? "this server"}. You will approve a new code next time.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Sign out",
                  style: "destructive",
                  onPress: () => {
                    void signOut().then(() => navigation.navigate("Connect"));
                  },
                },
              ],
            )
          }
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <LogOut size={18} color={c.redInk} />
            <Body tone="danger" weight="600">
              Sign out
            </Body>
          </View>
        </Row>
      </Card>
    </ScrollView>
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
