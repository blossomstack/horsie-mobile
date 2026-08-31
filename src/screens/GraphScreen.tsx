import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, CornerDownRight, RotateCcw } from "lucide-react-native";
import { api } from "@/api/client";
import { Body, Card, Empty, Loading, Mono, Pill, ReadError } from "@/components/ui";
import { isLive, kindLabel, layoutAgentTree, type PlacedAgent } from "@/core/agentTree";
import { layoutGraph } from "@/core/graphLayout";
import { useSession } from "@/hooks/useSessions";
import { useConnection } from "@/state/connection";
import { radii, space, useColors } from "@/theme";

import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";
import type { WorkflowRunGraph } from "@/api/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** How far one level of nesting moves a row. Small on purpose: a deep tree at a
 * generous indent runs out of screen before it runs out of depth. */
const INDENT = 14;

type Picture = "tree" | "run";

/**
 * What a session hosts.
 *
 * Two pictures, because a session has two structures and they answer different
 * questions. The **tree** is everything the session hosts — its agents, the
 * sessions branched off it, and any run it started — by lineage. The **run** is
 * one workflow's step graph.
 *
 * Both are drawn as lists, not as a drawn graph. A phone is about 380 points
 * wide: three ranks of a readable node box is all that fits, so the drawn
 * version spent its whole area on two axes of white space and put everything
 * worth reading behind a pan. A list gives every row the full width, scrolls
 * the way every other screen here scrolls, and loses only the picture of the
 * edges — which for a tree is exactly what an indent already says.
 *
 * The run graph is a DAG with loops, and an indent cannot say that. It is
 * ordered by rank instead — how many steps from the start — with each row
 * naming what it leads to, and a loop marked as one.
 */
export default function GraphScreen() {
  const navigation = useNavigation<Nav>();
  const { id } = useRoute<RouteProp<RootStackParamList, "Graph">>().params;
  const { project } = useConnection();
  const [view, setView] = useState<Picture>("tree");
  const [collapsed, setCollapsed] = useState<string[]>([]);

  const session = useSession(id);

  const run = useQuery({
    queryKey: ["workflow-run", project, id],
    queryFn: () => api.sessions.workflowRun(id),
    enabled: project !== null,
    // A session that is not a run answers 404, which is an answer, not a
    // failure to retry.
    retry: false,
  });

  const detail = session.data?.session;

  const tree = useMemo(
    () =>
      detail
        ? layoutAgentTree(detail.agents, detail.subSessions, collapsed, detail.name)
        : null,
    [detail, collapsed],
  );

  useEffect(() => {
    navigation.setOptions({ title: detail?.name ?? "Graph" });
  }, [navigation, detail]);

  if (session.isLoading) return <Loading />;
  if (session.isError) {
    return <ReadError error={session.error} onRetry={() => void session.refetch()} />;
  }
  if (!tree) return <Loading />;

  const toggle = (nodeId: string) =>
    setCollapsed((prev) =>
      prev.includes(nodeId) ? prev.filter((x) => x !== nodeId) : [...prev, nodeId],
    );

  return (
    <View style={{ flex: 1 }}>
      {run.data ? (
        <View style={{ flexDirection: "row", gap: space.sm, padding: space.lg }}>
          <Toggle label="Tree" on={view === "tree"} onPress={() => setView("tree")} />
          <Toggle label="Run" on={view === "run"} onPress={() => setView("run")} />
        </View>
      ) : null}

      {view === "run" && run.data ? (
        <RunList graph={run.data} />
      ) : tree.nodes.length === 0 ? (
        <Empty
          title="Nothing hosted yet"
          detail="This session has no subagents, sub sessions or runs — its transcript is the whole of it."
        />
      ) : (
        <FlatList
          contentContainerStyle={{ padding: space.lg, paddingTop: run.data ? 0 : space.lg }}
          data={tree.nodes}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <AgentOutlineRow
              node={item}
              sessionId={id}
              onToggle={() => toggle(item.id)}
            />
          )}
          ListFooterComponent={
            tree.hidden > 0 ? (
              <Body tone="faint" size="xs" style={{ marginTop: space.md }}>
                {tree.hidden} hidden by a fold
              </Body>
            ) : null
          }
        />
      )}
    </View>
  );
}

function Toggle({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{
        backgroundColor: on ? c.accentQuiet : c.keycap,
        borderRadius: radii.sm,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
      }}
    >
      <Body size="sm" weight="600" tone={on ? "accent" : "dim"}>
        {label}
      </Body>
    </Pressable>
  );
}

/**
 * One member of the tree, at its depth.
 *
 * Two controls, deliberately not one: the chevron folds, and the rest of the
 * row opens. The drawn version had a single tap that folded whenever a node had
 * children, which meant the one node worth opening — an agent that delegated —
 * was the one node that could not be.
 */
