import { useState } from "react";
import { Pressable, View } from "react-native";
import { Brain, ChevronDown, ChevronRight } from "lucide-react-native";
import { Body, Card, Mono } from "@/components/ui";
import type { WorkItem } from "@/core/segments";
import { duration } from "@/lib/time";
import { radii, space, useColors } from "@/theme";
import { ToolCall } from "./ToolCall";

/**
 * A run of work, as one line that opens.
 *
 * A phone screen holds about four of these expanded. An agent that thought
 * three times and called nine tools to answer one question pushed its answer
 * off the bottom of the screen entirely, so a run of more than one item is
 * summarised and folded by default. A single item renders bare — a fold over
 * one thing is chrome with nothing behind it.
 */
export function WorkGroup({
  items,
  live,
  startedAtMs,
  endedAtMs,
}: {
  items: WorkItem[];
  live: boolean;
  startedAtMs?: number;
  endedAtMs?: number;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;
  // A fold over one thing is chrome with nothing behind it, and the call is
  // the only place its own duration can be shown.
  if (items.length === 1) {
    return <WorkItemView item={items[0]} startedAtMs={startedAtMs} />;
  }

  const took =
    !live && startedAtMs !== undefined && endedAtMs !== undefined && endedAtMs > startedAtMs
      ? duration(endedAtMs - startedAtMs)
      : null;
  const running = live
    ? [...items].reverse().find((i) => i.kind === "tool" && i.call.running)
    : undefined;

  return (
    <View style={{ gap: space.sm }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}
      >
        {open ? (
          <ChevronDown size={14} color={c.legendFaint} />
        ) : (
          <ChevronRight size={14} color={c.legendFaint} />
        )}
        <Body size="sm" tone={live ? "accent" : "faint"} style={{ flex: 1 }} numberOfLines={1}>
          {running?.kind === "tool" ? `Running ${running.call.name}` : summarise(items, live)}
        </Body>
        {took ? (
          <Body size="xs" tone="faint">
            {took}
          </Body>
        ) : null}
      </Pressable>

      {open ? (
        // Indented behind a rule, so an opened group reads as the inside of the
        // line above it rather than as more transcript.
        <View
          style={{
            marginLeft: space.sm,
            paddingLeft: space.md,
            borderLeftWidth: 1,
            borderLeftColor: c.rule,
            gap: space.sm,
          }}
        >
          {items.map((item, i) => (
            <WorkItemView key={keyOf(item, i)} item={item} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** What the folded line has to read back. Every kind is counted: a summary that
 * mentioned only tools would say "ran 1 tool" while quietly holding three
 * finished subagents. */
function summarise(items: WorkItem[], live: boolean): string {
  const thought = items.some((i) => i.kind === "thinking");
  const tools = items.filter((i) => i.kind === "tool").length;
  const subagents = items.filter((i) => i.kind === "subagent").length;
  const parts: string[] = [];
  if (thought) parts.push("thought");
  if (tools > 0) parts.push(`ran ${tools} tool${tools === 1 ? "" : "s"}`);
  if (subagents > 0) {
    parts.push(`delegated to ${subagents} agent${subagents === 1 ? "" : "s"}`);
  }
  if (parts.length === 0) return live ? "Working" : "Worked";
  return parts.join(", ").replace(/^./, (ch) => ch.toUpperCase());
}

function keyOf(item: WorkItem, index: number): string {
  if (item.kind === "tool") return item.call.id;
  if (item.kind === "subagent") return `subagent:${item.result.subagentId}`;
  return `thinking:${index}`;
}

function WorkItemView({
  item,
  startedAtMs,
}: {
  item: WorkItem;
  /** Only ever passed for a lone call. Inside a group every call would be
   * measured from the same start, so each one would report the whole run. */
  startedAtMs?: number;
}) {
  const c = useColors();
  switch (item.kind) {
    case "tool":
      return <ToolCall call={item.call} startedAtMs={startedAtMs} />;
    case "thinking":
      return (
        <View
          style={{
            flexDirection: "row",
            gap: space.sm,
            backgroundColor: c.codeFill,
            borderRadius: radii.block,
            padding: space.md,
          }}
        >
          <Brain size={14} color={c.legendFaint} style={{ marginTop: 2 }} />
          <Body size="sm" tone="dim" style={{ flex: 1 }}>
            {item.text}
          </Body>
        </View>
      );
    case "subagent":
      return (
        <Card style={{ padding: space.md, gap: space.xs }}>
          <Body size="sm" weight="600">
            {item.result.title}
          </Body>
          <Mono size="xs">{item.result.status}</Mono>
          <Body size="sm" tone="dim" numberOfLines={6}>
            {item.result.text}
          </Body>
        </Card>
      );
  }
}
