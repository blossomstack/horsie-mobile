import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { api } from "@/api/client";
import { Body, Card, Empty, Loading, Pill, ReadError, Row } from "@/components/ui";
import { NamedRow } from "@/components/ReadOnlyList";
import { usePullRefresh } from "@/hooks/usePullRefresh";
import { useConnection } from "@/state/connection";
import { radii, space, useColors } from "@/theme";

/**
 * What agents have remembered, grouped by the space it lives in.
 *
 * The spaces are read separately from the memories: a space with nothing in it
 * still exists and still matters — it is what an agent preset points at — and
 * deriving the list from the memories alone would make an empty one vanish.
 */
export default function MemoryScreen() {
  const { project } = useConnection();
  const enabled = project !== null;
  const [space_, setSpace] = useState<string | null>(null);

  const spaces = useQuery({
    queryKey: ["memory-spaces", project],
    queryFn: () => api.memory.spaces(),
    enabled,
  });
  const memories = useQuery({
    queryKey: ["memories", project, space_],
    queryFn: () => api.memory.list(space_ ?? undefined),
    enabled,
  });

  const shown = useMemo(() => memories.data ?? [], [memories.data]);

  const refreshAll = useCallback(
    () => Promise.all([spaces.refetch(), memories.refetch()]),
    [spaces, memories],
  );
  const pull = usePullRefresh(refreshAll);

  if (spaces.isLoading) return <Loading />;
  if (spaces.isError) {
    return <ReadError error={spaces.error} onRetry={() => void spaces.refetch()} />;
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.lg }}
        refreshControl={
          <RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />
        }
      >
        {(spaces.data?.length ?? 0) > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            <Chip label="All" on={space_ === null} onPress={() => setSpace(null)} />
            {spaces.data?.map((s) => (
              <Chip
                key={s.name}
                label={`${s.name} · ${s.memoryCount}`}
                on={space_ === s.name}
                onPress={() => setSpace(s.name)}
              />
            ))}
          </View>
        ) : null}

        {shown.length === 0 ? (
          <Empty
            title="Nothing remembered"
            detail={
              space_
                ? `Nothing in ${space_} yet.`
                : "Agents write here as they work."
            }
          />
        ) : (
          <Card>
            {shown.map((m, i) => (
              <Row key={m.id} first={i === 0}>
                <NamedRow
                  name={m.name}
                  detail={m.description}
                  trailing={space_ === null ? <Pill label={m.space} /> : undefined}
                />
              </Row>
            ))}
          </Card>
        )}

        <Body tone="faint" size="sm">
          Read-only. Memories are written by agents and edited in the web UI.
        </Body>
      </ScrollView>
    </>
  );
}

function Chip({
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
