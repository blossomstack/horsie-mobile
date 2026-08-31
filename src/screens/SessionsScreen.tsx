import { useMemo } from "react";
import { FlatList, RefreshControl, View , Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { CornerDownRight, Plus } from "lucide-react-native";
import { SessionStatusKind } from "@/api/types";
import { Body, Card, Empty, Loading, Pill, ReadError, Row } from "@/components/ui";
import { useSessionFeed, useSessions } from "@/hooks/useSessions";
import { flattenSessions, type SessionRow } from "@/lib/sessionTree";
import { relativeTime } from "@/lib/time";
import { radii, space, useColors } from "@/theme";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SessionsScreen() {
  const navigation = useNavigation<Nav>();
  const c = useColors();
  const { data, isLoading, isError, error, refetch, isRefetching } = useSessions();
  useSessionFeed();

  const rows = useMemo(() => flattenSessions(data?.sessions ?? []), [data]);

  if (isLoading) return <Loading />;
  if (isError) return <ReadError error={error} onRetry={() => void refetch()} />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{ padding: space.lg }}
        data={rows}
        keyExtractor={(r) => r.key}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        ListEmptyComponent={
          <Empty title="No sessions" detail="Start one with the button below." />
        }
        renderItem={({ item, index }) => (
          <Card
            style={{
              marginTop: item.depth === 0 && index > 0 ? space.sm : 0,
              marginLeft: item.depth * space.lg,
              // A sub session is part of the session above it, so it shares
              // that card's outline rather than starting a new one.
              borderTopLeftRadius: item.depth ? 0 : radii.lg,
              borderTopRightRadius: item.depth ? 0 : radii.lg,
            }}
          >
            <SessionListRow row={item} />
          </Card>
        )}
      />

      <Pressable
        onPress={() => navigation.navigate("NewSession")}
        style={({ pressed }) => ({
          position: "absolute",
          right: space.lg,
          bottom: space.lg,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: c.accent,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Plus size={26} color={c.accentInk} />
      </Pressable>
    </View>
  );
}

function SessionListRow({ row }: { row: SessionRow }) {
  const navigation = useNavigation<Nav>();
  const c = useColors();
  const { session, sub } = row;

  return (
    <Row
      first
      onPress={() =>
        navigation.navigate("Session", { id: row.sessionId, agent: row.agentId })
      }
    >
      <View style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-start" }}>
        {row.depth > 0 ? (
          <CornerDownRight size={14} color={c.legendFaint} style={{ marginTop: 3 }} />
        ) : null}
        <View style={{ flex: 1, gap: space.xs }}>
          <Body weight="600" numberOfLines={1}>
            {row.title}
          </Body>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            {sub ? (
              <StatusPill status={sub.status as SessionStatusKind} />
            ) : (
              <StatusPill status={session.status} />
            )}
            {session.workflow ? <Pill label={session.workflow} /> : null}
            <Body tone="faint" size="xs">
              {relativeTime(sub ? sub.lastActivityMs : session.createdAt)}
            </Body>
          </View>
        </View>
      </View>
    </Row>
  );
}

export function StatusPill({ status }: { status: SessionStatusKind }) {
  switch (status) {
    case SessionStatusKind.Running:
      return <Pill label="Running" tone="live" />;
    case SessionStatusKind.AwaitingInput:
      return <Pill label="Waiting on you" tone="live" />;
    case SessionStatusKind.Provisioning:
      return <Pill label="Provisioning" tone="live" />;
    case SessionStatusKind.Failed:
      return <Pill label="Failed" tone="danger" />;
    case SessionStatusKind.Unrecoverable:
      return <Pill label="Unrecoverable" tone="danger" />;
    case SessionStatusKind.Finished:
      return <Pill label="Finished" tone="ok" />;
    default:
      return <Pill label="Idle" />;
  }
}
