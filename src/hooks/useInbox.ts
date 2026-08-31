import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type InboxScope } from "@/api/client";
import { useConnection } from "@/state/connection";

export const inboxKey = (project: string | null, scope: InboxScope) =>
  ["inbox", project, scope] as const;

/**
 * A page of the inbox.
 *
 * Polled rather than streamed: the server publishes no SSE feed for the inbox
 * (a mailbox is not a stream, and a feed would need a cluster-wide counter the
 * session list itself does not have), so the list refetches on a slow interval
 * and whenever the app comes back to the foreground.
 *
 * The scope is part of the key, so each one is a page of its own — and a page
 * nobody has read yet has no data, which is what used to blank the whole
 * screen for a spinner every time somebody tapped Open/Unread/All. The
 * previous scope's rows are held until the new ones land instead; the screen
 * dims them so the stale ones are not read as the answer.
 */
export function useInbox(scope: InboxScope = "all") {
  const { project } = useConnection();
  return useQuery({
    queryKey: inboxKey(project, scope),
    queryFn: () => api.inbox.list(scope),
    enabled: project !== null,
    refetchInterval: 20_000,
    placeholderData: keepPreviousData,
  });
}

/**
 * The two numbers a badge needs.
 *
 * Reads the same `all` page every other caller reads, so the tab badge and the
 * list cannot disagree — and `list()` is three separate reads on the server,
 * so a page taken across a write can hold a row whose state contradicts its
 * own counts. Anything that waits on a change must watch the row, never the
 * count.
 */
export function useInboxCounts() {
  const { data } = useInbox("all");
  return { unread: data?.unread ?? 0, openAsks: data?.openAsks ?? 0 };
}

/** Drop every cached inbox page — after a reply, a read, or a delete. */
export function useInvalidateInbox() {
  const client = useQueryClient();
  const { project } = useConnection();
  return () => client.invalidateQueries({ queryKey: ["inbox", project] });
}
