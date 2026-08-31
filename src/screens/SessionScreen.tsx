import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { GitFork, Send } from "lucide-react-native";
import { MAIN_AGENT, api } from "@/api/client";
import { Body, Card, Loading, Mono, ReadError } from "@/components/ui";
import { TranscriptRow } from "@/components/transcript/Item";
import { Tasks } from "@/components/transcript/Tasks";
import { groupTurns, type TurnGroup } from "@/core/segments";
import { useSessionStream } from "@/hooks/useSessionStream";
import { useSession } from "@/hooks/useSessions";
import { StatusPill } from "./SessionsScreen";
import { SessionStatusKind } from "@/api/types";
import { radii, space, text, useColors } from "@/theme";

import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SessionScreen() {
  const { id, agent } = useRoute<RouteProp<RootStackParamList, "Session">>().params;
  const navigation = useNavigation<Nav>();
  const c = useColors();
  const agentId = agent ?? MAIN_AGENT;

  const session = useSession(id);
  const { stream, addOptimisticUser, removeOptimisticUser, ackOptimisticUser, loadMore } =
    useSessionStream(id, agentId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Inverted list: newest at the bottom, and "load older" is the *end* of the
  // data. That is what keeps the scroll position steady while older pages are
  // prepended — the case an ordinary list handles worst.
  //
  // Rows are turns, not messages: a run of assistant messages is one entry, so
  // the nine provider calls behind one answer scroll as one thing.
  const rows = useMemo(() => [...groupTurns(stream.items)].reverse(), [stream.items]);

  // The tail being written now continues the newest entry when that entry is
  // the agent's. When it is not — the person has just spoken, or the log is
  // empty — it starts one of its own, so the first token of a turn has
  // somewhere to land.
  const streaming = stream.streaming;
  const continues = streaming.length > 0 && rows[0]?.kind === "assistant";
  const pendingTurn: TurnGroup | null =
    streaming.length > 0 && !continues
      ? { kind: "assistant", id: "streaming", msgs: [] }
      : null;

  const parked = stream.livePendingAsks?.length ? stream.livePendingAsks : null;

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    const echo = addOptimisticUser(body);
    try {
      const ack = await api.sessions.send(id, body, agentId);
      ackOptimisticUser(echo, ack.messageId);
    } catch {
      // Put it back rather than losing what was typed.
      removeOptimisticUser(echo);
      setDraft(body);
    } finally {
      setSending(false);
    }
  }, [draft, sending, id, agentId, addOptimisticUser, ackOptimisticUser, removeOptimisticUser]);

  const answer = useCallback(
    async (toolCallId: string, body: string) => {
      await api.sessions.answerAsks(id, agentId, [{ toolCallId, text: body }]);
    },
    [id, agentId],
  );

  useEffect(() => {
    navigation.setOptions({
      title: session.data?.session.name ?? "Session",
      headerRight: () => (
        <GitFork
          size={20}
          color={c.legendDim}
          onPress={() => navigation.navigate("Graph", { id })}
        />
      ),
    });
  }, [navigation, session.data?.session.name, c.legendDim, id]);

  if (session.isLoading && stream.items.length === 0) return <Loading />;
  if (session.isError && stream.items.length === 0) {
    return <ReadError error={session.error} onRetry={() => void session.refetch()} />;
  }

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <Tasks tasks={stream.tasks} />
        <StatusBar stream={stream} />

        <FlatList
          inverted
          data={pendingTurn ? [pendingTurn, ...rows] : rows}
          keyExtractor={keyOf}
          // `flexGrow` + `flex-end` on an inverted list is what puts a short
          // transcript at the *top* of the screen. Without it the content
          // container is only as tall as its rows, and the flip leaves a fresh
          // session's first message stranded at the bottom above the composer
          // with a screen of blank above it.
          contentContainerStyle={{
            padding: space.lg,
            gap: space.lg,
            flexGrow: 1,
            justifyContent: "flex-end",
          }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            stream.loadingMore ? (
              <ActivityIndicator color={c.accent} style={{ marginVertical: space.lg }} />
            ) : null
          }
          ListHeaderComponent={
            parked ? (
              <View style={{ gap: space.lg }}>
                <ParkedAsks asks={parked} onAnswer={answer} />
              </View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <TranscriptRow
              turn={item}
              // Only the newest entry can be the one still being written.
              live={index === 0 && streaming ? { text: streaming } : undefined}
            />
          )}
        />

        <View
          style={{
            flexDirection: "row",
            gap: space.sm,
            padding: space.md,
            borderTopWidth: 1,
            borderTopColor: c.edge,
            backgroundColor: c.chassis,
            alignItems: "flex-end",
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Say something"
            placeholderTextColor={c.legendFaint}
            multiline
            style={{
              flex: 1,
              maxHeight: 120,
              backgroundColor: c.panel,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: c.edge,
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              color: c.legend,
              fontSize: text.base,
            }}
          />
          <Send
            size={22}
            color={draft.trim() && !sending ? c.accent : c.legendFaint}
            onPress={send}
            style={{ marginBottom: space.sm }}
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const keyOf = (turn: TurnGroup): string => turn.id;

function StatusBar({ stream }: { stream: ReturnType<typeof useSessionStream>["stream"] }) {
  const c = useColors();
  if (!stream.connected && !stream.streamError) {
    return (
      <View
        style={{
          flexDirection: "row",
          gap: space.sm,
          alignItems: "center",
          backgroundColor: c.keycap,
          paddingHorizontal: space.lg,
          paddingVertical: space.sm,
        }}
      >
        <ActivityIndicator size="small" color={c.legendDim} />
        <Body size="xs" tone="dim">
          Reconnecting — anything missed is replayed
        </Body>
      </View>
    );
  }
  if (stream.streamError) {
    return (
      <View style={{ backgroundColor: c.redQuiet, padding: space.md }}>
        <Body tone="danger" size="sm">
          {stream.streamError}
        </Body>
      </View>
    );
  }
  // Progress is the only thing worth a bar: a status the list already shows is
  // noise, and an absent progression means nothing is in flight.
  if (!stream.progression) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        gap: space.sm,
        alignItems: "center",
        backgroundColor: c.liveQuiet,
        paddingHorizontal: space.lg,
        paddingVertical: space.sm,
      }}
    >
      <ActivityIndicator size="small" color={c.liveInk} />
      <Mono size="xs">{stream.progression.stage}</Mono>
      {stream.progression.detail ? (
        <Body size="xs" tone="dim" numberOfLines={1} style={{ flex: 1 }}>
          {stream.progression.detail}
        </Body>
      ) : null}
    </View>
  );
}

