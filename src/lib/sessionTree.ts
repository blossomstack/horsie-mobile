import type { SessionSummary, SubSessionView } from "@/api/types";

/** One line in the session list: a session, or a sub session under one. */
export interface SessionRow {
  /** Stable across renders and unique within the list. */
  key: string;
  /** The session to open. A sub session is addressed by its parent session's
   * id plus its own agent id, which is what every agent-scoped route wants. */
  sessionId: string;
  /** `undefined` for the session itself; the sub session's id otherwise. */
  agentId?: string;
  title: string;
  depth: number;
  session: SessionSummary;
  sub?: SubSessionView;
}

/**
 * Flatten a session and its sub sessions into rows, depth-first.
 *
 * The server hands sub sessions back flat and parent-linked rather than
 * already nested, so nesting to any depth is the client's job. A sub session
 * whose `parent` names something absent from the list is still shown, hung off
 * the session itself: dropping it would make a branch vanish with no error,
 * and a slightly wrong indent is a much smaller lie than a missing row.
 */
export function flattenSession(session: SessionSummary): SessionRow[] {
  const byParent = new Map<string | undefined, SubSessionView[]>();
  for (const sub of session.subSessions) {
    const siblings = byParent.get(sub.parent);
    if (siblings) siblings.push(sub);
    else byParent.set(sub.parent, [sub]);
  }

  const rows: SessionRow[] = [
    {
      key: session.id,
      sessionId: session.id,
      title: session.name ?? "Untitled session",
      depth: 0,
      session,
    },
  ];

  const seen = new Set<string>();
  const walk = (parent: string | undefined, depth: number) => {
    for (const sub of byParent.get(parent) ?? []) {
      if (seen.has(sub.id)) continue;
      seen.add(sub.id);
      rows.push({
        key: `${session.id}:${sub.id}`,
        sessionId: session.id,
        agentId: sub.id,
        title: sub.title,
        depth,
        session,
        sub,
      });
      walk(sub.id, depth + 1);
    }
  };

  walk(undefined, 1);

  // Anything the walk could not reach from the session — a `parent` naming a
  // sub session that is not in the list, or a cycle, where every node has a
  // parent and none is rooted. Hung off the session at depth 1 rather than
  // dropped: a branch that vanished with no error reads as data loss, and a
  // slightly wrong indent is a far smaller lie than a missing row.
  for (const sub of session.subSessions) {
    if (seen.has(sub.id)) continue;
    seen.add(sub.id);
    rows.push({
      key: `${session.id}:${sub.id}`,
      sessionId: session.id,
      agentId: sub.id,
      title: sub.title,
      depth: 1,
      session,
      sub,
    });
    walk(sub.id, 2);
  }

  return rows;
}

export function flattenSessions(sessions: SessionSummary[]): SessionRow[] {
  return sessions.flatMap(flattenSession);
}
