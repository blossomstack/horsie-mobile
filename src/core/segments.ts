import { ASK_USER_TOOL } from "./ids";
import type {
  RenderedCompaction,
  RenderedCompactionSkip,
  RenderedHookNotice,
  RenderedMessage,
  RenderedSubAgent,
  RenderedSubSession,
  RenderedToolCall,
  TranscriptItem,
} from "./transcript";

/**
 * Turning a flat log into the shape a reader can take in.
 *
 * Two passes, ported from the horsie web client (`components/Transcript.tsx`
 * and `lib/transcriptSegments.ts`) so the two clients group a transcript the
 * same way rather than each inventing an order. `groupTurns` decides what one
 * entry in the recording is; `buildSegments` decides what is *inside* one, and
 * is where a run of thinking and tool calls becomes a single collapsed row.
 *
 * Without it, an agent that thought four times and called nine tools to answer
 * one question filled a phone screen thirteen times over, and the answer was
 * off the bottom of it.
 */

/** One thing inside a run of work: a thought, a tool call, or a subagent that
 * came back. */
export type WorkItem =
  | { kind: "thinking"; text: string }
  | { kind: "tool"; call: RenderedToolCall }
  | { kind: "subagent"; result: RenderedSubAgent };

export type Segment =
  | { kind: "text"; key: string; text: string; streaming?: boolean }
  | {
      kind: "work";
      key: string;
      items: WorkItem[];
      /** Still going: something in here has not finished. */
      live: boolean;
      /** The server-stamped span this work took, when known: from the earliest
       * provider call that produced it to the last tool that answered. Absent
       * for work that is still live, which has no end stamp yet. */
      startedAtMs?: number;
      endedAtMs?: number;
    }
  /** A question put to the person. Never folded into a group: a pending one
   * must not be hidden behind a tap, and an answered one is the record that
   * somebody was asked. */
  | { kind: "ask"; key: string; call: RenderedToolCall }
  /** Pictures and documents a message carried. Its own segment rather than a
   * field on `text`, because a message can attach one and say nothing. */
  | { kind: "artifacts"; key: string; artifacts: RenderedMessage["artifacts"] };

/** Whether a tool call is a question put to the user. The name answers it, for
 * every kind of agent. */
export function isAskCall(name: string): boolean {
  return name === ASK_USER_TOOL;
}

/**
 * Flatten a turn's messages into text / grouped-work / question / attachment
 * segments.
 *
 * Consecutive thinking blocks and ordinary tool calls collapse into one `work`
 * segment — across message boundaries, as long as no text, question or
 * attachment interrupts them. Those three break the run because they are the
 * things a reader is actually following, and a group that swallowed them would
 * hide the answer inside a summary of the work that produced it.
 *
 * `live` is the not-yet-finalized tail of the turn being written now.
 */
export function buildSegments(
  msgs: RenderedMessage[],
  live?: { text: string },
): Segment[] {
  const segments: Segment[] = [];
  let work: WorkItem[] = [];
  let seq = 0;
  let workStart: number | undefined;
  let workEnd: number | undefined;

  const extend = (start?: number, end?: number) => {
    if (start !== undefined) workStart = Math.min(workStart ?? start, start);
    if (end !== undefined) workEnd = Math.max(workEnd ?? end, end);
  };

  const flushWork = () => {
    if (work.length > 0) {
      // Live is a property of the work, not of the moment: a call with no
      // result yet is one the reader is still waiting on, whatever else has
      // happened since.
      const running = work.some((i) => i.kind === "tool" && i.call.running);
      segments.push({
        kind: "work",
        key: `work${seq++}`,
        items: work,
        live: running,
        startedAtMs: workStart,
        endedAtMs: running ? undefined : workEnd,
      });
      work = [];
    }
    workStart = undefined;
    workEnd = undefined;
  };

  for (const m of msgs) {
    // A subagent carries its own span — it ran outside this turn entirely, so
    // the message's stamps say nothing about how long the work took.
    for (const r of m.subagentResults) {
      work.push({ kind: "subagent", result: r });
      if (r.spawnedAtMs > 0 && r.endedAtMs > 0) extend(r.spawnedAtMs, r.endedAtMs);
    }
    // The message's own span bounds whatever it contributed: thinking happened
    // during the provider call, and its tool calls were issued at the end of it.
    if (m.thinking.length > 0 || m.toolCalls.length > 0) {
      extend(m.startedAtMs ?? m.createdAtMs, m.createdAtMs);
    }
    for (const t of m.thinking) work.push({ kind: "thinking", text: t });
    // Ahead of the message's own text: an attachment is what the sentence
    // under it is about, and a caption reads after the thing it captions.
    if (m.artifacts.length > 0) {
      flushWork();
      segments.push({
        kind: "artifacts",
        key: `artifacts${seq++}`,
        artifacts: m.artifacts,
      });
    }
    if (m.text) {
      flushWork();
      segments.push({ kind: "text", key: `text${seq++}`, text: m.text });
    }
    for (const call of m.toolCalls) {
      if (isAskCall(call.name)) {
        flushWork();
        segments.push({ kind: "ask", key: `ask${seq++}`, call });
      } else {
        work.push({ kind: "tool", call });
        extend(undefined, call.endedAtMs);
      }
    }
  }

  flushWork();
  if (live?.text) {
    segments.push({
      kind: "text",
      key: `text${seq++}`,
      text: live.text,
      streaming: true,
    });
  }
  return segments;
}

