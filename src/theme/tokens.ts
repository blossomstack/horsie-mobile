/**
 * Two platform-native worlds — iOS 26 and Material 3 — each with a light and a
 * dark exposure, plus a tint the person picks.
 *
 * The split is deliberate. A *palette* is everything a platform decides:
 * surfaces, text, hairlines, and the three semantic lamps (live, ok, red).
 * A *tint* is the one hue a person gets to choose, and it contributes only
 * `accent*`. Merging the two is what `useColors()` hands out, so a screen sees
 * one flat `Palette` and never learns which half a colour came from.
 *
 * Two invariants hold this together:
 *
 *  - `NativePlatform` is `Platform.OS`, never a setting. The two palettes never
 *    coexist at runtime, which is why they are free to disagree about
 *    everything — iOS greys are warm neutrals, Android's are M3 tonal.
 *  - A tint is a *pair* of ramps and the exposure picks which one is drawn. No
 *    resolved hex is ever stored; `horsie.tint.v1` holds a name, and light/dark
 *    is decided at read time. Store a hex and the theme switch stops working
 *    for whoever picked before it.
 *
 * Names carry the same meanings they always did: `panel` is the surface a list
 * sits on, `panelRaised` is the interaction fill (lighter in the dark, DARKER
 * in the light — it has to separate from its ground), `edge` is structural
 * chrome and `rule` is a line that means something on its own.
 */
import { Platform } from "react-native";

/** Which world is drawn. Not a choice — `Platform.OS`. */
export type NativePlatform = "ios" | "android";

export const nativePlatform: NativePlatform =
  Platform.OS === "android" ? "android" : "ios";

export const isIOS = nativePlatform === "ios";

/** Everything a platform decides. */
export interface Surfaces {
  /** Screen ground; also the nav and tab bar fill. */
  chassis: string;
  /** The grouped list / card surface. */
  panel: string;
  /** Pressed row, user bubble, app bar. */
  panelRaised: string;
  /** M3 surface-container-high: chips, keycaps, the composer field. */
  surfaceHigh: string;
  /** Code blocks and inline code. */
  codeFill: string;
  /** Separators, hairlines, outlines. */
  edge: string;
  /** A horizontal rule — a line that carries meaning, not chrome. */
  rule: string;
  legend: string;
  legendDim: string;
  legendFaint: string;
  /** Tinted fills: segmented track, pills, small circular buttons. */
  keycap: string;
  live: string;
  liveInk: string;
  liveQuiet: string;
  red: string;
  redInk: string;
  redQuiet: string;
  lampOk: string;
  lampOkQuiet: string;
  /** iOS blur fallback: what a glass bar is filled with when there is no blur
   * view behind it. Opaque enough to carry text at any scroll position. */
  glass: string;
  /** Android's touch ripple: on-surface at 12%. Unused on iOS, which dims the
   * row instead, but declared on both so a component never has to ask which
   * platform it is on before it can be pressed. */
  ripple: string;
}

/** Everything a tint decides. The only part of the palette a person picks. */
export interface TintRamp {
  accent: string;
  /** Pressed, not hovered — there is no hover on a phone. */
  accentHover: string;
  /** Ink on a filled `accent`. */
  accentInk: string;
  /** The container fill: a tinted surface, not a tinted mark. */
  accentQuiet: string;
  /** Ink on `accentQuiet`. On iOS that is the accent itself; M3 gives the
   * container its own on-colour, and the two are not interchangeable. */
  accentQuietInk: string;
}

/** What a screen reads. One flat object — the seam is invisible above here. */
export type Palette = Surfaces & TintRamp;

const iosLight: Surfaces = {
  chassis: "#f2eee6",
  panel: "#fffcf7",
  panelRaised: "#f7f2ea",
  surfaceHigh: "#efe9e0",
  codeFill: "#efe6d6",
  edge: "rgba(43,32,24,.13)",
  rule: "rgba(43,32,24,.18)",
  legend: "#1f1712",
  legendDim: "rgba(31,23,18,.62)",
  legendFaint: "rgba(31,23,18,.36)",
  keycap: "rgba(120,105,90,.13)",
  live: "#8a4d02",
  liveInk: "#8a4d02",
  liveQuiet: "#fbebd0",
  red: "#be1520",
  redInk: "#be1520",
  redQuiet: "#ffe3df",
  lampOk: "#1e6c3c",
  lampOkQuiet: "#d9f3df",
  glass: "rgba(250,246,240,.78)",
  ripple: "rgba(31,23,18,.10)",
};

