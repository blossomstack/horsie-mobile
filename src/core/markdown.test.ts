import { describe, expect, it } from "vitest";
import { splitTaskLists } from "./markdown";

describe("splitTaskLists", () => {
  it("leaves prose with no task list as one block", () => {
    const blocks = splitTaskLists("Hello\n\n- a plain bullet\n- another");
    expect(blocks).toEqual([
      { kind: "markdown", text: "Hello\n\n- a plain bullet\n- another" },
    ]);
  });

  it("reads a checked and an unchecked box", () => {
    const blocks = splitTaskLists("- [x] done\n- [ ] not done");
    expect(blocks).toEqual([
      {
        kind: "tasks",
        items: [
          { checked: true, text: "done" },
          { checked: false, text: "not done" },
        ],
      },
    ]);
  });

  it("accepts an upper-case X and every bullet marker", () => {
    const blocks = splitTaskLists("* [X] one\n+ [ ] two\n- [x] three");
    expect(blocks[0]).toEqual({
      kind: "tasks",
      items: [
        { checked: true, text: "one" },
        { checked: false, text: "two" },
        { checked: true, text: "three" },
      ],
    });
  });

  it("keeps the prose on either side of a run", () => {
    const blocks = splitTaskLists("Before\n\n- [ ] a\n\nAfter");
    expect(blocks).toEqual([
      { kind: "markdown", text: "Before\n" },
      { kind: "tasks", items: [{ checked: false, text: "a" }] },
      { kind: "markdown", text: "After" },
    ]);
  });

  it("does not turn a plain bullet into an unchecked box", () => {
    // The reason the run has to end: drawing this as a checkbox would claim
    // the author wrote one.
    const blocks = splitTaskLists("- [ ] a task\n- just a bullet");
    expect(blocks).toEqual([
      { kind: "tasks", items: [{ checked: false, text: "a task" }] },
      { kind: "markdown", text: "- just a bullet" },
    ]);
  });

  it("leaves a checkbox inside a fence as code", () => {
    const source = "```md\n- [ ] shown, not kept\n```";
    expect(splitTaskLists(source)).toEqual([{ kind: "markdown", text: source }]);
  });

  it("holds a loose list together across a blank line", () => {
    const blocks = splitTaskLists("- [ ] a\n\n- [x] b");
    expect(blocks).toEqual([
      {
        kind: "tasks",
        items: [
          { checked: false, text: "a" },
          { checked: true, text: "b" },
        ],
      },
    ]);
  });

  it("keeps an indented task list, which is still a task list", () => {
    const blocks = splitTaskLists("  - [ ] nested");
    expect(blocks[0]).toEqual({
      kind: "tasks",
      items: [{ checked: false, text: "nested" }],
    });
  });

  it("answers with nothing for an empty source", () => {
    expect(splitTaskLists("")).toEqual([]);
  });
});