/**
 * One entry in the recording.
 *
 * Consecutive assistant messages are one entry: an agent's multi-step
 * trajectory is one continuous thread of work, not a series of separate
 * replies. A user message always starts a fresh one.
 */
export type TurnGroup =
  | { kind: "user"; id: string; msg: RenderedMessage }
  | { kind: "assistant"; id: string; msgs: RenderedMessage[] }
  // Never folded into an assistant turn: a plugin acting *around* the session
  // is not something the agent said.
  | { kind: "notice"; id: string; value: RenderedHookNotice }
  // A boundary between working sets. Always breaks the thread: the messages
  // either side belong to different ones, and running them together would read
  // as one exchange.
  | { kind: "compaction"; id: string; value: RenderedCompaction }
  // A `/compact` that folded nothing. Nobody said it, and the thread does *not*
  // break — the working set is exactly what it was.
  | { kind: "compaction-skipped"; id: string; value: RenderedCompactionSkip }
  // Where a session branched off. Not something anyone said, and not a break
  // either: this session carried on, and this marks the point another one left.
  | { kind: "subSession"; id: string; value: RenderedSubSession };

export function groupTurns(items: TranscriptItem[]): TurnGroup[] {
  const turns: TurnGroup[] = [];
  const intoAssistant = (m: RenderedMessage) => {
    const last = turns[turns.length - 1];
    if (last?.kind === "assistant") last.msgs.push(m);
    else turns.push({ kind: "assistant", id: m.id, msgs: [m] });
  };

  for (const item of items) {
    switch (item.kind) {
      case "notice":
        turns.push({ kind: "notice", id: `notice:${item.value.id}`, value: item.value });
        continue;
      case "subSession":
        turns.push({
          kind: "subSession",
          id: `subSession:${item.value.id}`,
          value: item.value,
        });
        continue;
      case "compaction":
        turns.push({
          kind: "compaction",
          id: `compaction:${item.value.seq}`,
          value: item.value,
        });
        continue;
      case "compaction-skipped":
        // Keyed by time: nothing was written to the log this could take a seq
        // from, and two of them a millisecond apart is not a thing that
        // happens — a `/compact` is a turn, and turns are serial.
        turns.push({
          kind: "compaction-skipped",
          id: `compact-skipped:${item.value.atMs}`,
          value: item.value,
        });
        continue;
      case "message":
        break;
    }

    const m = item.value;
    if (m.role === "User") {
      // A subagent's result rides a user message because the providers demand
      // it, but it is the agent's own work landing — not something the person
      // said. It joins the assistant thread, and only what was actually typed
      // gets a bubble. A turn carrying results alone gets no bubble at all.
      if (m.subagentResults.length > 0) {
        intoAssistant({
          ...m,
          id: `${m.id}:sub`,
          text: "",
          thinking: [],
          toolCalls: [],
          // Left to the user bubble below, which is where they were attached.
          artifacts: [],
        });
      }
      // An attachment counts as something said: a picture with no text is a
      // message, and dropping it here left it nowhere on screen.
      if (m.text || m.artifacts.length > 0) {
        turns.push({ kind: "user", id: `user:${m.id}`, msg: m });
      }
      continue;
    }
    intoAssistant(m);
  }
  return turns;
}
