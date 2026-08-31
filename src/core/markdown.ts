/**
 * Pulling task lists out of a markdown source before it is parsed.
 *
 * `react-native-marked` has no task-list renderer at all: its parser drops
 * `task` and `checked` on the way to `listItem`, so by the time a renderer is
 * called the checkbox is unrecoverable. There is nothing to override.
 *
 * So the state is read here, from the source, where it still exists — and the
 * task block is rendered by us rather than by the library. Everything else
 * goes to the parser untouched, which is what keeps this to one narrow rule
 * rather than a second markdown implementation.
 *
 * Pure and separate from the component so the rule can be tested against real
 * agent prose: an ordinary bulleted list that happens to start with a bracket
 * must not become a checkbox, and a checkbox in a fenced block must stay text.
 */

export interface TaskLine {
  checked: boolean;
  text: string;
}

export type MarkdownBlock =
  | { kind: "markdown"; text: string }
  | { kind: "tasks"; items: TaskLine[] };

/** `- [ ] text`, `* [x] text`, `+ [X] text`, with any leading indent. */
const TASK = /^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/;

/** The opening or closing line of a fenced code block. */
const FENCE = /^\s*(```|~~~)/;

/**
 * Split a source into the task-list runs and everything between them.
 *
 * A run is consecutive task lines and nothing else — one non-task line ends it,
 * because a list that mixes checkboxes and plain bullets is two lists as far as
 * the reader is concerned, and drawing the plain ones as unchecked boxes would
 * claim something the author did not write.
 */
export function splitTaskLists(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = source.split("\n");

  let prose: string[] = [];
  let tasks: TaskLine[] = [];
  // A checkbox inside a fence is a checkbox someone is *showing*, not one they
  // are keeping. Tracked rather than stripped, so the fence renders whole.
  let fenced = false;

  const flushProse = () => {
    if (prose.length === 0) return;
    const text = prose.join("\n");
    if (text.trim().length > 0) blocks.push({ kind: "markdown", text });
    prose = [];
  };
  const flushTasks = () => {
    if (tasks.length === 0) return;
    blocks.push({ kind: "tasks", items: tasks });
    tasks = [];
  };

  for (const line of lines) {
    if (FENCE.test(line)) fenced = !fenced;

    const match = fenced ? null : TASK.exec(line);
    if (match) {
      flushProse();
      tasks.push({ checked: match[1] !== " ", text: match[2] });
      continue;
    }

    // A blank line inside a run keeps it open; anything else closes it. That is
    // what lets a loose list — one with a blank line between items — stay one
    // list rather than becoming one block per item.
    if (tasks.length > 0 && line.trim().length === 0) continue;

    flushTasks();
    prose.push(line);
  }

  flushProse();
  flushTasks();
  return blocks;
}
