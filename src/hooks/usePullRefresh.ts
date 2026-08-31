import { useCallback, useState } from "react";

/**
 * The state a `RefreshControl` needs, for a pull the person actually made.
 *
 * Not `isRefetching`. Every list here is also refetched by something else —
 * the inbox on a 20s poll and on every session frame, the settings lists on a
 * window focus — and binding the control to that made the spinner drop down on
 * its own, repeatedly, while nobody was touching the screen. A background read
 * is not a refresh; only a pull is.
 */
export function usePullRefresh(refetch: () => unknown): {
  refreshing: boolean;
  onRefresh: () => void;
} {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void Promise.resolve(refetch()).finally(() => setRefreshing(false));
  }, [refetch]);
  return { refreshing, onRefresh };
}
