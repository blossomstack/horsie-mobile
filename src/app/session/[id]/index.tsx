import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { GitFork, Send } from "lucide-react-native";
import { MAIN_AGENT, api } from "@/api/client";
import { Body, Card, Loading, Mono, ReadError } from "@/components/ui";
import { TranscriptRow } from "@/components/transcript/Item";
import { useSessionStream } from "@/hooks/useSessionStream";
import { useSession } from "@/hooks/useSessions";
import { StatusPill } from "@/app/(tabs)/sessions";
import { SessionStatusKind } from "@/api/types";
import { radii, space, text, useColors } from "@/theme";
import type { TranscriptItem } from "@/core/transcript";

export default function SessionScreen() {
  const { id, agent } = useLocalSearchParams<{ id: string; agent?: string }>();
  const router = useRouter();
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
  const rows = useMemo(() => [...stream.items].reverse(), [stream.items]);

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

  if (session.isLoading && stream.items.length === 0) return <Loading />;
  if (session.isError && stream.items.length === 0) {
    return <ReadError error={session.error} onRetry={() => void session.refetch()} />;
  }

  const title = session.data?.session.name ?? "Session";

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerRight: () => (
            <GitFork
              size={20}
              color={c.legendDim}
              onPress={() => router.push(`/session/${id}/graph`)}
            />
          ),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <StatusBar stream={stream} />

        <FlatList
          inverted
          data={rows}
          keyExtractor={keyOf}
          contentContainerStyle={{ padding: space.lg, gap: space.lg }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            stream.loadingMore ? (
              <ActivityIndicator color={c.accent} style={{ marginVertical: space.lg }} />
            ) : null
          }
          ListHeaderComponent={
            <View style={{ gap: space.lg }}>
              {parked ? <ParkedAsks asks={parked} onAnswer={answer} /> : null}
              {stream.streaming ? (
                <Body tone="dim" style={{ fontStyle: "italic" }}>
                  {stream.streaming}
                </Body>
              ) : null}
            </View>
          }
          renderItem={({ item }) => <TranscriptRow item={item} />}
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

function keyOf(item: TranscriptItem): string {
  switch (item.kind) {
    case "message":
      return `m:${item.value.id}`;
    case "notice":
      return `h:${item.value.id}`;
    case "compaction":
      return `c:${item.value.seq}`;
    case "compaction-skipped":
      return `cs:${item.value.atMs}`;
    case "subSession":
      return `s:${item.value.id}`;
  }
}

function StatusBar({ stream }: { stream: ReturnType<typeof useSessionStream>["stream"] }) {
  const c = useColors();
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
