import { useState } from "react";
import { Pressable, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";
import { GitBranch, Scissors } from "lucide-react-native";
import { Body, Mono } from "@/components/ui";
import { buildSegments, type Segment, type TurnGroup } from "@/core/segments";
import type { RenderedMessage } from "@/core/transcript";
import { hookLine } from "@/core/hookText";
import { isIOS, radii, space, type, useColors } from "@/theme";
import { Markdown } from "./Markdown";
import { Artifacts } from "./Artifacts";
import { ToolCall } from "./ToolCall";
import { WorkGroup } from "./WorkGroup";

/**
 * One entry in the recording.
 *
 * A run of assistant messages is one entry, not one per provider call: an
 * agent's trajectory through nine tools is one continuous piece of work, and
 * drawing it as nine rows is what buried the answer at the end of it.
 */
export function TranscriptRow({
  turn,
  live,
}: {
  turn: TurnGroup;
  /** The tail being written right now, when it belongs to this entry. */
  live?: { text: string };
}) {
  switch (turn.kind) {
    case "user":
      return <UserTurn msg={turn.msg} />;
    case "assistant":
      return <AssistantTurn msgs={turn.msgs} live={live} />;
    case "notice":
      return <Marker text={hookLine(turn.value.record)} />;
    case "compaction":
      return (
        <Marker
          icon="compaction"
          text={
            turn.value.covered === null
              ? `Compacted — ${turn.value.tokensBefore} → ${turn.value.tokensAfter} tokens`
              : `Compacted ${turn.value.covered} entries — ${turn.value.tokensBefore} → ${turn.value.tokensAfter} tokens`
          }
          detail={turn.value.summary}
        />
      );
    case "compaction-skipped":
      return (
        <Marker
          icon="compaction"
          text={`Nothing to compact — ${turn.value.contextTokens} tokens in context`}
        />
      );
    case "subSession":
      return <SubSessionMarker id={turn.value.id} seed={turn.value.seed} />;
  }
}

function UserTurn({ msg }: { msg: RenderedMessage }) {
  const c = useColors();
  return (
    <View
      style={{
        alignSelf: "flex-end",
        maxWidth: "88%",
        gap: space.sm,
        // A message the server has not confirmed yet is dimmed rather than
        // hidden: it was typed, and pretending otherwise loses it.
        opacity: msg.optimistic || msg.queued ? 0.55 : 1,
      }}
    >
      <Artifacts items={msg.artifacts} />
      {msg.text ? (
        <View
          // iOS keeps the bubble a neutral raised surface and lets the tint
          // mean "the agent needs you"; M3 tints what the person said, which
          // is its own convention and the reason for the notched corner.
          style={{
            backgroundColor: isIOS ? c.panelRaised : c.accentQuiet,
            borderRadius: 20,
            borderBottomRightRadius: isIOS ? 20 : 4,
            paddingHorizontal: isIOS ? 14 : space.lg,
            paddingVertical: isIOS ? 9 : space.md,
          }}
        >
          <Body
            style={{
              ...type.body,
              lineHeight: isIOS ? 23 : 24,
              color: isIOS ? c.legend : c.accentQuietInk,
            }}
          >
            {msg.text}
          </Body>
        </View>
      ) : null}
      {msg.queued ? (
        <Body role="micro" tone="faint" weight="400">
          queued
        </Body>
      ) : null}
    </View>
  );
}

function AssistantTurn({
  msgs,
  live,
}: {
  msgs: RenderedMessage[];
  live?: { text: string };
}) {
  const segments = buildSegments(msgs, live);
  return (
    <View style={{ gap: space.md }}>
      {segments.map((segment) => (
        <SegmentView key={segment.key} segment={segment} />
      ))}
    </View>
  );
}

function SegmentView({ segment }: { segment: Segment }) {
  switch (segment.kind) {
    case "text":
      return <Markdown>{segment.text}</Markdown>;
    case "work":
      return (
        <WorkGroup
          items={segment.items}
          live={segment.live}
          startedAtMs={segment.startedAtMs}
          endedAtMs={segment.endedAtMs}
        />
      );
    // Standalone, never inside a group. A pending question behind a fold is a
    // question nobody answers.
    case "ask":
      return <ToolCall call={segment.call} />;
    case "artifacts":
      return <Artifacts items={segment.artifacts} />;
  }
}

/** A thing that happened at a point in the transcript rather than a thing said. */
function Marker({
  icon,
  text,
  detail,
}: {
  icon?: "compaction";
  text: string;
  detail?: string;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => detail && setOpen((v) => !v)}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.rule }} />
        {icon === "compaction" ? <Scissors size={12} color={c.legendFaint} /> : null}
        <Body role="caption" tone="faint">
          {text}
        </Body>
        <View style={{ flex: 1, height: 1, backgroundColor: c.rule }} />
      </View>
      {open && detail ? (
        <View
          style={{
            backgroundColor: c.codeFill,
            borderRadius: radii.block,
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <Pressable onPress={() => navigation.navigate("Session", { id })}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          backgroundColor: c.accentQuiet,
          borderRadius: radii.block,
          padding: space.md,
        }}
      >
        <GitBranch size={14} color={c.accentQuietInk} />
        <Body role="subhead" weight="600" style={{ color: c.accentQuietInk }}>
          Branched a sub session
        </Body>
        <Body role="caption" tone="faint" numberOfLines={1} style={{ flex: 1 }}>
          {seed}
        </Body>
      </View>
    </Pressable>
  );
}
