import { useCallback, useMemo } from "react";
import { Alert, FlatList, RefreshControl, View , Pressable } from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { useNavigation } from "@react-navigation/native";
import { CornerDownRight, Plus, Trash2 } from "lucide-react-native";
import { SessionStatusKind } from "@/api/types";
import { Body, Card, Empty, Loading, Pill, ReadError, Row } from "@/components/ui";
import { usePullRefresh } from "@/hooks/usePullRefresh";
import { useDeleteSession, useSessionFeed, useSessions } from "@/hooks/useSessions";
import { flattenSessions, type SessionRow } from "@/lib/sessionTree";
import { relativeTime } from "@/lib/time";
import { radii, space, useColors } from "@/theme";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SessionsScreen() {
  const navigation = useNavigation<Nav>();
  const c = useColors();
  const { data, isLoading, isError, error, refetch } = useSessions();
  const pull = usePullRefresh(refetch);
  const remove = useDeleteSession();
  useSessionFeed();

  const rows = useMemo(() => flattenSessions(data?.sessions ?? []), [data]);

  // Asked before it happens, because there is no undo: the server drops the
  // session and its whole transcript, and a swipe is far too easy to make by
  // accident on a list you are scrolling.
  const confirmDelete = useCallback(
    (row: SessionRow) => {
      Alert.alert(
        "Delete this session?",
        `"${row.title}" and everything it recorded will be gone. This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () =>
              remove.mutate(row.sessionId, {
                onError: (e) =>
                  Alert.alert(
                    "Could not delete it",
                    e instanceof Error ? e.message : "The server refused.",
                  ),
              }),
          },
        ],
      );
    },
    [remove],
  );

  if (isLoading) return <Loading />;
  if (isError) return <ReadError error={error} onRetry={() => void refetch()} />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{ padding: space.lg }}
        data={rows}
        keyExtractor={(r) => r.key}
        refreshControl={
          <RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />
        }
        ListEmptyComponent={
          <Empty title="No sessions" detail="Start one with the button below." />
        }
        renderItem={({ item, index }) => {
          const card = (
            <Card
              style={{
                marginTop: item.depth === 0 && index > 0 ? space.sm : 0,
                marginLeft: item.depth * space.lg,
                // A sub session is part of the session above it, so it shares
                // that card's outline rather than starting a new one.
                borderTopLeftRadius: item.depth ? 0 : radii.card,
                borderTopRightRadius: item.depth ? 0 : radii.card,
              }}
            >
              <SessionListRow row={item} />
            </Card>
          );
          // Only whole sessions. A sub session row is addressed by its parent
          // session's id plus its own agent id, so a delete swiped on one
          // would take the parent and every other branch with it.
          if (item.depth > 0) return card;
          return (
            <Swipeable
              friction={2}
              rightThreshold={40}
              overshootRight={false}
              renderRightActions={() => (
                <DeleteAction
                  offsetTop={index > 0 ? space.sm : 0}
                  onPress={() => confirmDelete(item)}
                />
              )}
            >
              {card}
            </Swipeable>
          );
        }}
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

/** What a swipe uncovers. Deliberately one action and deliberately loud: it is
 * the only irreversible thing this app can do. */
function DeleteAction({
  offsetTop,
  onPress,
}: {
  offsetTop: number;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Delete session"
      style={({ pressed }) => ({
        width: 76,
        marginTop: offsetTop,
        marginLeft: space.sm,
        borderRadius: radii.card,
        // The palette has no ink-on-red, so this is the pair it does define —
        // the same one the transcript's error banner uses — with the strong
        // red kept as an outline so the panel reads as an action rather than
        // as a notice.
        backgroundColor: c.redQuiet,
        borderWidth: 1,
        borderColor: c.red,
        alignItems: "center",
        justifyContent: "center",
        gap: space.xs,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Trash2 size={18} color={c.redInk} />
      <Body size="xs" tone="danger" weight="600">
        Delete
      </Body>
    </Pressable>
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
