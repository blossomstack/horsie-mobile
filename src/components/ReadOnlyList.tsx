import type { ReactNode } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { Body, Empty, GroupedCell, Loading, ReadError, Row } from "@/components/ui";
import { usePullRefresh } from "@/hooks/usePullRefresh";
import { isIOS, space } from "@/theme";

interface Query<T> {
  data: T[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

/**
 * The shape every read-only screen in Library and Settings takes.
 *
 * One component rather than eight near-identical ones: they differ only in
 * what a row says, and a divergence between them would be a bug rather than a
 * feature. Nothing here has an edit affordance — that is the whole contract of
 * these screens, and it is enforced by there being no way to pass one in.
 */
export function ReadOnlyList<T>({
  query,
  keyOf,
  renderRow,
  empty,
  footer,
  onOpen,
}: {
  query: Query<T>;
  keyOf: (item: T) => string;
  renderRow: (item: T) => ReactNode;
  empty: { title: string; detail?: string };
  footer?: string;
  /** Opening a row. Omitted where there is nothing behind it — a tap that
   * goes nowhere is worse than a row that plainly does not respond. */
  onOpen?: (item: T) => void;
}) {
  const pull = usePullRefresh(query.refetch);

  if (query.isLoading) return <Loading />;
  if (query.isError) {
    return <ReadError error={query.error} onRetry={() => void query.refetch()} />;
  }

  return (
    <FlatList
      contentContainerStyle={{ padding: space.lg }}
      data={query.data ?? []}
      keyExtractor={keyOf}
      refreshControl={
        <RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />
      }
      ListEmptyComponent={<Empty title={empty.title} detail={empty.detail} />}
      renderItem={({ item, index }) => (
        <GroupedCell
          first={index === 0}
          last={index === (query.data?.length ?? 0) - 1}
          separate={!isIOS}
        >
          <Row
            first={index === 0 || !isIOS}
            onPress={onOpen ? () => onOpen(item) : undefined}
          >
            {renderRow(item)}
          </Row>
        </GroupedCell>
      )}
      ListFooterComponent={
        footer && (query.data?.length ?? 0) > 0 ? (
          <Body tone="faint" size="sm" style={{ marginTop: space.md }}>
            {footer}
          </Body>
        ) : null
      }
    />
  );
}

/** A name over a line of detail — what nearly every row here is. */
export function NamedRow({
  name,
  detail,
  trailing,
}: {
  name: string;
  detail?: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Body role="headline">{name}</Body>
        {detail ? (
          <Body role="subhead" tone="dim" numberOfLines={2}>
            {detail}
          </Body>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}
