import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ChevronDown, ChevronRight, CircleAlert, Loader } from "lucide-react-native";
import { Body, Mono, TextAction } from "@/components/ui";
import type { RenderedToolCall } from "@/core/transcript";
import { duration } from "@/lib/time";
import { isIOS, radii, space, useColors } from "@/theme";
import { Artifacts } from "./Artifacts";

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
        backgroundColor: c.panelRaised,
        borderRadius: radii.block,
        borderWidth: isIOS ? StyleSheet.hairlineWidth : 1,
        borderColor: call.isError ? c.red : c.edge,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          paddingHorizontal: space.md,
          paddingVertical: 11,
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
        <Body role="subhead" weight="600" style={{ flex: 1 }} numberOfLines={1}>
          {call.name}
        </Body>
        {call.hooks.length > 0 ? (
          <Body role="caption" tone="faint">
            {call.hooks.length} hook{call.hooks.length === 1 ? "" : "s"}
          </Body>
        ) : null}
        {took ? (
          <Body role="caption" tone="faint">
            {took}
          </Body>
        ) : null}
      </Pressable>

      {open ? (
        <View style={{ paddingHorizontal: space.md, paddingBottom: space.md, gap: space.sm }}>
          <Mono size="xs">{JSON.stringify(call.input, null, 2)}</Mono>
        </View>
      ) : null}

      {call.artifacts.length > 0 ? (
        <View style={{ paddingHorizontal: space.md, paddingBottom: space.md }}>
          <Artifacts items={call.artifacts} />
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
            <TextAction
              role="caption"
              label={`${lines.length - PREVIEW_LINES} more lines`}
              onPress={() => setOpen(true)}
            />
          ) : null}
        </View>
      ) : call.running ? (
        <View style={{ paddingHorizontal: space.md, paddingBottom: space.md }}>
          <Body role="caption" tone="dim">
            running…
          </Body>
        </View>
      ) : null}
    </View>
  );
}
