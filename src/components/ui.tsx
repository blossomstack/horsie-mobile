import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useColors, radii, space, text as textScale } from "@/theme";
import { ApiRequestError } from "@/api/errors";

/** Body copy. `tone` picks how loudly it speaks, not what colour it is. */
export function Body({
  children,
  tone = "normal",
  size = "base",
  weight,
  numberOfLines,
  style,
}: {
  children: ReactNode;
  tone?: "normal" | "dim" | "faint" | "accent" | "danger";
  size?: keyof typeof textScale;
  weight?: TextStyle["fontWeight"];
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}) {
  const c = useColors();
  const color =
    tone === "dim"
      ? c.legendDim
      : tone === "faint"
        ? c.legendFaint
        : tone === "accent"
          ? c.accent
          : tone === "danger"
            ? c.redInk
            : c.legend;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ color, fontSize: textScale[size], fontWeight: weight }, style]}
    >
      {children}
    </Text>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Body size="xxl" weight="700">
      {children}
    </Body>
  );
}

/** Machine output: a tool result, a log line, a path. */
export function Mono({
  children,
  size = "sm",
  numberOfLines,
}: {
  children: ReactNode;
  size?: keyof typeof textScale;
  numberOfLines?: number;
}) {
  const c = useColors();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={{
        color: c.legendDim,
        fontSize: textScale[size],
        fontFamily: monoFamily,
      }}
    >
      {children}
    </Text>
  );
}

export const monoFamily = "Menlo";

/** The surface a list or a form sits on. */
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: c.panel,
          borderRadius: radii.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.edge,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** One tappable line in a list. A rule marks the chrome between rows. */
export function Row({
  children,
  onPress,
  first,
}: {
  children: ReactNode;
  onPress?: () => void;
  first?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        backgroundColor: pressed && onPress ? c.panelRaised : "transparent",
        borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: c.edge,
      })}
    >
      {children}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  busy?: boolean;
}) {
  const c = useColors();
  const bg =
    variant === "primary" ? c.accent : variant === "danger" ? c.red : c.keycap;
  const ink =
    variant === "primary" ? c.accentInk : variant === "danger" ? c.accentInk : c.keycapInk;
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => ({
        backgroundColor: bg,
        opacity: off ? 0.5 : pressed ? 0.85 : 1,
        borderRadius: radii.md,
        paddingVertical: space.md,
        paddingHorizontal: space.lg,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: space.sm,
      })}
    >
      {busy ? <ActivityIndicator size="small" color={ink} /> : null}
      <Text style={{ color: ink, fontSize: textScale.base, fontWeight: "600" }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A small state marker — a session's status, a message's kind. */
export function Pill({ label, tone = "quiet" }: { label: string; tone?: "quiet" | "live" | "danger" | "ok" }) {
  const c = useColors();
  const [bg, ink] =
    tone === "live"
      ? [c.liveQuiet, c.liveInk]
      : tone === "danger"
        ? [c.redQuiet, c.redInk]
        : tone === "ok"
          ? [c.lampOkQuiet, c.lampOk]
          : [c.keycap, c.legendDim];
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: radii.sm,
        paddingHorizontal: space.sm,
        paddingVertical: 2,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: ink, fontSize: textScale.xs, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, gap: space.md }}>
      {children}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const c = useColors();
  return (
    <Centered>
      <ActivityIndicator color={c.accent} />
      {label ? <Body tone="dim">{label}</Body> : null}
    </Centered>
  );
}

export function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <Centered>
      <Body size="lg" weight="600" tone="dim">
        {title}
      </Body>
      {detail ? (
        <Body tone="faint" style={{ textAlign: "center" }}>
          {detail}
        </Body>
      ) : null}
    </Centered>
  );
}

/**
 * A failed read. Says what the server said — an `ApiError` envelope carries a
 * real sentence, and swallowing it for "Something went wrong" throws away the
 * only thing that would tell you what to do next.
 */
export function ReadError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof ApiRequestError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Unknown error";
  return (
    <Centered>
      <Body tone="danger" size="lg" weight="600">
        Could not load this
      </Body>
      <Body tone="dim" style={{ textAlign: "center" }}>
        {message}
      </Body>
      {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : null}
    </Centered>
  );
}
