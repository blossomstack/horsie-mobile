import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { api } from "@/api/client";
import { InboxState, type InboxMessageView } from "@/api/types";
import { Body, Button, Card, Empty, Loading, Pill, ReadError } from "@/components/ui";
import { Markdown } from "@/components/transcript/Markdown";
import { useInbox, useInvalidateInbox } from "@/hooks/useInbox";
import { relativeTime } from "@/lib/time";
import { radii, space, text, useColors } from "@/theme";

import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * One inbox message, and the reply that clears it.
 *
 * Read out of the cached `all` page rather than a per-message endpoint: the
 * server has none, and that list is the only read there is.
 */
export default function MessageScreen() {
  const { id } = useRoute<RouteProp<RootStackParamList, "Message">>().params;
  const navigation = useNavigation<Nav>();
  const c = useColors();
  const invalidate = useInvalidateInbox();

  const { data, isLoading, isError, error, refetch } = useInbox("all");
  const message = useMemo(() => data?.messages.find((m) => m.id === id), [data, id]);

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  // Opening it is what makes it read. Once per mount — the list refetches on
  // the session feed, so re-running this on every refetch would POST on a
  // timer for as long as the screen is open.
  const marked = useRef(false);
  useEffect(() => {
    if (!message || message.readAt !== undefined || marked.current) return;
    marked.current = true;
    void api.inbox.markRead([message.id]).then(() => invalidate());
  }, [message, invalidate]);

  const kind = message?.body.kind;
  useEffect(() => {
    navigation.setOptions({ title: kind === "Ask" ? "Question" : "Notice" });
  }, [navigation, kind]);

  if (isLoading) return <Loading />;
  if (isError) return <ReadError error={error} onRetry={() => void refetch()} />;
  if (!message) {
    return <Empty title="Gone" detail="This message is no longer in the inbox." />;
  }

  const ask = message.body.kind === "Ask" ? message.body.value : null;
  const notice = message.body.kind === "Notice" ? message.body.value : null;
  const open = message.state === InboxState.Open;

  const reply = async (body: string) => {
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      await api.inbox.reply(message.id, body.trim());
      await invalidate();
      navigation.goBack();
    } catch (e) {
      Alert.alert("Could not send that", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <StatePill message={message} />
            <Body tone="faint" size="xs">
              {relativeTime(message.createdAt)}
            </Body>
          </View>

          <Card style={{ padding: space.lg }}>
            <Markdown>{ask ? ask.question : (notice?.body ?? "")}</Markdown>
          </Card>

          {ask && open ? (
            <View style={{ gap: space.md }}>
              {ask.choices.length > 0 ? (
                <View style={{ gap: space.sm }}>
                  <Body tone="faint" size="xs" weight="700">
                    {ask.multiple ? "PICK ANY" : "SUGGESTED"}
                  </Body>
                  {ask.choices.map((choice) => (
                    <Button
                      key={choice}
                      label={choice}
                      variant="secondary"
                      disabled={busy}
                      onPress={() => void reply(choice)}
                    />
                  ))}
                </View>
              ) : null}

              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Answer in your own words"
                placeholderTextColor={c.legendFaint}
                multiline
                style={{
                  minHeight: 90,
                  backgroundColor: c.panel,
                  borderRadius: radii.block,
                  borderWidth: 1,
                  borderColor: c.edge,
                  padding: space.md,
                  color: c.legend,
                  fontSize: text.base,
                }}
              />
              <Button
                label="Send"
                busy={busy}
                disabled={!draft.trim()}
                onPress={() => void reply(draft)}
              />
            </View>
          ) : null}

          <Button
            label="Open the session"
            variant="secondary"
            onPress={() =>
              navigation.navigate("Session", {
                id: message.sessionId,
                agent: message.agentId === "main" ? undefined : message.agentId,
              })
            }
          />

          {ask && !open ? (
            <Body tone="faint" size="sm">
              This question is settled — the agent is no longer waiting on it.
            </Body>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function StatePill({ message }: { message: InboxMessageView }) {
  if (message.body.kind === "Notice") return <Pill label="Notice" />;
  switch (message.state) {
    case InboxState.Open:
      return <Pill label="Waiting on you" tone="live" />;
    case InboxState.Answered:
      return <Pill label="Answered" tone="ok" />;
    case InboxState.Declined:
      return <Pill label="Declined" />;
    default:
      return <Pill label="Closed" />;
  }
}
