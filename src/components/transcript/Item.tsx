import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Brain, GitBranch, Scissors } from "lucide-react-native";
import { Body, Card, Mono } from "@/components/ui";
import type { TranscriptItem } from "@/core/transcript";
import { hookLine } from "@/core/hookText";
import { radii, space, useColors } from "@/theme";
import { Markdown } from "./Markdown";
import { Artifacts } from "./Artifacts";
import { ToolCall } from "./ToolCall";

export function TranscriptRow({ item }: { item: TranscriptItem }) {
  switch (item.kind) {
    case "message":
      return <MessageRow value={item.value} />;
    case "notice":
      return <Marker icon="hook" text={hookLine(item.value.record)} />;
    case "compaction":
      return (
        <Marker
          icon="compaction"
          text={
            item.value.covered === null
              ? `Compacted — ${item.value.tokensBefore} → ${item.value.tokensAfter} tokens`
              : `Compacted ${item.value.covered} entries — ${item.value.tokensBefore} → ${item.value.tokensAfter} tokens`
          }
          detail={item.value.summary}
        />
      );
    case "compaction-skipped":
      return (
        <Marker
          icon="compaction"
          text={`Nothing to compact — ${item.value.contextTokens} tokens in context`}
        />
      );
    case "subSession":
      return <SubSessionMarker id={item.value.id} seed={item.value.seed} />;
  }
}

function MessageRow({ value }: { value: Extract<TranscriptItem, { kind: "message" }>["value"] }) {
  const c = useColors();
  const [showThinking, setShowThinking] = useState(false);
  const user = value.role === "User";

  return (
    <View
      style={{
        alignSelf: user ? "flex-end" : "stretch",
        maxWidth: user ? "88%" : undefined,
        gap: space.sm,
        // A message the server has not confirmed yet is dimmed rather than
        // hidden: it was typed, and pretending otherwise loses it.
        opacity: value.optimistic || value.queued ? 0.55 : 1,
      }}
    >
      {value.thinking.length > 0 ? (
        <Pressable onPress={() => setShowThinking((v) => !v)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Brain size={14} color={c.legendFaint} />
            <Body size="xs" tone="faint">
              {showThinking ? "hide thinking" : `thinking (${value.thinking.length})`}
            </Body>
          </View>
        </Pressable>
      ) : null}

      {showThinking
        ? value.thinking.map((t, i) => (
            <View
              key={i}
              style={{
                backgroundColor: c.screen,
                borderRadius: radii.md,
                padding: space.md,
              }}
            >
              <Body size="sm" tone="dim">
                {t}
              </Body>
            </View>
          ))
        : null}

      {value.text ? (
        user ? (
          <View
            style={{
              backgroundColor: c.panelRaised,
              borderRadius: radii.lg,
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
            }}
          >
            <Body>{value.text}</Body>
          </View>
        ) : (
          <Markdown>{value.text}</Markdown>
        )
      ) : null}

      <Artifacts items={value.artifacts} />

      {value.toolCalls.map((call) => (
        <ToolCall key={call.id} call={call} startedAtMs={value.startedAtMs} />
      ))}

      {value.subagentResults.map((sub) => (
        <Card key={sub.subagentId} style={{ padding: space.md, gap: space.xs }}>
          <Body size="sm" weight="600">
            {sub.title}
          </Body>
          <Body size="sm" tone="dim" numberOfLines={6}>
            {sub.text}
          </Body>
        </Card>
      ))}

      {value.queued ? (
        <Body size="xs" tone="faint">
          queued
        </Body>
      ) : null}
    </View>
  );
}

/** A thing that happened at a point in the transcript rather than a thing said. */
function Marker({
  icon,
  text,
  detail,
}: {
  icon: "hook" | "compaction";
  text: string;
  detail?: string;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => detail && setOpen((v) => !v)}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.rule }} />
        {icon === "compaction" ? (
          <Scissors size={12} color={c.legendFaint} />
        ) : null}
        <Body size="xs" tone="faint">
          {text}
        </Body>
        <View style={{ flex: 1, height: 1, backgroundColor: c.rule }} />
      </View>
      {open && detail ? (
        <View
          style={{
            backgroundColor: c.screen,
            borderRadius: radii.md,
            padding: space.md,
            marginTop: space.sm,
          }}
        >
          <Mono size="xs">{detail}</Mono>
        </View>
      ) : null}
    </Pressable>
  );
}

function SubSessionMarker({ id, seed }: { id: string; seed: string }) {
  const c = useColors();
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(`/session/${id}`)}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          backgroundColor: c.accentQuiet,
          borderRadius: radii.md,
          padding: space.md,
        }}
      >
        <GitBranch size={14} color={c.accent} />
        <Body size="sm" tone="accent" weight="600">
          Branched a sub session
        </Body>
        <Body size="xs" tone="faint">
          {seed}
        </Body>
      </View>
    </Pressable>
  );
}
