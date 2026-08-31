import { Alert, View } from "react-native";
import Animated from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import {
  Brain,
  ChevronRight,
  Cpu,
  FolderTree,
  LogOut,
  Package,
  Palette,
  Plug,
  Server,
  Sparkles,
} from "lucide-react-native";
import { Body, Card, Mono, Row, SectionHeader } from "@/components/ui";
import { useConnection } from "@/state/connection";
import {
  CHOICE_LABEL,
  isIOS,
  space,
  TINT_LABEL,
  useColors,
  useTheme,
} from "@/theme";
import { useScreenScroll } from "@/navigation/scroll";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const c = useColors();
  const { choice, tint } = useTheme();
  const { server, project, signOut } = useConnection();
  const scroll = useScreenScroll();

  const readOnly = [
    { route: "SettingsProjects" as const, label: "Projects", icon: FolderTree },
    { route: "SettingsModels" as const, label: "Models", icon: Sparkles },
    { route: "SettingsRuntimes" as const, label: "Runtimes", icon: Cpu },
    { route: "SettingsSkills" as const, label: "Skills", icon: Package },
    { route: "SettingsMemory" as const, label: "Memory", icon: Brain },
    { route: "SettingsMcp" as const, label: "MCP servers", icon: Plug },
  ] as const;

  return (
    <Animated.ScrollView
      {...scroll}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingVertical: space.lg, gap: space.xl }}
    >
      <Section title="Connected to">
        <Card>
          <Row first>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Server size={18} color={c.legendDim} />
              <View style={{ flex: 1 }}>
                <Body role="headline">
                  {server?.label ?? "Not connected"}
                </Body>
                {server ? <Mono size="xs">{server.baseUrl}</Mono> : null}
              </View>
            </View>
          </Row>
          <Row onPress={() => navigation.navigate("Projects")}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <FolderTree size={18} color={c.legendDim} />
              <Body role="body" style={{ flex: 1 }}>
                Project
              </Body>
              <Body role="body" tone="dim">
                {project ?? "none"}
              </Body>
              <ChevronRight size={isIOS ? 14 : 18} color={c.legendFaint} />
            </View>
          </Row>
        </Card>
      </Section>

      {/* Separate from Configuration below, which is the server's and read
          only. This is the one thing on this screen the phone itself owns. */}
      <Section title="This device">
        <Card>
          <Row first onPress={() => navigation.push("SettingsAppearance")}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <Palette size={18} color={c.legendDim} />
              <Body role="body" style={{ flex: 1 }}>
                Appearance
              </Body>
              <Body role="body" tone="dim">
                {`${CHOICE_LABEL[choice]} · ${TINT_LABEL[tint]}`}
              </Body>
              <ChevronRight size={isIOS ? 14 : 18} color={c.legendFaint} />
            </View>
          </Row>
        </Card>
      </Section>

      <Section title="Configuration">
        <Card>
          {readOnly.map((entry, i) => (
            <Row key={entry.route} first={i === 0} onPress={() => navigation.push(entry.route)}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <entry.icon size={18} color={c.legendDim} />
                <Body role="body" style={{ flex: 1 }}>
                  {entry.label}
                </Body>
                <ChevronRight size={isIOS ? 14 : 18} color={c.legendFaint} />
              </View>
            </Row>
          ))}
        </Card>
        <Body role="subhead" tone="faint">
          Read-only. There is no account or admin surface here by design.
        </Body>
      </Section>

      {/* Its own card, outside every section: the only red on the screen, and
          the only row here that ends something rather than opening it. */}
      <Card style={{ marginHorizontal: space.lg }}>
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
                    void signOut();
                  },
                },
              ],
            )
          }
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <LogOut size={18} color={c.redInk} />
            <Body role="headline" tone="danger">
              Sign out
            </Body>
          </View>
        </Row>
      </Card>
    </Animated.ScrollView>
  );
}

/** A titled group of rows, inset from the screen edge on both platforms. */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: space.sm }}>
      <SectionHeader>{title}</SectionHeader>
      <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
        {children}
      </View>
    </View>
  );
}
