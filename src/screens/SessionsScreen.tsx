import { useCallback, useLayoutEffect, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Check, Plus, Trash2 } from "lucide-react-native";
import { SessionStatusKind, type SessionSummary } from "@/api/types";
import {
  Body,
  Empty,
  GroupedCell,
  IconButton,
  Loading,
  Pill,
  ReadError,
  Row,
} from "@/components/ui";
import { ContextualAppBar } from "@/navigation/header";
import { usePullRefresh } from "@/hooks/usePullRefresh";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { useDeleteSession, useSessionFeed, useSessions } from "@/hooks/useSessions";
import { relativeTime } from "@/lib/time";
import { isIOS, radii, space, useColors } from "@/theme";
import { useScreenScroll } from "@/navigation/scroll";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SessionsScreen() {
  const navigation = useNavigation<Nav>();
  const c = useColors();
  const { data, isLoading, isError, error, refetch } = useSessions();
  const pull = usePullRefresh(refetch);
  const remove = useDeleteSession();
  const scroll = useScreenScroll();
  useSessionFeed();

  // Android only. iOS has no multi-select idiom in a list like this — a swipe
  // per row is the whole affordance there, and adding a second one would be
  // adding a gesture the platform does not teach.
  const [selection, setSelection] = useState<string[]>([]);
  const selecting = !isIOS && selection.length > 0;

  const sessions = data?.sessions ?? [];

  // iOS puts a new session in the nav bar; Android keeps the FAB below. Set
  // here rather than in the navigator because only this screen knows the
  // action, and the navigator would have to learn one screen's business to
  // render it.
  useLayoutEffect(() => {
    if (!isIOS) return;
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          accessibilityLabel="New session"
          fill="keycap"
          onPress={() => navigation.navigate("NewSession")}
        >
          <Plus size={22} color={c.accent} />
        </IconButton>
      ),
    });
  }, [navigation, c.accent]);

  // The contextual bar *replaces* the app bar rather than stacking under it,
  // so the navigator's own header comes off while it is up.
  useLayoutEffect(() => {
    if (isIOS) return;
    navigation.setOptions({ headerShown: !selecting });
  }, [navigation, selecting]);

  // Asked before it happens, because there is no undo: the server drops the
  // session and its whole transcript, and a swipe is far too easy to make by
  // accident on a list you are scrolling.
  const confirmDelete = useCallback(
    (chosen: SessionSummary[]) => {
      const one = chosen.length === 1 ? chosen[0] : null;
      Alert.alert(
        one ? "Delete this session?" : `Delete ${chosen.length} sessions?`,
        one
          ? `"${one.name ?? "Untitled session"}" and everything it recorded will be gone. This cannot be undone.`
          : "They and everything they recorded will be gone. This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              // One mutation per id: the server deletes one session per call,
              // and there is no bulk route to pretend otherwise with.
              for (const session of chosen) {
                remove.mutate(session.id, {
                  onError: (e) =>
                    Alert.alert(
                      "Could not delete it",
                      e instanceof Error ? e.message : "The server refused.",
                    ),
                });
              }
              setSelection([]);
            },
          },
        ],
      );
    },
    [remove],
  );

  const toggleSelected = (id: string) =>
    setSelection((current) =>
      current.includes(id)
        ? current.filter((other) => other !== id)
        : [...current, id],
    );

  if (isLoading) return <Loading />;
  if (isError) return <ReadError error={error} onRetry={() => void refetch()} />;

  return (
    <View style={{ flex: 1 }}>
      {/* Drawn over the app bar rather than by the navigator: selection is
          this screen's state, and a navigator that could render it would have
          to hold that state for it. */}
      {selecting ? (
        <ContextualAppBar
          count={selection.length}
          onClose={() => setSelection([])}
          actions={
            <IconButton
              accessibilityLabel="Delete selected"
              onPress={() =>
                confirmDelete(sessions.filter((s) => selection.includes(s.id)))
              }
            >
              <Trash2 size={24} color={c.red} />
            </IconButton>
          }
        />
      ) : null}
      <FlatList
        {...scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingBottom: space.xxl * 2,
        }}
        data={sessions}
        keyExtractor={(s) => s.id}
        refreshControl={
          <RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />
        }
        ListEmptyComponent={
          <Empty
            title="No sessions"
            detail={
              isIOS
                ? "Start one with the button above."
                : "Start one with the button below."
            }
          />
        }
        renderItem={({ item, index }) => (
          <GroupedCell
            first={index === 0}
            last={index === sessions.length - 1}
            separate={!isIOS}
            selected={selection.includes(item.id)}
          >
            {selecting ? (
              <SessionListRow
                session={item}
                first={index === 0}
                selected={selection.includes(item.id)}
                onPress={() => toggleSelected(item.id)}
                onLongPress={() => toggleSelected(item.id)}
              />
            ) : (
              <SwipeToDelete
                accessibilityLabel="Delete session"
                onDelete={() => confirmDelete([item])}
              >
                <SessionListRow
                  session={item}
                  first={index === 0}
                  onLongPress={isIOS ? undefined : () => toggleSelected(item.id)}
                />
              </SwipeToDelete>
            )}
          </GroupedCell>
        )}
      />

      {isIOS ? null : (
        <Pressable
          onPress={() => navigation.navigate("NewSession")}
          accessibilityRole="button"
          accessibilityLabel="New session"
          android_ripple={{ color: c.ripple }}
          style={{
            position: "absolute",
            right: space.lg,
            bottom: space.lg,
            width: 56,
            height: 56,
            borderRadius: radii.card,
            backgroundColor: c.accentQuiet,
            alignItems: "center",
            justifyContent: "center",
            elevation: 3,
            shadowColor: "#000",
            shadowOpacity: 0.22,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
          }}
        >
          <Plus size={24} color={c.accentQuietInk} />
        </Pressable>
      )}
    </View>
  );
}

/**
 * One session.
 *
 * Sub sessions are not rows here any more. They were an indent that repeated
 * the parent's title, could not be deleted (a delete swiped on one would take
 * the parent and every other branch with it) and had a whole picture of their
 * own one tap away — the graph is where a session's shape belongs.
 */
function SessionListRow({
  session,
  first,
  selected,
  onPress,
  onLongPress,
}: {
  session: SessionSummary;
  first: boolean;
  selected?: boolean;
  /** Given only while selecting, when a tap picks rather than opens. */
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const navigation = useNavigation<Nav>();
  const c = useColors();

  return (
    <Row
      first={first || !isIOS}
      onPress={onPress ?? (() => navigation.navigate("Session", { id: session.id }))}
      onLongPress={onLongPress}
    >
      <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
        {selected ? (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: c.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check size={22} color={c.accentInk} />
          </View>
        ) : null}
        <View style={{ flex: 1, gap: space.xs }}>
        <Body role="headline" numberOfLines={1}>
          {session.name ?? "Untitled session"}
        </Body>
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}
        >
          <StatusPill status={session.status} />
          {session.workflow ? <Pill label={session.workflow} /> : null}
          <Body role="caption" tone="faint">
            {relativeTime(session.createdAt)}
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
