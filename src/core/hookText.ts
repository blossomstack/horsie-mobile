import type { HookRecord } from "@/api/types";

/**
 * One line describing what a hook did, for a transcript row.
 *
 * Deliberately much smaller than the web client's `hookSummary`: that one is
 * translated and distinguishes a dozen outcomes for a wide panel. Here the row
 * is a single line between two rules, so it says which hook fired and whether
 * it intervened — anything more would not fit and would not be read.
 */
export function hookLine(record: HookRecord): string {
  const event = record.action.event;
  // `halt` is the only outcome worth a row of its own: a hook that let the
  // call through changed nothing the reader can act on.
  return record.halt ? `${record.plugin}: ${event} halted this` : `${record.plugin}: ${event}`;
}
