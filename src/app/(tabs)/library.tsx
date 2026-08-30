import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Bot, CalendarClock, ChevronRight, Server, Workflow } from "lucide-react-native";
import { Body, Card, Row } from "@/components/ui";
import { useAgents, useEnvironments, useRoutines, useWorkflows } from "@/hooks/useLibrary";
import { space, useColors } from "@/theme";

/**
 * What the deployment is configured to do.
 *
 * Read-only throughout: this app shows a setup, the web UI changes one. No
 * screen below here has an edit affordance, so there is nothing to explain
 * away when a tap does nothing.
 */
export default function LibraryScreen() {
  const router = useRouter();
  const c = useColors();

  const agents = useAgents();
  const environments = useEnvironments();
  const workflows = useWorkflows();
  const routines = useRoutines();

  const entries = [
    { href: "/library/agents", label: "Agents", icon: Bot, count: agents.data?.length },
    {
      href: "/library/environments",
      label: "Environments",
      icon: Server,
      count: environments.data?.length,
    },
    {
      href: "/library/workflows",
      label: "Workflows",
      icon: Workflow,
      count: workflows.data?.length,
    },
    {
      href: "/library/routines",
      label: "Routines",
      icon: CalendarClock,
      count: routines.data?.length,
    },
  ] as const;

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg }}>
      <Card>
        {entries.map((entry, i) => (
          <Row key={entry.href} first={i === 0} onPress={() => router.push(entry.href)}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: space.md }}
            >
              <entry.icon size={18} color={c.legendDim} />
              <Body style={{ flex: 1 }}>{entry.label}</Body>
              {entry.count !== undefined ? (
                <Body tone="faint">{entry.count}</Body>
              ) : null}
              <ChevronRight size={18} color={c.legendFaint} />
            </View>
          </Row>
        ))}
      </Card>
      <Body tone="faint" size="sm" style={{ marginTop: space.md }}>
        Everything here is read-only. Use the web UI to change it.
      </Body>
    </ScrollView>
  );
}