/**
 * The questions holding this agent still.
 *
 * Pinned above the transcript rather than left in place: the whole reason to
 * carry this on a phone is to notice one and clear it, and an agent parked
 * three screens up is an agent nobody unparks.
 */
function ParkedAsks({
  asks,
  onAnswer,
}: {
  asks: NonNullable<ReturnType<typeof useSessionStream>["stream"]["livePendingAsks"]>;
  onAnswer: (toolCallId: string, text: string) => Promise<void>;
}) {
  const c = useColors();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <View style={{ gap: space.md }}>
      {asks.map((ask, i) => {
        // A lifecycle ask carries no choices — only the inbox's copy does, so
        // the suggested answers live there. And an ask with no `toolCallId`
        // has no address to answer to, so it is shown and not offered: a box
        // whose submit silently did nothing would be worse than none.
        const id = ask.toolCallId;
        return (
          <Card
            key={id ?? `ask-${i}`}
            style={{ borderColor: c.accent, padding: space.lg, gap: space.md }}
          >
            <Body weight="600">{ask.question}</Body>

            {id === undefined ? (
              <Body size="sm" tone="faint">
                Answer this one from the session in the web UI — it arrived without an
                address to reply to.
              </Body>
            ) : (
              <TextInput
                value={drafts[id] ?? ""}
                onChangeText={(v) => setDrafts((d) => ({ ...d, [id]: v }))}
                placeholder="Answer in your own words"
                placeholderTextColor={c.legendFaint}
                multiline
                blurOnSubmit
                returnKeyType="send"
                onSubmitEditing={() => {
                  const body = (drafts[id] ?? "").trim();
                  if (!body) return;
                  setBusy(id);
                  void onAnswer(id, body)
                    .then(() => setDrafts((d) => ({ ...d, [id]: "" })))
                    .finally(() => setBusy(null));
                }}
                editable={busy !== id}
                style={{
                  backgroundColor: c.screen,
                  borderRadius: radii.md,
                  padding: space.md,
                  color: c.legend,
                  fontSize: text.base,
                }}
              />
            )}
          </Card>
        );
      })}
    </View>
  );
}

export { SessionStatusKind, StatusPill };
