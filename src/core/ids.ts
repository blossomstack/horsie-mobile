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
