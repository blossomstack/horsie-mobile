import { useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, CornerDownRight, RotateCcw } from "lucide-react-native";
import { api } from "@/api/client";
import { Body, Card, Empty, Loading, Mono, Pill, ReadError } from "@/components/ui";
import {
  isLive,
  kindLabel,
  layoutAgentTree,
  opensTranscript,
  type PlacedAgent,
} from "@/core/agentTree";
import { layoutGraph } from "@/core/graphLayout";
import { useSession } from "@/hooks/useSessions";
import { useConnection } from "@/state/connection";
import { radii, space, useColors } from "@/theme";

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
 * A component rather than a screen, because it is both: the `Graph` route is a
 * thin wrapper around it, and a workflow run's session page *is* it — a run has
 * no transcript of its own, so there is nothing else for that page to be.
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
export function SessionGraph({ id }: { id: string }) {
  const { project } = useConnection();
  const [view, setView] = useState<Picture | null>(null);
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
  const isRun = detail?.workflow !== undefined;

  // A run opens on its own graph, everything else on its lineage. The
  // definition's graph is the better default for a run because it holds the
  // steps the run has *not* reached yet — the tree can only draw what has
  // already happened, which on a run in flight is the half you know.
  const picture: Picture = view ?? (isRun ? "run" : "tree");

  const tree = useMemo(
    () =>
      detail
        ? layoutAgentTree(detail.agents, detail.subSessions, collapsed, detail.name)
        : null,
    [detail, collapsed],
  );

  if (session.isLoading) return <Loading />;
  if (session.isError) {
    return <ReadError error={session.error} onRetry={() => void session.refetch()} />;
  }
  if (!tree) return <Loading />;
  // A run's own graph is a second request. Waiting for it beats drawing the
  // lineage for a moment and then replacing it — the toggle bar appears with
  // it, so the swap moves everything down a row as well.
  if (isRun && run.isLoading) return <Loading />;

  const toggle = (nodeId: string) =>
    setCollapsed((prev) =>
      prev.includes(nodeId) ? prev.filter((x) => x !== nodeId) : [...prev, nodeId],
    );

  return (
    <View style={{ flex: 1 }}>
      {run.data ? (
        <View style={{ flexDirection: "row", gap: space.sm, padding: space.lg }}>
          <Toggle label="Run" on={picture === "run"} onPress={() => setView("run")} />
          <Toggle label="Tree" on={picture === "tree"} onPress={() => setView("tree")} />
        </View>
      ) : null}

      {picture === "run" && run.data ? (
        <RunList graph={run.data} sessionId={id} />
      ) : tree.nodes.length === 0 ? (
        <Empty
          title={isRun ? "No step has started" : "Nothing hosted yet"}
          detail={
            isRun
              ? "This run has not reached its first step yet."
              : "This session has no subagents, sub sessions or runs — its transcript is the whole of it."
          }
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
        borderRadius: radii.pill,
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

  // A step was missing from this list, which is why a workflow run — whose
  // every row is a step — was a picture nothing at all could be opened from.
  const opens = opensTranscript(node.kind);
  const open = () => {
    if (!opens) return;
    // Pushed, not navigated: `navigate` finds the session already below this
    // picture in the stack and pops back to it, so opening a node destroyed the
    // picture you opened it from and back went to the session list.
    navigation.push("Session", {
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
function RunList({ graph, sessionId }: { graph: WorkflowRunGraph; sessionId: string }) {
  const c = useColors();
  const navigation = useNavigation<Nav>();
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

          {/* One line per execution, and each one opens: an execution *is* an
              agent, and its transcript is the only place the work it did is
              written down. A step visited twice has two of them, so a single
              folded "2 runs" line could not have linked to either. */}
          {item.runs.length === 0 ? (
            <Mono size="xs">not run</Mono>
          ) : (
            item.runs.map((exec) => (
              <Pressable
                key={exec.index}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.placed.step}, attempt ${exec.attempt}`}
                onPress={() =>
                  navigation.push("Session", { id: sessionId, agent: exec.agentId })
                }
                // A keycap, because it is a control. Left as bare text it read
                // as the status line it replaced, and nothing about a run's
                // page said its transcripts were behind it.
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.xs,
                  backgroundColor: c.keycap,
                  borderRadius: radii.pill,
                  paddingHorizontal: space.sm,
                  paddingVertical: space.xs,
                }}
              >
                <Mono size="xs">
                  {`attempt ${exec.attempt} · ${exec.status.type.toLowerCase()}`}
                </Mono>
                <ChevronRight size={13} color={c.legendDim} />
              </Pressable>
            ))
          )}

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

/** The filter an edge is taken for, when it has one. Read off the wire rather
 * than the layout: the layout only knows shape, and a catch-all and a filtered
 * edge look identical to it. */
function conditionOf(graph: WorkflowRunGraph, from: string, to: string): string {
  const edge = graph.edges.find((e) => e.from === from && e.to === to);
  return edge?.condition ? ` · ${edge.condition}` : "";
}
