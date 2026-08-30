import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Body, Empty, Loading, Mono, Pill, ReadError } from "@/components/ui";
import { isLive, kindLabel, layoutAgentTree, type PlacedAgent } from "@/core/agentTree";
import { layoutGraph } from "@/core/graphLayout";
import { useSession } from "@/hooks/useSessions";
import { useConnection } from "@/state/connection";
import { radii, space, useColors } from "@/theme";

const NODE_W = 150;
const NODE_H = 58;
const LANE = NODE_H + 22;
const RANK = NODE_W + 46;

type Picture = "tree" | "run";

/**
 * What a session hosts, drawn.
 *
 * Two pictures, because a session has two structures and they answer different
 * questions. The **tree** is everything the session hosts — its agents, the
 * sessions branched off it, and any run it started — laid out by lineage. The
 * **run** is one workflow's step graph, which is a DAG with loops and cannot
 * be drawn as a tree at all.
 *
 * Both layouts are `@/core`, carried from the web client unchanged; only the
 * drawing differs. Ranks run left to right and lanes down the screen, so a
 * deep tree scrolls sideways rather than squeezing.
 */
export default function TreeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { project } = useConnection();
  const c = useColors();
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

  if (session.isLoading) return <Loading />;
  if (session.isError) {
    return <ReadError error={session.error} onRetry={() => void session.refetch()} />;
  }
  if (!tree) return <Loading />;

  const hasRun = run.data !== undefined;

  return (
    <>
      <Stack.Screen options={{ title: detail?.name ?? "Graph" }} />
      <View style={{ flex: 1 }}>
        {hasRun ? (
          <View style={{ flexDirection: "row", gap: space.sm, padding: space.lg }}>
            <Toggle label="Tree" on={view === "tree"} onPress={() => setView("tree")} />
            <Toggle label="Run" on={view === "run"} onPress={() => setView("run")} />
          </View>
        ) : null}

        {view === "run" && run.data ? (
          <RunGraph graph={run.data} />
        ) : tree.nodes.length === 0 ? (
          <Empty
            title="Nothing hosted yet"
            detail="This session has no subagents, sub sessions or runs — its transcript is the whole of it."
          />
        ) : (
          <ScrollView horizontal contentContainerStyle={{ padding: space.lg }}>
            <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
              <View
                style={{
                  width: tree.depth * RANK,
                  height: tree.rows * LANE + NODE_H,
                }}
              >
                <Svg
                  width={tree.depth * RANK}
                  height={tree.rows * LANE + NODE_H}
                  style={{ position: "absolute" }}
                >
                  {tree.edges.map((e) => {
                    const from = tree.nodes.find((n) => n.id === e.from);
                    const to = tree.nodes.find((n) => n.id === e.to);
                    if (!from || !to) return null;
                    const x1 = from.depth * RANK + NODE_W;
                    const y1 = from.lane * LANE + NODE_H / 2;
                    const x2 = to.depth * RANK;
                    const y2 = to.lane * LANE + NODE_H / 2;
                    const mid = (x1 + x2) / 2;
                    return (
                      <Path
                        key={`${e.from}->${e.to}`}
                        d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`}
                        stroke={c.rule}
                        strokeWidth={1.5}
                        fill="none"
                      />
                    );
                  })}
                </Svg>

                {tree.nodes.map((n) => (
                  <AgentNode
                    key={n.id}
                    node={n}
                    sessionId={id}
                    onToggle={() =>
                      setCollapsed((prev) =>
                        prev.includes(n.id)
                          ? prev.filter((x) => x !== n.id)
                          : [...prev, n.id],
                      )
                    }
                  />
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        )}

        {tree.hidden > 0 && view === "tree" ? (
          <View style={{ padding: space.md, borderTopWidth: 1, borderTopColor: c.edge }}>
            <Body tone="faint" size="xs">
              {tree.hidden} hidden by a fold
            </Body>
          </View>
        ) : null}
      </View>
    </>
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

function AgentNode({
  node,
  sessionId,
  onToggle,
}: {
  node: PlacedAgent;
  sessionId: string;
  onToggle: () => void;
}) {
  const c = useColors();
  const router = useRouter();
  const live = isLive(node.status);
  const failed = node.status === "failed";

  // A sub session is opened, not inspected — it is another session, talked to
  // rather than delegated to. A run node has no transcript to open at all.
  const opens = node.kind === "sub_session" || node.kind === "subagent" || node.kind === "main";

  return (
    <Pressable
      onPress={() => {
        if (node.children > 0) return onToggle();
        if (!opens) return;
        router.push(
          node.kind === "main"
            ? `/session/${sessionId}`
            : `/session/${sessionId}?agent=${node.id}`,
        );
      }}
      onLongPress={node.children > 0 ? undefined : onToggle}
      style={{
        position: "absolute",
        left: node.depth * RANK,
        top: node.lane * LANE,
        width: NODE_W,
        height: NODE_H,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: failed ? c.red : live ? c.live : c.edge,
        backgroundColor: c.panel,
        paddingHorizontal: space.sm,
        justifyContent: "center",
        gap: 2,
      }}
    >
      <Body size="sm" weight="600" numberOfLines={1}>
        {node.label}
      </Body>
      <Mono size="xs" numberOfLines={1}>
        {node.detail}
      </Mono>
      <View style={{ flexDirection: "row", gap: space.xs, alignItems: "center" }}>
        <Body size="xs" tone="faint">
          {kindLabel(node.kind)}
        </Body>
        {node.collapsed ? <Pill label={`+${node.descendants}`} /> : null}
      </View>
    </Pressable>
  );
}

function RunGraph({
  graph,
}: {
  graph: NonNullable<ReturnType<typeof api.sessions.workflowRun> extends Promise<infer T> ? T : never>;
}) {
  const c = useColors();
  const layout = useMemo(
    () => layoutGraph(graph.nodes, graph.edges, graph.start),
    [graph],
  );

  const width = layout.breadth * (NODE_W + 28);
  const height = layout.depth * (NODE_H + 40);
  const byName = new Map(layout.nodes.map((n) => [n.step, n]));
  const at = (order: number, rank: number) => ({
    x: order * (NODE_W + 28),
    y: rank * (NODE_H + 40),
  });

  return (
    <ScrollView horizontal contentContainerStyle={{ padding: space.lg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
        <View style={{ width, height: height + NODE_H }}>
          <Svg width={width} height={height + NODE_H} style={{ position: "absolute" }}>
            {layout.edges.map((e, i) => {
              const from = byName.get(e.from);
              const to = byName.get(e.to);
              if (!from || !to) return null;
              const a = at(from.order, from.rank);
              const b = at(to.order, to.rank);
              const x1 = a.x + NODE_W / 2;
              const y1 = a.y + NODE_H;
              const x2 = b.x + NODE_W / 2;
              const y2 = b.y;
              // A back-edge bows out to the side, so a loop reads as a return
              // rather than as forward progress.
              const d = e.back
                ? `M${x1},${y1} C${x1 + NODE_W},${y1 + 40} ${x2 + NODE_W},${y2 - 40} ${x2},${y2}`
                : `M${x1},${y1} C${x1},${y1 + 20} ${x2},${y2 - 20} ${x2},${y2}`;
              return (
                <Path
                  key={`${e.from}->${e.to}-${i}`}
                  d={d}
                  stroke={e.back ? c.legendFaint : c.ruleStrong}
                  strokeWidth={1.5}
                  strokeDasharray={e.back ? "4 3" : undefined}
                  fill="none"
                />
              );
            })}
          </Svg>

          {layout.nodes.map((n) => {
            const p = at(n.order, n.rank);
            const runs = graph.nodes.find((x) => x.step === n.step)?.runs.length ?? 0;
            return (
              <View
                key={n.step}
                style={{
                  position: "absolute",
                  left: p.x,
                  top: p.y,
                  width: NODE_W,
                  height: NODE_H,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  // An unreachable step is kept and marked rather than dropped:
                  // it is usually a mistake the author wants to see.
                  borderColor: n.reachable ? c.edge : c.redQuiet,
                  backgroundColor: c.panel,
                  paddingHorizontal: space.sm,
                  justifyContent: "center",
                }}
              >
                <Body size="sm" weight="600" numberOfLines={1}>
                  {n.step}
                </Body>
                <Mono size="xs">
                  {runs === 0 ? "not run" : `${runs} run${runs === 1 ? "" : "s"}`}
                </Mono>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ScrollView>
  );
}