const iosDark: Surfaces = {
  chassis: "#0e0a08",
  panel: "#1a1512",
  panelRaised: "#241d18",
  surfaceHigh: "#2e2620",
  codeFill: "#2a2320",
  edge: "rgba(246,242,235,.16)",
  rule: "rgba(246,242,235,.22)",
  legend: "#f6f2eb",
  legendDim: "rgba(246,242,235,.62)",
  legendFaint: "rgba(246,242,235,.34)",
  keycap: "rgba(235,225,210,.14)",
  live: "#f1be58",
  liveInk: "#f1be58",
  liveQuiet: "#40300b",
  red: "#ff7a6b",
  redInk: "#ff7a6b",
  redQuiet: "#4e1a16",
  lampOk: "#74d391",
  lampOkQuiet: "#14351f",
  glass: "rgba(24,19,16,.78)",
  ripple: "rgba(246,242,235,.10)",
};

/**
 * M3 tonal surfaces, but neutral rather than derived from the tint hue.
 *
 * The mock derives Android's greys from vermillion, which is why they read
 * faintly pink — and it does not re-derive them when the tint changes, so cyan
 * would sit on a pink ground. A warm neutral is the same family as iOS, holds
 * still under all five tints, and is the prototype's own alternative.
 */
const androidLight: Surfaces = {
  chassis: "#fbf8f3",
  panel: "#f6f2ea",
  panelRaised: "#efe9df",
  surfaceHigh: "#e7e0d3",
  codeFill: "#ece5d8",
  edge: "#ded6c8",
  rule: "#ded6c8",
  legend: "#221913",
  legendDim: "#57443b",
  legendFaint: "#7d6759",
  keycap: "#e7e0d3",
  live: "#7a4a00",
  liveInk: "#271900",
  liveQuiet: "#fbebd0",
  red: "#b3261e",
  redInk: "#410e0b",
  redQuiet: "#f9dedc",
  lampOk: "#1c6b3b",
  lampOkQuiet: "#d7f2dd",
  glass: "#fbf8f3",
  ripple: "rgba(34,25,19,.12)",
};

const androidDark: Surfaces = {
  chassis: "#16120f",
  panel: "#1d1814",
  panelRaised: "#241e19",
  surfaceHigh: "#2f2721",
  codeFill: "#29221c",
  edge: "#4b3f36",
  rule: "#4b3f36",
  legend: "#f0dfd7",
  legendDim: "#d6c0b6",
  legendFaint: "#a4948a",
  keycap: "#2f2721",
  live: "#f1be58",
  liveInk: "#ffdea8",
  liveQuiet: "#402f0b",
  red: "#f2b8b5",
  redInk: "#f9dedc",
  redQuiet: "#601410",
  lampOk: "#74d391",
  lampOkQuiet: "#14351f",
  glass: "#16120f",
  ripple: "rgba(240,223,215,.12)",
};

/**
 * Every palette, by platform and then by exposure.
 *
 * Read through `useColors()` everywhere. A screen that named one directly
 * would be a screen the other platform cannot reach.
 */
export const palettes: Record<
  NativePlatform,
  Record<"light" | "dark", Surfaces>
> = {
  ios: { light: iosLight, dark: iosDark },
  android: { light: androidLight, dark: androidDark },
};

/** The five hues on offer. */
export type TintName = "vermillion" | "amber" | "fern" | "lime" | "cyan";

/**
 * Every tint, by name, then by platform, then by exposure.
 *
 * Platform-keyed because the two systems disagree about what an accent *is*:
 * iOS wants one saturated mark that reads on a near-white panel, M3 wants a
 * tone-40/80 primary with its own container and two on-colours. Vermillion is
 * `#b63315` on iOS and `#9e3b14` on Android for that reason, and neither is a
 * shade of the other.
 */
export const tints: Record<
  TintName,
  Record<NativePlatform, Record<"light" | "dark", TintRamp>>
