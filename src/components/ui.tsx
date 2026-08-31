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
import { Check } from "lucide-react-native";
import {
  isIOS,
  monoFamily,
  radii,
  space,
  text as textScale,
  touchTarget,
  type,
  useColors,
  type TypeRole,
} from "@/theme";
import { ApiRequestError } from "@/api/errors";

export { monoFamily };

/**
 * Body copy.
 *
 * `role` picks a whole style off the platform's ramp — size, leading, weight
 * and tracking together, because those four are one decision and picking them
 * apart is how a screen ends up with 17pt text on 20pt leading. `tone` picks
 * how loudly it speaks, never what colour it is; a screen that named a colour
 * would be a screen the other exposure cannot reach.
 */
export function Body({
  children,
  tone = "normal",
  role,
  size,
  weight,
  numberOfLines,
  align,
  style,
}: {
  children: ReactNode;
  tone?: "normal" | "dim" | "faint" | "accent" | "danger" | "live" | "ok" | "ink";
  role?: TypeRole;
  /** The bare size ramp, for the places that want a number and nothing else. */
  size?: keyof typeof textScale;
  weight?: TextStyle["fontWeight"];
  numberOfLines?: number;
  align?: TextStyle["textAlign"];
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
            : tone === "live"
              ? c.liveInk
              : tone === "ok"
                ? c.lampOk
                : tone === "ink"
                  ? c.accentInk
                  : c.legend;
  const ramp = role ? type[role] : undefined;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        ramp,
        size ? { fontSize: textScale[size], lineHeight: undefined } : null,
        { color, textAlign: align },
        weight ? { fontWeight: weight } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** The heading a screen leads with when it is not a nav bar title. */
export function Title({ children }: { children: ReactNode }) {
  return <Body role="title">{children}</Body>;
}

/**
 * A section header above a grouped list.
 *
 * iOS shouts it — 13pt semibold, tracked out, dim, and the copy itself is
 * upper-case rather than transformed, so a screen reader says the words rather
 * than spelling them. Android says it quietly in the accent, sentence case.
 */
export function SectionHeader({ children }: { children: string }) {
  return (
    <Body
      role="section"
      tone={isIOS ? "dim" : "accent"}
      style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}
    >
      {isIOS ? children.toUpperCase() : sentence(children)}
    </Body>
  );
}

function sentence(value: string): string {
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Machine output: a tool result, a log line, a path. */
export function Mono({
  children,
  size = "sm",
  tone = "dim",
  numberOfLines,
  style,
}: {
  children: ReactNode;
  size?: keyof typeof textScale;
  tone?: "normal" | "dim" | "faint" | "accent" | "danger" | "live" | "ok";
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}) {
  const c = useColors();
  const color =
    tone === "normal"
      ? c.legend
      : tone === "faint"
        ? c.legendFaint
        : tone === "accent"
          ? c.accent
          : tone === "danger"
            ? c.redInk
            : tone === "live"
              ? c.liveInk
              : tone === "ok"
                ? c.lampOk
                : c.legendDim;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          color,
          fontSize: textScale[size],
          lineHeight: Math.round(textScale[size] * 1.4),
          fontFamily: monoFamily,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/**
 * The surface a list or a form sits on.
 *
 * No border on either platform: iOS separates a grouped card from its ground
 * by fill alone, and an M3 filled card does the same. A hairline around both
 * would be a third thing that is neither.
 */
export function Card({
  children,
  raised,
  style,
}: {
  children: ReactNode;
  /** The interaction fill rather than the resting one — a selected card, the
   * newest item, an app bar. */
  raised?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: raised ? c.panelRaised : c.panel,
          borderRadius: radii.card,
          // Load-bearing: a swipe action revealed under a row is clipped by
          // THIS radius, not the row's. The panel behind a row has no corners
          // of its own and must not grow any.
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** The side margins an inset grouped list sits in. */
export const groupInset = space.lg;

/**
 * One tappable line in a list.
 *
 * The separator hangs off the row rather than off the list because only the
 * row knows where its own text starts, and a separator that does not align to
 * the title reads as a mistake. `inset` is that alignment, in points.
 */
export function Row({
  children,
  onPress,
  onLongPress,
  first,
  inset = space.lg,
  paddingVertical = isIOS ? 12 : 14,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  first?: boolean;
  inset?: number;
  paddingVertical?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  return (
    <View>
      {first ? null : (
        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: c.edge,
            marginLeft: inset,
          }}
        />
      )}
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        android_ripple={onPress || onLongPress ? { color: c.ripple } : undefined}
        style={({ pressed }) => [
          {
            paddingHorizontal: space.lg,
            paddingVertical,
            backgroundColor:
              isIOS && pressed && (onPress || onLongPress)
                ? c.panelRaised
                : "transparent",
          },
          style,
        ]}
      >
        {children}
      </Pressable>
    </View>
  );
}

/** A hairline between things that are not rows. */
export function Separator({ inset = 0 }: { inset?: number }) {
  const c = useColors();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: c.edge,
        marginLeft: inset,
      }}
    />
  );
}

type ButtonVariant = "primary" | "tonal" | "secondary" | "plain" | "danger";

/**
 * A button.
 *
 * Five variants and no `style` escape hatch: every button in the app is one of
 * these, and the moment one is not, the right fix is a sixth variant here
 * rather than an override at the call site that the other platform never sees.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  busy,
  icon,
  full,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  icon?: ReactNode;
  /** Stretch to the container. A plain button never does. */
  full?: boolean;
}) {
  const c = useColors();
  const off = disabled || busy;
  const bg =
    variant === "primary"
      ? c.accent
      : variant === "tonal"
        ? c.accentQuiet
        : variant === "danger"
          ? c.red
          : variant === "secondary" && isIOS
            ? c.keycap
            : "transparent";
  const ink =
    variant === "primary"
      ? c.accentInk
      : variant === "tonal"
        ? c.accentQuietInk
        : variant === "danger"
          ? c.accentInk
          : c.accent;
  // Android draws a secondary button as an outline; iOS fills it with a
  // keycap. Same variant, same meaning, two different native answers.
  const outlined = variant === "secondary" && !isIOS;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      android_ripple={off ? undefined : { color: c.ripple }}
      style={({ pressed }) => ({
        backgroundColor: bg,
        opacity: off ? 0.5 : isIOS && pressed ? 0.7 : 1,
        borderRadius: radii.button,
        borderWidth: outlined ? 1 : 0,
        borderColor: c.edge,
        minHeight: isIOS ? touchTarget : 40,
        paddingVertical: isIOS ? 13 : 8,
        paddingHorizontal: variant === "plain" ? space.md : space.xl,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: space.sm,
        alignSelf: full ? "stretch" : "center",
      })}
    >
      {busy ? <ActivityIndicator size="small" color={ink} /> : icon}
      <Text
        style={{
          color: ink,
          ...type.headline,
          fontWeight: isIOS ? "600" : "500",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * A tappable glyph.
 *
 * Never smaller than the platform's minimum target, whatever the glyph is —
 * the mock draws the composer's circles at 38pt, and 38pt is a miss.
 */
export function IconButton({
  children,
  onPress,
  fill = "none",
  size = touchTarget,
  shape = "circle",
  disabled,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress: () => void;
  fill?: "none" | "keycap" | "accent" | "quiet";
  size?: number;
  shape?: "circle" | "square";
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  const c = useColors();
  const box = Math.max(size, touchTarget);
  const background =
    fill === "keycap"
      ? c.keycap
      : fill === "accent"
        ? c.accent
        : fill === "quiet"
          ? c.accentQuiet
          : "transparent";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: c.ripple, borderless: shape === "circle" }}
      style={({ pressed }) => ({
        width: box,
        height: box,
        borderRadius: shape === "circle" ? box / 2 : radii.card,
        backgroundColor: background,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : isIOS && pressed ? 0.6 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

export type PillTone = "quiet" | "live" | "danger" | "ok" | "accent";

/** A small state marker — a session's status, a message's kind. */
export function Pill({
  label,
  tone = "quiet",
}: {
  label: string;
  tone?: PillTone;
}) {
  const c = useColors();
  const [bg, ink] =
    tone === "live"
      ? [c.liveQuiet, c.liveInk]
      : tone === "danger"
        ? [c.redQuiet, c.redInk]
        : tone === "ok"
          ? [c.lampOkQuiet, c.lampOk]
          : tone === "accent"
            ? [c.accentQuiet, c.accentQuietInk]
            : [c.keycap, c.legendDim];
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: radii.pill,
        paddingHorizontal: isIOS ? 7 : 8,
        paddingVertical: isIOS ? 3 : 4,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: ink, ...type.micro }}>{label}</Text>
    </View>
  );
}

/**
 * A filter or a file, as a chip.
 *
 * Android's selected state fills and adds a check; iOS has no chip of its own,
 * so a selected one borrows the tint container and drops the outline.
 */
export function Chip({
  label,
  selected,
  onPress,
  icon,
  trailing,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
  trailing?: ReactNode;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      android_ripple={onPress ? { color: c.ripple } : undefined}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 32,
        paddingLeft: selected || icon ? 10 : 14,
        paddingRight: 14,
        borderRadius: radii.chip,
        backgroundColor: selected ? c.accentQuiet : "transparent",
        borderWidth: selected ? 0 : 1,
        borderColor: c.edge,
        opacity: isIOS && pressed ? 0.7 : 1,
      })}
    >
      {selected ? <Check size={18} color={c.accentQuietInk} /> : icon}
      <Text
        style={{
          ...type.callout,
          color: selected ? c.accentQuietInk : c.legendDim,
        }}
      >
        {label}
      </Text>
      {trailing}
    </Pressable>
  );
}

