import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Body, Card, Empty, Loading, Mono, Pill, ReadError } from "@/components/ui";
import { layoutGraph, type PlacedNode } from "@/core/graphLayout";
import { useConnection } from "@/state/connection";
import { radii, space, useColors } from "@/theme";

const NODE_W = 150;
const NODE_H = 56;
const GAP_X = 28;
const GAP_Y = 40;

/**
 * The run graph behind a session that is a workflow run.
 *
 * Layout is `@/core/graphLayout`, carried over from the web client unchanged —
 * it is a pure function over names and edges, so only the drawing differs.
 * A phone is narrow, so ranks run down the screen and the breadth runs across,
 * which is the opposite of the web's orientation and the only change here.
 */
export default function GraphScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { project } = useConnection();
  const c = useColors();

  const query = useQuery({
    queryKey: ["workflow-run", project, id],
    queryFn: () => api.sessions.workflowRun(id),
    enabled: project !== null,
  });

  const layout = useMemo(() => {
    if (!query.data) return null;
    return layoutGraph(query.data.nodes, query.data.edges, query.data.start);
  }, [query.data]);

  if (query.isLoading) return <Loading />;
  if (query.isError) {
    return (
      <>
        <Stack.Screen options={{ title: "Graph" }} />
        <Empty
          title="Not a workflow run"
          detail="Only a session started by a workflow has a graph. This one has an agent tree instead — it is drawn in the transcript."
        />
      </>
    );
  }
  if (!layout || !query.data) return <Loading />;

  const position = (n: PlacedNode) => ({
    x: n.order * (NODE_W + GAP_X),
    y: n.rank * (NODE_H + GAP_Y),
  });

  const width = layout.breadth * (NODE_W + GAP_X);
  const height = layout.depth * (NODE_H + GAP_Y);
  const byName = new Map(layout.nodes.map((n) => [n.step, n]));

  return (
    <>
      <Stack.Screen options={{ title: query.data.workflow }} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
        <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
          <Pill label={`${layout.depth} rank${layout.depth === 1 ? "" : "s"}`} />
          <Pill label={`${query.data.inputTokens + query.data.outputTokens} tokens`} />
          {query.data.error ? <Pill label="Failed" tone="danger" /> : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={{ width, height, minWidth: "100%" }}>
            <Svg
              width={width}
              height={height}
              style={{ position: "absolute", top: 0, left: 0 }}
            >
              {layout.edges.map((e, i) => {
                const from = byName.get(e.from);
                const to = byName.get(e.to);
                if (!from || !to) return null;
                const a = position(from);
                const b = position(to);
                const x1 = a.x + NODE_W / 2;
                const y1 = a.y + NODE_H;
                const x2 = b.x + NODE_W / 2;
                const y2 = b.y;
                // A back-edge is bowed out to the side so a loop reads as a
                // return rather than as forward progress.
                const d = e.back
                  ? `M${x1},${y1} C${x1 + NODE_W},${y1 + GAP_Y} ${x2 + NODE_W},${y2 - GAP_Y} ${x2},${y2}`
                  : `M${x1},${y1} C${x1},${y1 + GAP_Y / 2} ${x2},${y2 - GAP_Y / 2} ${x2},${y2}`;
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
              const p = position(n);
              const node = query.data.nodes.find((x) => x.step === n.step);
              const runs = node?.runs.length ?? 0;
              const current = query.data.current !== undefined && runs > 0;
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
                    // An unreachable step is kept and marked rather than
                    // dropped: it is usually a mistake the author wants to see.
                    borderColor: n.reachable ? (current ? c.accent : c.edge) : c.redQuiet,
                    backgroundColor: c.panel,
                    padding: space.sm,
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

        {query.data.error ? (
          <Card style={{ padding: space.md }}>
            <Body tone="danger" size="sm">
              {query.data.error}
            </Body>
          </Card>
        ) : null}
      </ScrollView>
    </>
  );
}