> = {
  vermillion: {
    ios: {
      light: { accent: "#b63315", accentHover: "#992b12", accentInk: "#f2eee6", accentQuiet: "#fbe0d6", accentQuietInk: "#b63315" },
      dark: { accent: "#ff8a57", accentHover: "#ff9d72", accentInk: "#0e0a08", accentQuiet: "#4a1f0b", accentQuietInk: "#ff8a57" },
    },
    android: {
      light: { accent: "#9e3b14", accentHover: "#853211", accentInk: "#ffffff", accentQuiet: "#ffdbcb", accentQuietInk: "#3a1200" },
      dark: { accent: "#ffb59a", accentHover: "#ffc1aa", accentInk: "#5a1d00", accentQuiet: "#7e2e08", accentQuietInk: "#ffdbcb" },
    },
  },
  amber: {
    ios: {
      light: { accent: "#894d02", accentHover: "#734102", accentInk: "#f2eee6", accentQuiet: "#fbebd0", accentQuietInk: "#894d02" },
      dark: { accent: "#f1be58", accentHover: "#f3c873", accentInk: "#0e0a08", accentQuiet: "#40300b", accentQuietInk: "#f1be58" },
    },
    android: {
      light: { accent: "#7a4a00", accentHover: "#663e00", accentInk: "#ffffff", accentQuiet: "#ffdea8", accentQuietInk: "#271900" },
      dark: { accent: "#f1be58", accentHover: "#f3c873", accentInk: "#402b00", accentQuiet: "#5c3d00", accentQuietInk: "#ffdea8" },
    },
  },
  fern: {
    ios: {
      light: { accent: "#1e6c3c", accentHover: "#195b32", accentInk: "#f2eee6", accentQuiet: "#d9f3df", accentQuietInk: "#1e6c3c" },
      dark: { accent: "#74d391", accentHover: "#8adaa3", accentInk: "#0e0a08", accentQuiet: "#14351f", accentQuietInk: "#74d391" },
    },
    android: {
      light: { accent: "#1c6b3b", accentHover: "#185a32", accentInk: "#ffffff", accentQuiet: "#b6f0c6", accentQuietInk: "#002110" },
      dark: { accent: "#74d391", accentHover: "#8adaa3", accentInk: "#003919", accentQuiet: "#14512e", accentQuietInk: "#b6f0c6" },
    },
  },
  lime: {
    ios: {
      light: { accent: "#3a7809", accentHover: "#316508", accentInk: "#f2eee6", accentQuiet: "#ddf3bb", accentQuietInk: "#3a7809" },
      dark: { accent: "#ade84c", accentHover: "#baec69", accentInk: "#0e0a08", accentQuiet: "#2b4300", accentQuietInk: "#ade84c" },
    },
    android: {
      light: { accent: "#3a7809", accentHover: "#316508", accentInk: "#ffffff", accentQuiet: "#c3ec9b", accentQuietInk: "#0f2000" },
      dark: { accent: "#ade84c", accentHover: "#baec69", accentInk: "#1a3000", accentQuiet: "#2c5400", accentQuietInk: "#c3ec9b" },
    },
  },
  cyan: {
    ios: {
      light: { accent: "#006085", accentHover: "#005170", accentInk: "#f2eee6", accentQuiet: "#cfe9f5", accentQuietInk: "#006085" },
      dark: { accent: "#70ceee", accentHover: "#87d6f1", accentInk: "#0e0a08", accentQuiet: "#0d3448", accentQuietInk: "#70ceee" },
    },
    android: {
      light: { accent: "#005d85", accentHover: "#004e70", accentInk: "#ffffff", accentQuiet: "#bfe4f5", accentQuietInk: "#001e2c" },
      dark: { accent: "#70ceee", accentHover: "#87d6f1", accentInk: "#002f43", accentQuiet: "#004d6d", accentQuietInk: "#bfe4f5" },
    },
  },
};

/** What each tint is called, in picker order. */
export const TINTS: { key: TintName; label: string }[] = [
  { key: "vermillion", label: "Vermillion" },
  { key: "amber", label: "Amber" },
  { key: "fern", label: "Fern" },
  { key: "lime", label: "Lime" },
  { key: "cyan", label: "Cyan" },
];

export const TINT_LABEL: Record<TintName, string> = {
  vermillion: "Vermillion",
  amber: "Amber",
  fern: "Fern",
  lime: "Lime",
  cyan: "Cyan",
};

/** What the person picked. `system` follows the OS switch. */
export type ThemeChoice = "system" | "light" | "dark";

export const CHOICE_LABEL: Record<ThemeChoice, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

/**
 * Corner radii, by role rather than by size.
 *
 * Named for what they round because the two platforms disagree on the number
 * and agree on the thing: a card is 20 on iOS and 16 on Android, and a screen
 * that asked for `radii.xl` would have to know which. Resolved once here.
 */
