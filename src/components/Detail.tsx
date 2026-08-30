import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { Body, Card, Mono, Pill, Row } from "@/components/ui";
import { space } from "@/theme";

/** The page every read-only detail screen is. */
export function DetailPage({ children }: { children: ReactNode }) {
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      {children}
      <Body tone="faint" size="sm">
        Read-only. This is edited in the web UI.
      </Body>
    </ScrollView>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Body tone="faint" size="xs" weight="700" style={{ letterSpacing: 0.8 }}>
        {title.toUpperCase()}
      </Body>
      {children}
    </View>
  );
}

/**
 * A labelled value.
 *
 * An absent value renders nothing at all rather than an empty row: a wall of
 * blank labels reads as a broken screen, and "this deployment did not set
 * that" is said better by the field's absence than by its emptiness.
 */
export function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <Row first>
      <View style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
        <Body tone="dim" size="sm" style={{ width: 108 }}>
          {label}
        </Body>
        <View style={{ flex: 1 }}>
          {mono ? <Mono>{String(value)}</Mono> : <Body>{String(value)}</Body>}
        </View>
      </View>
    </Row>
  );
}

/** A list of names as pills, or nothing when the list is empty. */
export function Pills({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Row first>
      <View style={{ gap: space.sm }}>
        <Body tone="dim" size="sm">
          {label}
        </Body>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
          {items.map((item) => (
            <Pill key={item} label={item} />
          ))}
        </View>
      </View>
    </Row>
  );
}

/** Prose the deployment wrote — instructions, a prompt. Kept monospace and
 * whole: truncating a prompt hides the part that explains the behaviour. */
export function Prose({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <Section title={label}>
      <Card style={{ padding: space.md }}>
        <Mono>{text}</Mono>
      </Card>
    </Section>
  );
}
