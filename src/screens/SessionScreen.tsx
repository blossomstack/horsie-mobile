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
import { CircleHelp, GitFork } from "lucide-react-native";
import { MAIN_AGENT, api } from "@/api/client";
import { Body, Card, Loading, Mono, ReadError } from "@/components/ui";
import {
  AttachButton,
  Composer,
  ComposerNotice,
} from "@/components/transcript/Composer";
import { AttachSheet } from "@/components/attachments/AttachSheet";
import { AttachmentTray } from "@/components/attachments/AttachmentTray";
import { useAttachments } from "@/hooks/useAttachments";
import { SessionGraph } from "@/components/SessionGraph";
import { TranscriptRow } from "@/components/transcript/Item";
import { Tasks } from "@/components/transcript/Tasks";
import { groupTurns, type TurnGroup } from "@/core/segments";
import { useSessionStream } from "@/hooks/useSessionStream";
import { useSession } from "@/hooks/useSessions";
import { StatusPill } from "./SessionsScreen";
import { SessionStatusKind } from "@/api/types";
import { isIOS, radii, space, typeRamp, useColors } from "@/theme";

import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * A session, or one agent inside it.
 *
 * Which of the two pictures this is comes from the session itself, so the
 * decision is made here and the transcript below is only ever mounted when
 * there is one to read: a workflow run has no transcript at all, and mounting
 * the stream to find that out subscribes to a log that will never have an
 * entry.
 */
export default function SessionScreen() {
  const { id, agent } = useRoute<RouteProp<RootStackParamList, "Session">>().params;
  const navigation = useNavigation<Nav>();
  const c = useColors();

  const session = useSession(id);
  const detail = session.data?.session;

  // A run *is* its steps — there is no main agent and nothing ever wrote to its
  // log — so its page is the graph, exactly as on the web. Drawn as a
  // transcript it was a blank screen with a composer nobody was listening at.
  const isRun = detail?.workflow !== undefined && agent === undefined;

  // Whose transcript this is, when it is not the session's own. Every step of a
  // run is a page titled from the same session, so without this the four
  // screens you reach from a run's graph all read "triage-flow".
  const title =
    agent === undefined
      ? detail?.name
      : (detail?.agents.find((a) => a.id === agent)?.title ??
        detail?.subSessions.find((sub) => sub.id === agent)?.title ??
        detail?.name);

  useEffect(() => {
    navigation.setOptions({
      title: title ?? "Session",
      // Nothing to reach: the graph is already what you are looking at.
      headerRight: isRun
        ? undefined
        : () => (
            <GitFork
              size={20}
              color={c.legendDim}
              onPress={() => navigation.navigate("Graph", { id })}
            />
          ),
    });
  }, [navigation, title, c.legendDim, id, isRun]);

  if (!detail && session.isLoading) return <Loading />;
  if (!detail && session.isError) {
    return <ReadError error={session.error} onRetry={() => void session.refetch()} />;
  }
  if (isRun) return <SessionGraph id={id} />;

  return (
    <Transcript
      id={id}
      agentId={agent ?? MAIN_AGENT}
      // A workflow step works from its definition, not from messages. It has a
      // transcript worth reading and nothing that would read a reply.
      takesMessages={detail?.workflow === undefined}
    />
  );
}

function Transcript({
  id,
  agentId,
  takesMessages,
}: {
  id: string;
  agentId: string;
  takesMessages: boolean;
}) {
  const c = useColors();
  const { stream, addOptimisticUser, removeOptimisticUser, ackOptimisticUser, loadMore } =
    useSessionStream(id, agentId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const attachments = useAttachments();
  const [sheetOpen, setSheetOpen] = useState(false);

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
    const refs = attachments.refs;
    const echo = addOptimisticUser(body);
    try {
      const ack = await api.sessions.send(id, body, agentId, refs);
      ackOptimisticUser(echo, ack.messageId);
      // Only once the server has taken them: clearing on send would drop the
      // thumbnails a moment before finding out the message was refused.
      attachments.clear();
    } catch {
      // Put it back rather than losing what was typed.
      removeOptimisticUser(echo);
      setDraft(body);
    } finally {
      setSending(false);
    }
  }, [
    draft,
    sending,
    id,
    agentId,
    attachments,
    addOptimisticUser,
    ackOptimisticUser,
    removeOptimisticUser,
  ]);

  const answer = useCallback(
    async (toolCallId: string, body: string) => {
      await api.sessions.answerAsks(id, agentId, [{ toolCallId, text: body }]);
    },
    [id, agentId],
  );

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

        {takesMessages ? (
          <Composer
            value={draft}
            onChangeText={setDraft}
            onSend={() => void send()}
            // An attachment still going up is a reason to wait: sending now
            // would post the text and quietly lose the file.
            canSend={
              draft.trim().length > 0 && !sending && attachments.settled
            }
            leading={
              <AttachButton onPress={() => setSheetOpen(true)} />
            }
            above={
              <AttachmentTray
                items={attachments.pending}
                onRemove={attachments.remove}
                onRetry={attachments.retry}
              />
            }
          />
        ) : (
          <ComposerNotice>
            This is a workflow step. It works from its definition, not from
            messages.
          </ComposerNotice>
        )}
      </KeyboardAvoidingView>
      <AttachSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onPick={(source) => void attachments.pick(source)}
      />
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
          backgroundColor: isIOS ? c.keycap : c.surfaceHigh,
          paddingHorizontal: space.lg,
          paddingVertical: space.sm,
        }}
      >
        <ActivityIndicator size="small" color={c.legendDim} />
        <Body role="caption" tone="dim">
          Reconnecting — anything missed is replayed
        </Body>
      </View>
    );
  }
  if (stream.streamError) {
    return (
      <View
        style={{
          backgroundColor: c.redQuiet,
          paddingHorizontal: space.lg,
          paddingVertical: isIOS ? 11 : 12,
        }}
      >
        <Body role="subhead" tone="danger">
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
      <Mono size="xs" tone="live">
        {stream.progression.stage}
      </Mono>
      {stream.progression.detail ? (
        <Body role="caption" tone="dim" numberOfLines={1} style={{ flex: 1 }}>
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
            // The one card in the app with a border, and it is the tint at
            // 1.5px: this is an agent that has stopped, and it has to read
            // differently from every other card on the screen.
            style={{
              borderWidth: isIOS ? 1.5 : 1,
              borderColor: c.accent,
              borderRadius: radii.ask,
              padding: space.lg,
              gap: space.md,
            }}
          >
            <View
              style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-start" }}
            >
              <CircleHelp
                size={isIOS ? 19 : 20}
                color={c.accent}
                style={{ marginTop: 2 }}
              />
              <Body role="headline" style={{ flex: 1 }}>
                {ask.question}
              </Body>
            </View>

            {id === undefined ? (
              <Body role="subhead" tone="faint">
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
                  backgroundColor: c.panelRaised,
                  borderRadius: radii.block,
                  paddingHorizontal: 13,
                  paddingVertical: 11,
                  color: c.legend,
                  ...typeRamp.body,
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
