/**
 * The path segment naming a session's primary agent, as opposed to a
 * subagent's uuid. Mirrors the server's own spelling.
 *
 * Here rather than beside the API client because `src/core` must not reach
 * React Native, and the client does — through `expo-secure-store`. A single
 * constant pulled the whole platform into a module that is meant to be
 * testable on its own, which is what made the ported tree tests fail to even
 * parse.
 */
export const MAIN_AGENT = "main";

/**
 * The server's dedicated "ask the user" tool, spelled as
 * `server/src/sessions/ask_tool.rs` spells it.
 *
 * A transcript has to be able to pick a question out of a run of tool calls:
 * everything else there can be folded away behind a tap, and a question that
 * folded away is one nobody answers.
 */
export const ASK_USER_TOOL = "ask_user";