function AgentOutlineRow({
  node,
  sessionId,
  onToggle,
}: {
  node: PlacedAgent;
  sessionId: string;
  onToggle: () => void;
}) {
  const c = useColors();
  const navigation = useNavigation<Nav>();
  const live = isLive(node.status);
  const failed = node.status === "failed";

  // A sub session is opened, not inspected — it is another session, talked to
  // rather than delegated to. A run node has no transcript to open at all.
  const opens =
    node.kind === "sub_session" || node.kind === "subagent" || node.kind === "main";
  const open = () => {
    if (!opens) return;
    navigation.navigate("Session", {
      id: sessionId,
      // The main agent is the session; anything else is addressed by id.
      agent: node.kind === "main" ? undefined : node.id,
    });
  };

  return (
    <View style={{ flexDirection: "row", marginLeft: node.depth * INDENT }}>
      {node.depth > 0 ? (
        <CornerDownRight
          size={13}
          color={c.legendFaint}
          style={{ marginTop: space.md, marginRight: space.xs }}
        />
      ) : null}

      <Card style={{ flex: 1, marginTop: space.sm }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: space.sm,
          }}
        >
          {node.children > 0 ? (
            <Pressable
              onPress={onToggle}
              accessibilityRole="button"
              accessibilityLabel={node.collapsed ? "Expand" : "Collapse"}
              accessibilityState={{ expanded: !node.collapsed }}
              // Padded rather than sized: a 13-point chevron is not a target.
              hitSlop={space.sm}
              style={{ padding: space.sm }}
            >
              {node.collapsed ? (
                <ChevronRight size={16} color={c.legendDim} />
              ) : (
                <ChevronDown size={16} color={c.legendDim} />
              )}
            </Pressable>
          ) : (
            <View style={{ width: 16 + space.sm * 2 }} />
          )}

          <Pressable
            onPress={open}
            disabled={!opens}
            accessibilityRole={opens ? "button" : undefined}
            style={{ flex: 1, paddingVertical: space.md, gap: 2 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <View
                // The status, as a dot. A pill on every row would be the widest
                // thing in the list and would say the same word twelve times.
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: failed ? c.red : live ? c.live : c.legendFaint,
                }}
              />
              <Body weight="600" numberOfLines={1} style={{ flex: 1 }}>
                {node.label}
              </Body>
              {node.collapsed ? <Pill label={`+${node.descendants}`} /> : null}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <Body size="xs" tone="faint">
                {kindLabel(node.kind)}
              </Body>
              <Mono size="xs" numberOfLines={1}>
                {node.detail}
              </Mono>
            </View>
          </Pressable>
        </View>
      </Card>
    </View>
  );
}

/**
 * A run's steps, in the order the run reaches them.
 *
 * Ranked, not nested: a step two branches can reach has no one parent to hang
 * off, so an indent would have to pick one and lie. Each row says where it goes
 * instead, which is the same information the arrows carried.
 */
function RunList({ graph }: { graph: WorkflowRunGraph }) {
  const c = useColors();
  const layout = useMemo(
    () => layoutGraph(graph.nodes, graph.edges, graph.start),
    [graph],
  );

  const steps = useMemo(
    () =>
      [...layout.nodes]
        .sort((a, b) => a.rank - b.rank || a.order - b.order)
        .map((placed) => ({
          placed,
          runs: graph.nodes.find((n) => n.step === placed.step)?.runs ?? [],
          out: layout.edges.filter((e) => e.from === placed.step),
        })),
    [layout, graph.nodes],
  );

  return (
    <FlatList
      contentContainerStyle={{ padding: space.lg, paddingTop: 0 }}
      data={steps}
      keyExtractor={(s) => s.placed.step}
      renderItem={({ item, index }) => (
        <Card style={{ marginTop: index === 0 ? 0 : space.sm, padding: space.md, gap: space.xs }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Body weight="600" numberOfLines={1} style={{ flex: 1 }}>
              {item.placed.step}
            </Body>
            {item.placed.step === graph.start ? <Pill label="Start" /> : null}
            {/* An unreachable step is kept and marked rather than dropped: it is
                usually a mistake the author wants to see. */}
            {!item.placed.reachable ? <Pill label="Unreachable" tone="danger" /> : null}
          </View>

          <Mono size="xs">
            {item.runs.length === 0
              ? "not run"
              : `${item.runs.length} run${item.runs.length === 1 ? "" : "s"} · ${describe(item.runs)}`}
          </Mono>

          {item.out.length > 0 ? (
            <View style={{ gap: 2 }}>
              {item.out.map((e) => (
                <View
                  key={`${e.from}->${e.to}`}
                  style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}
                >
                  {e.back ? <RotateCcw size={11} color={c.legendFaint} /> : null}
                  <Body size="xs" tone="faint" numberOfLines={1} style={{ flex: 1 }}>
                    {e.back ? "loops back to " : "→ "}
                    {e.to}
                    {conditionOf(graph, e.from, e.to)}
                  </Body>
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      )}
    />
  );
}

/** What became of the executions that landed on one step: the newest one's
 * outcome, which is the one the run is on. */
function describe(runs: WorkflowRunGraph["nodes"][number]["runs"]): string {
  return runs[runs.length - 1]?.status.type.toLowerCase() ?? "not run";
}

/** The filter an edge is taken for, when it has one. Read off the wire rather
 * than the layout: the layout only knows shape, and a catch-all and a filtered
 * edge look identical to it. */
function conditionOf(graph: WorkflowRunGraph, from: string, to: string): string {
  const edge = graph.edges.find((e) => e.from === from && e.to === to);
  return edge?.condition ? ` · ${edge.condition}` : "";
}