export const radii = (
  isIOS
    ? {
        /** Grouped list / content card. */
        card: 20,
        /** Tool call, code block, small inner card. */
        block: 12,
        /** A parked ask. */
        ask: 18,
        /** Filled and plain buttons. */
        button: 14,
        /** A state marker. */
        pill: 6,
        /** Text input. */
        field: 20,
        /** Action sheet / bottom sheet. */
        sheet: 14,
        /** A chip: a filter, a file. */
        chip: 8,
        /** A segmented control's selected segment. */
        segment: 7,
        /** The segmented control's own track. */
        track: 9,
        /** Tab bar active indicator (Android only; iOS has none). */
        indicator: 0,
      }
    : {
        card: 16,
        block: 12,
        ask: 16,
        button: 20,
        pill: 8,
        field: 28,
        sheet: 28,
        chip: 8,
        segment: 20,
        track: 20,
        indicator: 16,
      }
) as {
  card: number;
  block: number;
  ask: number;
  button: number;
  pill: number;
  field: number;
  sheet: number;
  chip: number;
  segment: number;
  track: number;
  indicator: number;
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** The bare size ramp, kept for the places that only want a number. */
export const text = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
} as const;

interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: "400" | "500" | "600" | "700";
  letterSpacing?: number;
}

/**
 * The type ramp, by role.
 *
 * Both platforms are here in full rather than as a base plus overrides,
 * because they differ in every column — iOS tightens its tracking as it grows,
 * M3 loosens it, and the two never converge on a size *and* a weight *and* a
 * leading. Written out, the difference is legible; expressed as a diff, it is
 * a puzzle.
 */
const ramps: Record<NativePlatform, Record<string, TypeStyle>> = {
  ios: {
    largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: 0.37 },
    title: { fontSize: 26, lineHeight: 32, fontWeight: "700", letterSpacing: -0.6 },
    heading: { fontSize: 20, lineHeight: 25, fontWeight: "600", letterSpacing: -0.45 },
    /** A row title, a nav bar title, a button label. */
    headline: { fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.43 },
    body: { fontSize: 17, lineHeight: 22, fontWeight: "400", letterSpacing: -0.43 },
    /** Body copy in prose: markdown, an ask's question. Looser leading. */
    prose: { fontSize: 17, lineHeight: 25, fontWeight: "400", letterSpacing: -0.4 },
    callout: { fontSize: 15, lineHeight: 20, fontWeight: "400" },
    subhead: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
    /** A section header above a grouped list. */
    section: { fontSize: 13, lineHeight: 16, fontWeight: "600", letterSpacing: 0.4 },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" },
    /** A pill's label, a tab bar label. */
    micro: { fontSize: 11, lineHeight: 14, fontWeight: "600" },
  },
  android: {
    largeTitle: { fontSize: 28, lineHeight: 36, fontWeight: "400" },
    title: { fontSize: 28, lineHeight: 36, fontWeight: "400" },
    heading: { fontSize: 22, lineHeight: 28, fontWeight: "400" },
    headline: { fontSize: 16, lineHeight: 24, fontWeight: "500", letterSpacing: 0.15 },
    body: { fontSize: 16, lineHeight: 24, fontWeight: "400", letterSpacing: 0.15 },
    prose: { fontSize: 16, lineHeight: 24, fontWeight: "400", letterSpacing: 0.15 },
    callout: { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1 },
    subhead: { fontSize: 14, lineHeight: 20, fontWeight: "400", letterSpacing: 0.25 },
    section: { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1 },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: "400", letterSpacing: 0.4 },
    micro: { fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 0.5 },
  },
};

export type TypeRole =
  | "largeTitle"
  | "title"
  | "heading"
  | "headline"
  | "body"
  | "prose"
  | "callout"
  | "subhead"
  | "section"
  | "caption"
  | "micro";

/** The ramp for the platform that is actually running. */
export const typeRamp = ramps[nativePlatform] as Record<TypeRole, TypeStyle>;

/** System faces only — nothing is bundled. */
export const monoFamily = isIOS ? "Menlo" : "monospace";

/** Minimum tappable square: 44pt on iOS, 48dp on Android. Anything smaller in
 * the mock is bumped to this, which is why the composer's circles are not 38. */
export const touchTarget = isIOS ? 44 : 48;