/**
 * A single-select control over two to four options.
 *
 * iOS draws a sliding track; Android draws joined outlined buttons with a
 * check on the selected one. Same input, same state, two shapes — which is
 * exactly the kind of divergence that belongs in a primitive and nowhere else.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "small",
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  /** A filter above a list is small; a settled choice on its own page is
   * large. iOS scales the track with the label, Android does not. */
  size?: "small" | "large";
}) {
  const c = useColors();
  const large = size === "large";
  if (isIOS) {
    return (
      <View
        style={{
          flexDirection: "row",
          backgroundColor: c.keycap,
          borderRadius: large ? 11 : radii.track,
          padding: 2,
        }}
      >
        {options.map((option) => {
          const on = option.key === value;
          return (
            <Pressable
              key={option.key}
              onPress={() => onChange(option.key)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: large ? 6 : 7,
                borderRadius: large ? 9 : radii.segment,
                backgroundColor: on ? c.panel : "transparent",
                shadowColor: "#000",
                shadowOpacity: on ? 0.09 : 0,
                shadowRadius: on ? 8 : 0,
                shadowOffset: { width: 0, height: 3 },
              }}
            >
              <Text
                style={{
                  ...(large ? type.body : type.section),
                  letterSpacing: 0,
                  fontWeight: on ? "600" : "500",
                  color: on ? c.accent : c.legendDim,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }
  return (
    <View
      style={{
        flexDirection: "row",
        borderWidth: 1,
        borderColor: c.edge,
        borderRadius: radii.segment,
        overflow: "hidden",
      }}
    >
      {options.map((option, index) => {
        const on = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            android_ripple={{ color: c.ripple }}
            style={{
              flex: 1,
              flexDirection: "row",
              gap: 6,
              alignItems: "center",
              justifyContent: "center",
              height: 40,
              backgroundColor: on ? c.accentQuiet : "transparent",
              borderLeftWidth: index === 0 ? 0 : 1,
              borderLeftColor: c.edge,
            }}
          >
            {on ? <Check size={18} color={c.accentQuietInk} /> : null}
            <Text
              style={{
                ...type.callout,
                color: on ? c.accentQuietInk : c.legendDim,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: space.xl,
        gap: space.sm,
      }}
    >
      {children}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const c = useColors();
  return (
    <Centered>
      <ActivityIndicator size={isIOS ? "small" : "large"} color={c.accent} />
      {label ? (
        <Body role="callout" tone="dim">
          {label}
        </Body>
      ) : null}
    </Centered>
  );
}

export function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <Centered>
      <Body
        role={isIOS ? "heading" : "heading"}
        tone={isIOS ? "dim" : "normal"}
        weight={isIOS ? "600" : "400"}
      >
        {title}
      </Body>
      {detail ? (
        <Body role="body" tone="faint" align="center">
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
export function ReadError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const message =
    error instanceof ApiRequestError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Unknown error";
  return (
    <Centered>
      <Body role="heading" tone="danger" weight={isIOS ? "600" : "400"}>
        Could not load this
      </Body>
      <Body role="body" tone="dim" align="center">
        {message}
      </Body>
      {onRetry ? (
        <View style={{ paddingTop: space.sm }}>
          <Button label="Try again" variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </Centered>
  );
}
