import { describe, expect, it } from "vitest";
import { buildSegments, groupTurns, type Segment, type TurnGroup } from "./segments";
import type {
  RenderedMessage,
  RenderedSubAgent,
  RenderedToolCall,
  TranscriptItem,
} from "./transcript";

/// What one entry in the recording is, and what is inside it. Every case here
/// is a way the flat list used to read wrong on a phone screen: a run of tool
/// calls that filled it, a question buried in that run, an answer separated
/// from the work that produced it.

function msg(over: Partial<RenderedMessage> & { id: string }): RenderedMessage {
  return {
    role: "Assistant",
    text: "",
    thinking: [],
    toolCalls: [],
    subagentResults: [],
    artifacts: [],
    ...over,
  };
}

function tool(over: Partial<RenderedToolCall> & { id: string }): RenderedToolCall {
  return {
    name: "bash",
    input: {},
    running: false,
    hooks: [],
    artifacts: [],
    ...over,
  };
}

function sub(id: string, spawnedAtMs = 0, endedAtMs = 0): RenderedSubAgent {
  return { subagentId: id, title: id, status: "completed", text: "", spawnedAtMs, endedAtMs };
}

const message = (m: RenderedMessage): TranscriptItem => ({ kind: "message", value: m });
const kinds = (segments: Segment[]) => segments.map((s) => s.kind);
const workItems = (segments: Segment[]) =>
  segments.flatMap((s) => (s.kind === "work" ? s.items.map((i) => i.kind) : []));

describe("buildSegments", () => {
  it("collapses a run of thinking and tool calls into one group", () => {
    const segments = buildSegments([
      msg({ id: "a", thinking: ["one"], toolCalls: [tool({ id: "t1" })] }),
      msg({ id: "b", thinking: ["two"], toolCalls: [tool({ id: "t2" })] }),
    ]);
    expect(kinds(segments)).toEqual(["work"]);
    expect(workItems(segments)).toEqual(["thinking", "tool", "thinking", "tool"]);
  });

  it("breaks the run where the agent said something", () => {
    const segments = buildSegments([
      msg({ id: "a", toolCalls: [tool({ id: "t1" })] }),
      msg({ id: "b", text: "here is what I found" }),
      msg({ id: "c", toolCalls: [tool({ id: "t2" })] }),
    ]);
    expect(kinds(segments)).toEqual(["work", "text", "work"]);
  });

  // The whole point of the split: a question a tap could hide is a question
  // nobody answers, and the run either side of it still groups.
  it("never folds a question into a group", () => {
    const segments = buildSegments([
      msg({
        id: "a",
        toolCalls: [
          tool({ id: "t1" }),
          tool({ id: "t2", name: "ask_user" }),
          tool({ id: "t3" }),
        ],
      }),
    ]);
    expect(kinds(segments)).toEqual(["work", "ask", "work"]);
  });

  it("puts an attachment ahead of the sentence about it", () => {
    const segments = buildSegments([
      msg({ id: "a", text: "have a look", artifacts: [{ id: "art" }] as never }),
    ]);
    expect(kinds(segments)).toEqual(["artifacts", "text"]);
  });

  it("groups a subagent result with the work around it", () => {
    const segments = buildSegments([
      msg({ id: "a", subagentResults: [sub("s1")], toolCalls: [tool({ id: "t1" })] }),
    ]);
    expect(workItems(segments)).toEqual(["subagent", "tool"]);
  });

  it("reports a group as live while a call in it has no result", () => {
    const segments = buildSegments([
      msg({ id: "a", toolCalls: [tool({ id: "t1", running: true })] }),
    ]);
    expect(segments[0]).toMatchObject({ kind: "work", live: true });
    // A span with no end is what a duration must not be computed from.
    expect((segments[0] as { endedAtMs?: number }).endedAtMs).toBeUndefined();
  });

  it("spans a finished group from the first provider call to the last answer", () => {
    const segments = buildSegments([
      msg({
        id: "a",
        startedAtMs: 100,
        createdAtMs: 200,
        thinking: ["mm"],
        toolCalls: [tool({ id: "t1", endedAtMs: 900 })],
      }),
    ]);
    expect(segments[0]).toMatchObject({ startedAtMs: 100, endedAtMs: 900 });
  });

  it("counts a subagent's own span, not the turn it landed in", () => {
    const segments = buildSegments([
      msg({ id: "a", startedAtMs: 500, createdAtMs: 600, subagentResults: [sub("s1", 10, 20)] }),
    ]);
    expect(segments[0]).toMatchObject({ startedAtMs: 10, endedAtMs: 20 });
  });

  it("puts the tail being written now last", () => {
    const segments = buildSegments(
      [msg({ id: "a", toolCalls: [tool({ id: "t1" })] })],
      { text: "so far" },
    );
    expect(kinds(segments)).toEqual(["work", "text"]);
    expect(segments[1]).toMatchObject({ streaming: true, text: "so far" });
  });
});

describe("groupTurns", () => {
  const shapes = (turns: TurnGroup[]) => turns.map((t) => t.kind);

  it("runs consecutive assistant messages together", () => {
    const turns = groupTurns([
      message(msg({ id: "a" })),
      message(msg({ id: "b" })),
      message(msg({ id: "c" })),
    ]);
    expect(shapes(turns)).toEqual(["assistant"]);
    expect(turns[0]).toMatchObject({ msgs: [{ id: "a" }, { id: "b" }, { id: "c" }] });
  });

  it("starts a fresh entry at every user message", () => {
    const turns = groupTurns([
      message(msg({ id: "a" })),
      message(msg({ id: "u", role: "User", text: "and now?" })),
      message(msg({ id: "b" })),
    ]);
    expect(shapes(turns)).toEqual(["assistant", "user", "assistant"]);
  });

  // A subagent's result rides a user message because the providers demand it.
  // It is the agent's own work landing, so it must not draw a user bubble.
  it("keeps a subagent result out of the person's bubble", () => {
    const turns = groupTurns([
      message(msg({ id: "a" })),
      message(msg({ id: "u", role: "User", subagentResults: [sub("s1")] })),
    ]);
    expect(shapes(turns)).toEqual(["assistant"]);
    expect(turns[0]).toMatchObject({ msgs: [{ id: "a" }, { id: "u:sub" }] });
  });

  it("gives a bubble to a user message that only attached something", () => {
    const turns = groupTurns([
      message(msg({ id: "u", role: "User", artifacts: [{ id: "art" }] as never })),
    ]);
    expect(shapes(turns)).toEqual(["user"]);
  });

  it("drops a user message that neither said nor carried anything", () => {
    const turns = groupTurns([message(msg({ id: "u", role: "User" }))]);
    expect(turns).toEqual([]);
  });

  it("breaks the thread at a compaction and not at a skipped one", () => {
    const boundary = groupTurns([
      message(msg({ id: "a" })),
      { kind: "compaction", value: { seq: 7 } } as TranscriptItem,
      message(msg({ id: "b" })),
    ]);
    expect(shapes(boundary)).toEqual(["assistant", "compaction", "assistant"]);
  });

  it("gives every entry a key of its own", () => {
    const turns = groupTurns([
      message(msg({ id: "a" })),
      { kind: "notice", value: { id: "h1" } } as TranscriptItem,
      { kind: "subSession", value: { id: "s1" } } as TranscriptItem,
      { kind: "compaction", value: { seq: 3 } } as TranscriptItem,
      { kind: "compaction-skipped", value: { atMs: 42 } } as TranscriptItem,
    ]);
    expect(new Set(turns.map((t) => t.id)).size).toBe(turns.length);
  });
});
