import { describe, expect, it } from "vitest";
import { flattenSession } from "./sessionTree";
import { SessionStatusKind, type SessionSummary, type SubSessionView } from "@/api/types";

const sub = (id: string, parent?: string): SubSessionView => ({
  id,
  parent,
  title: `sub ${id}`,
  status: "Idle",
  createdAtMs: 0,
  lastActivityMs: 0,
});

const session = (subSessions: SubSessionView[]): SessionSummary => ({
  id: "s1",
  name: "A session",
  status: SessionStatusKind.Idle,
  createdAt: 0,
  annotations: [],
  subSessions,
});

describe("flattenSession", () => {
  it("puts the session first and nests sub sessions under their parent", () => {
    const rows = flattenSession(session([sub("a"), sub("b", "a"), sub("c")]));
    expect(rows.map((r) => [r.agentId ?? "-", r.depth])).toEqual([
      ["-", 0],
      ["a", 1],
      ["b", 2],
      ["c", 1],
    ]);
  });

  it("addresses a sub session by its parent session id plus its own agent id", () => {
    const [, first] = flattenSession(session([sub("a")]));
    expect(first).toMatchObject({ sessionId: "s1", agentId: "a" });
  });

  it("keeps a sub session whose parent is missing rather than dropping it", () => {
    // A branch that vanished with no error would read as data loss; hanging it
    // off the session is a much smaller lie than an absent row.
    const rows = flattenSession(session([sub("orphan", "gone")]));
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ agentId: "orphan", depth: 1 });
  });

  it("truncates a parent cycle instead of recursing forever", () => {
    const rows = flattenSession(session([sub("a", "b"), sub("b", "a")]));
    // Neither is reachable from the root, so both are re-parented to it and
    // each is emitted once.
    expect(rows.map((r) => r.agentId)).toEqual([undefined, "a", "b"]);
  });
});
