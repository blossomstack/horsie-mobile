import { useState } from "react";
import { Pressable, View } from "react-native";
import { ChevronDown, ChevronRight, CircleAlert, Loader } from "lucide-react-native";
import { Body, Mono } from "@/components/ui";
import type { RenderedToolCall } from "@/core/transcript";
import { duration } from "@/lib/time";
import { radii, space, useColors } from "@/theme";

/** How much of a tool result to show before it has to be asked for. */
const PREVIEW_LINES = 6;

export function ToolCall({ call, startedAtMs }: { call: RenderedToolCall; startedAtMs?: number }) {
  const c = useColors();
  const [open, setOpen] = useState(false);

  const output = call.output ?? "";
  const lines = output.split("\n");
  const truncated = !open && lines.length > PREVIEW_LINES;
  const shown = truncated ? lines.slice(0, PREVIEW_LINES).join("\n") : output;

  const took =
    call.endedAtMs && startedAtMs && call.endedAtMs > startedAtMs
      ? duration(call.endedAtMs - startedAtMs)
      : null;

  return (
    <View
      style={{
        backgroundColor: c.screen,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: call.isError ? c.redQuiet : c.edge,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          padding: space.md,
        }}
      >
        {call.running ? (
          <Loader size={14} color={c.live} />
        ) : call.isError ? (
          <CircleAlert size={14} color={c.redInk} />
        ) : open ? (
          <ChevronDown size={14} color={c.legendFaint} />
        ) : (
          <ChevronRight size={14} color={c.legendFaint} />
        )}
        <Body size="sm" weight="600" style={{ flex: 1 }} numberOfLines={1}>
          {call.name}
        </Body>
        {call.hooks.length > 0 ? (
          <Body size="xs" tone="faint">
            {call.hooks.length} hook{call.hooks.length === 1 ? "" : "s"}
          </Body>
        ) : null}
        {took ? (
          <Body size="xs" tone="faint">
            {took}
          </Body>
        ) : null}
      </Pressable>

      {open ? (
        <View style={{ paddingHorizontal: space.md, paddingBottom: space.md, gap: space.sm }}>
          <Mono size="xs">{JSON.stringify(call.input, null, 2)}</Mono>
        </View>
      ) : null}

      {output ? (
        <View
          style={{
            paddingHorizontal: space.md,
            paddingBottom: space.md,
            gap: space.xs,
          }}
        >
          <Mono size="xs">{shown}</Mono>
          {truncated ? (
            <Pressable onPress={() => setOpen(true)}>
              <Body size="xs" tone="accent">
                {lines.length - PREVIEW_LINES} more lines
              </Body>
            </Pressable>
          ) : null}
        </View>
      ) : call.running ? (
        <View style={{ paddingHorizontal: space.md, paddingBottom: space.md }}>
          <Body size="xs" tone="dim">
            running…
          </Body>
        </View>
      ) : null}
    </View>
  );
}
