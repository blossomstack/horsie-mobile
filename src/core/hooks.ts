import type { HookRecord } from "@/api/types";

/**
 * The call a record guarded, or `null` when it guarded none.
 *
 * The split every rendering decision hangs off: a record with no call cannot
 * attach to a tool card, so it becomes a transcript row of its own.
 *
 * Exhaustive with no `default`, so a new hook event is a type error here
 * rather than a record that silently stops being drawn.
 */
export function toolScope(r: HookRecord): { tool: string; toolCallId: string } | null {
  const a = r.action;
  switch (a.event) {
    case "PreToolUse":
    case "PostToolUse":
    case "PostToolUseFailure":
      return a.value.call;
    // A batch names every call it covered, so no single one owns it; and a
    // compaction is not a tool call, so neither of those attaches to a card.
    case "PostToolBatch":
    case "SessionStart":
    case "SessionEnd":
    case "UserPromptSubmit":
    case "UserPromptExpansion":
    case "Stop":
    case "StopFailure":
    case "SubagentStart":
    case "SubagentStop":
    case "TaskCreated":
    case "TaskCompleted":
    case "Notification":
    case "PreCompact":
    case "PostCompact":
    case "CwdChanged":
      return null;
  }
}
