import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Bot, CalendarClock, ChevronRight, Server, Workflow } from "lucide-react-native";
import Animated from "react-native-reanimated";
import { Body, Card, Row } from "@/components/ui";
import { useAgents, useEnvironments, useRoutines, useWorkflows } from "@/hooks/useLibrary";
import { isIOS, radii, space, useColors } from "@/theme";
import { useScreenScroll } from "@/navigation/scroll";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * What the deployment is configured to do.
 *
 * Read-only throughout: this app shows a setup, the web UI changes one. No
 * screen below here has an edit affordance, so there is nothing to explain
 * away when a tap does nothing.
 */
export default function LibraryScreen() {
  const navigation = useNavigation<Nav>();
  const c = useColors();
  const scroll = useScreenScroll();

  const agents = useAgents();
  const environments = useEnvironments();
  const workflows = useWorkflows();
  const routines = useRoutines();

  const entries = [
    { route: "Agents" as const, label: "Agents", icon: Bot, count: agents.data?.length },
    {
      route: "Environments" as const,
      label: "Environments",
      icon: Server,
      count: environments.data?.length,
    },
    {
      route: "Workflows" as const,
      label: "Workflows",
      icon: Workflow,
      count: workflows.data?.length,
    },
    {
      route: "Routines" as const,
      label: "Routines",
      icon: CalendarClock,
      count: routines.data?.length,
    },
  ] as const;

  // Where the label starts, so the separators start there too: the tile plus
  // the gap, which is 57 on iOS and 72 on Android.
  const rowInset = isIOS ? 57 : 72;

  return (
    <Animated.ScrollView
      {...scroll}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: space.lg }}
    >
      <Card>
        {entries.map((entry, i) => (
          <Row
            key={entry.route}
            first={i === 0}
            inset={rowInset}
            onPress={() => navigation.push(entry.route)}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: space.md }}
            >
              <Tile>
                <entry.icon size={isIOS ? 17 : 22} color={c.accent} />
              </Tile>
              <Body role="body" style={{ flex: 1 }}>
                {entry.label}
              </Body>
              {entry.count !== undefined ? (
                <Body role={isIOS ? "body" : "subhead"} tone="dim">
                  {entry.count}
                </Body>
              ) : null}
              <ChevronRight size={isIOS ? 14 : 18} color={c.legendFaint} />
            </View>
          </Row>
        ))}
      </Card>
      <Body role="subhead" tone="faint" style={{ marginTop: space.md }}>
        Everything here is read-only. Use the web UI to change it.
      </Body>
    </Animated.ScrollView>
  );
}

/** The tinted holder a row's glyph sits in: a rounded square on iOS, a circle
 * on Android. Four identical grey glyphs in a column read as one thing; four
 * tinted tiles read as four places to go. */
function Tile({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const box = isIOS ? 29 : 40;
  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: isIOS ? radii.chip : box / 2,
        backgroundColor: c.accentQuiet,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </View>
  );
}
