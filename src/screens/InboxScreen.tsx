import { useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { CircleHelp, MessageSquare } from "lucide-react-native";
import type { InboxScope } from "@/api/client";
import { useInbox } from "@/hooks/useInbox";
import { Body, Card, Empty, Loading, Pill, ReadError, Row } from "@/components/ui";
import { InboxState, type InboxMessageView } from "@/api/types";
import { radii, space, useColors } from "@/theme";
import { relativeTime } from "@/lib/time";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCOPES: { key: InboxScope; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "unread", label: "Unread" },
  { key: "all", label: "All" },
];

export default function InboxScreen() {
  const [scope, setScope] = useState<InboxScope>("open");
  const { data, isLoading, isError, error, refetch, isRefetching } = useInbox(scope);

  return (
    <View style={{ flex: 1 }}>
      <ScopeBar scope={scope} onChange={setScope} />
      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ReadError error={error} onRetry={() => void refetch()} />
      ) : (
        <FlatList
          contentContainerStyle={{ padding: space.lg, paddingTop: 0 }}
          data={data?.messages ?? []}
          keyExtractor={(m) => m.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
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
            <Card style={{ marginTop: index === 0 ? 0 : space.sm }}>
              <MessageRow message={item} />
            </Card>
          )}
        />
      )}
    </View>
  );
}

function ScopeBar({
  scope,
  onChange,
}: {
  scope: InboxScope;
  onChange: (next: InboxScope) => void;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", gap: space.sm, padding: space.lg }}>
      {SCOPES.map((s) => {
        const on = s.key === scope;
        return (
          <View
            key={s.key}
            style={{
              borderRadius: radii.sm,
              overflow: "hidden",
              backgroundColor: on ? c.accentQuiet : c.keycap,
            }}
          >
            <Row first onPress={() => onChange(s.key)}>
              <Body size="sm" weight="600" tone={on ? "accent" : "dim"}>
                {s.label}
              </Body>
            </Row>
          </View>
        );
      })}
    </View>
  );
}

function MessageRow({ message }: { message: InboxMessageView }) {
  const navigation = useNavigation<Nav>();
  const c = useColors();
  const isAsk = message.body.kind === "Ask";
  const unread = message.readAt === undefined;

  return (
    <Row first onPress={() => navigation.navigate("Message", { id: message.id })}>
      <View style={{ flexDirection: "row", gap: space.md }}>
        <View style={{ paddingTop: 2 }}>
          {isAsk ? (
            <CircleHelp size={18} color={c.accent} />
          ) : (
            <MessageSquare size={18} color={c.legendFaint} />
          )}
        </View>
        <View style={{ flex: 1, gap: space.xs }}>
          <Body weight={unread ? "700" : "500"} numberOfLines={2}>
            {message.title}
          </Body>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <StatePill message={message} />
            <Body tone="faint" size="xs">
              {relativeTime(message.createdAt)}
            </Body>
          </View>
        </View>
      </View>
    </Row>
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
