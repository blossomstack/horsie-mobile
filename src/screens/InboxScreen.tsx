import { useCallback, useState } from "react";
import { Alert, RefreshControl, View } from "react-native";
import Animated from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { CircleHelp, MessageSquare } from "lucide-react-native";
import type { InboxScope } from "@/api/client";
import { useDeleteInbox, useInbox } from "@/hooks/useInbox";
import { usePullRefresh } from "@/hooks/usePullRefresh";
import {
  Body,
  Chip,
  Empty,
  GroupedCell,
  Loading,
  Pill,
  ReadError,
  Row,
  Segmented,
} from "@/components/ui";
import { InboxState, type InboxMessageView } from "@/api/types";
import { isIOS, space, useColors } from "@/theme";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { relativeTime } from "@/lib/time";
import { useScreenScroll } from "@/navigation/scroll";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCOPES: { key: InboxScope; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "unread", label: "Unread" },
  { key: "all", label: "All" },
];

/** Where a row's text starts, and so where its separator has to start too. */
const TITLE_INSET = 48;

export default function InboxScreen() {
  const [scope, setScope] = useState<InboxScope>("open");
  const { data, isLoading, isError, error, refetch, isPlaceholderData } =
    useInbox(scope);
  const pull = usePullRefresh(refetch);
  const scroll = useScreenScroll();
  const remove = useDeleteInbox();
  const c = useColors();

  const messages = data?.messages ?? [];

  // Asked before it happens, as on the session list, and for a second reason
  // here: deleting an ask an agent is still parked on declines it, so the
  // agent moves on with no answer. That is worth saying out loud.
  const confirmDelete = useCallback(
    (message: InboxMessageView) => {
      const parked = isOpenAsk(message);
      Alert.alert(
        parked ? "Delete this question?" : "Delete this message?",
        parked
          ? `"${message.title}" will be declined, and the agent waiting on it will carry on without an answer. This cannot be undone.`
          : `"${message.title}" will be gone. This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () =>
              remove.mutate([message.id], {
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
    <Animated.FlatList
      {...scroll}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: space.lg,
        paddingBottom: space.xl,
      }}
      // Rows still being carried over from the scope tapped away from.
      // Dimmed rather than replaced with a spinner: the shape of the list
      // is worth keeping, and its contents are not the answer yet.
      style={{ opacity: isPlaceholderData ? 0.5 : 1 }}
      data={messages}
      keyExtractor={(m) => m.id}
      refreshControl={
        <RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />
      }
      ListHeaderComponent={
        <View style={{ paddingBottom: space.md }}>
          <ScopeBar scope={scope} onChange={setScope} />
        </View>
      }
      ListEmptyComponent={
        <Empty
          title={scope === "open" ? "Nothing waiting" : "Nothing here"}
          detail={
            scope === "open"
              ? "No agent is parked on a question."
              : "Agents put what they say and ask here."
          }
        />
      }
      renderItem={({ item, index }) => (
        <GroupedCell
          first={index === 0}
          last={index === messages.length - 1}
          separate={!isIOS}
          // M3 lifts the newest open ask off its neighbours; iOS says the same
          // thing with a pill and a dot, and keeps one flat surface.
          raised={!isIOS && index === 0 && isOpenAsk(item)}
        >
          <SwipeToDelete
            accessibilityLabel="Delete message"
            background={
              !isIOS && index === 0 && isOpenAsk(item) ? c.panelRaised : c.panel
            }
            onDelete={() => confirmDelete(item)}
          >
            <MessageRow message={item} first={index === 0} />
          </SwipeToDelete>
        </GroupedCell>
      )}
      ListFooterComponent={
        messages.length > 0 ? (
          <Body role="subhead" tone="faint" style={{ paddingTop: space.md }}>
            Answering here unparks the agent.
          </Body>
        ) : null
      }
    />
  );
}

function isOpenAsk(message: InboxMessageView): boolean {
  return message.body.kind === "Ask" && message.state === InboxState.Open;
}

/**
 * Which slice of the inbox is showing.
 *
 * A sliding segmented control on iOS and a row of filter chips on Android —
 * the same closed three-way choice, drawn the way each platform draws one.
 */
function ScopeBar({
  scope,
  onChange,
}: {
  scope: InboxScope;
  onChange: (next: InboxScope) => void;
}) {
  if (isIOS) {
    return <Segmented options={SCOPES} value={scope} onChange={onChange} />;
  }
  return (
    <View style={{ flexDirection: "row", gap: space.sm }}>
      {SCOPES.map((option) => (
        <Chip
          key={option.key}
          label={option.label}
          selected={option.key === scope}
          onPress={() => onChange(option.key)}
        />
      ))}
    </View>
  );
}

function MessageRow({
  message,
  first,
}: {
  message: InboxMessageView;
  first: boolean;
}) {
  const navigation = useNavigation<Nav>();
  const c = useColors();
  const isAsk = message.body.kind === "Ask";
  const unread = message.readAt === undefined;

  return (
    <Row
      // On Android every message is its own card, so no row is ever the second
      // one in anything and none of them wants a separator.
      first={first || !isIOS}
      inset={TITLE_INSET}
      paddingVertical={isIOS ? 14 : 16}
      onPress={() => navigation.navigate("Message", { id: message.id })}
    >
      <View style={{ flexDirection: "row", gap: space.md }}>
        {isIOS ? (
          <View style={{ paddingTop: 2 }}>
            {isAsk ? (
              <CircleHelp size={20} color={c.accent} />
            ) : (
              <MessageSquare size={20} color={c.legendFaint} />
            )}
          </View>
        ) : (
          <Avatar message={message} />
        )}
        <View style={{ flex: 1, gap: space.xs }}>
          <Body
            role="headline"
            weight={unread ? (isIOS ? "600" : "500") : isIOS ? "500" : "400"}
            numberOfLines={2}
          >
            {message.title}
          </Body>
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}
          >
            <StatePill message={message} />
            <Body role="caption" tone="faint">
              {relativeTime(message.createdAt)}
            </Body>
          </View>
        </View>
        {isIOS && unread ? (
          <View
            style={{
              width: 9,
              height: 9,
              borderRadius: 4.5,
              backgroundColor: c.accent,
              marginTop: 7,
            }}
          />
        ) : null}
      </View>
    </Row>
  );
}

/**
 * M3's leading avatar, tinted by what the message *is* rather than by who sent
 * it — there is no sender here, and a circle that is always the same colour is
 * a circle that says nothing.
 */
function Avatar({ message }: { message: InboxMessageView }) {
  const c = useColors();
  const isAsk = message.body.kind === "Ask";
  const answered = message.state === InboxState.Answered;
  const [fill, ink] = !isAsk
    ? [c.surfaceHigh, c.legendDim]
    : answered
      ? [c.lampOkQuiet, c.lampOk]
      : [c.accentQuiet, c.accentQuietInk];
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: fill,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {isAsk ? (
        <CircleHelp size={22} color={ink} />
      ) : (
        <MessageSquare size={22} color={ink} />
      )}
    </View>
  );
}

function StatePill({ message }: { message: InboxMessageView }) {
  if (message.body.kind === "Notice") return <Pill label="Notice" />;
  switch (message.state) {
    case InboxState.Open:
      // The only state that still holds an agent, so it is the only one that
      // gets the loud colour.
      return <Pill label="Waiting on you" tone="live" />;
    case InboxState.Answered:
      return <Pill label="Answered" tone="ok" />;
    case InboxState.Declined:
      return <Pill label="Declined" />;
    default:
      return <Pill label="Closed" />;
  }
}
