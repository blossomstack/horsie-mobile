/**
 * The colour tokens, lifted from the horsie web UI (`clients/web/src/index.css`
 * for Paper, `skins.css` for Signal) and converted from oklch to sRGB, which is
 * all React Native understands.
 *
 * Same names, same meanings, so a screen here and a screen there can be
 * compared without translating: `panel` is the surface a list sits on,
 * `panelRaised` is the interaction fill (lighter in the dark, DARKER in the
 * light — it has to separate from its ground, and a white fill on a white
 * panel separates from nothing), `screen` is machine output, `edge` is
 * structural chrome and `rule` is a line that means something on its own.
 *
 * A skin varies MATERIAL, never STRUCTURE — every palette below declares the
 * same keys, and nothing outside this file knows which one is on. That is what
 * lets a skin be a whole second world rather than a set of overrides: Paper is
 * warm all the way down with one vermillion, Signal is a cold near-black with
 * one lime, and the two are deliberately the only pair.
 */
export interface Palette {
  chassis: string;
  panel: string;
  panelRaised: string;
  screen: string;
  codeFill: string;
  edge: string;
  rule: string;
  ruleStrong: string;
  legend: string;
  legendDim: string;
  legendFaint: string;
  keycap: string;
  keycapHover: string;
  keycapInk: string;
  accent: string;
  accentHover: string;
  accentInk: string;
  accentQuiet: string;
  selection: string;
  live: string;
  liveInk: string;
  liveQuiet: string;
  red: string;
  redInk: string;
  redQuiet: string;
  lampOk: string;
  lampOkQuiet: string;
  codeKeyword: string;
  codeString: string;
  codeNumber: string;
  codeType: string;
}

const paperDark: Palette = {
    chassis: "#120d0a",
    panel: "#17120e",
    panelRaised: "#2f2823",
    screen: "#1f1a15",
    codeFill: "#38312a",
    edge: "#2b2520",
    rule: "#29231e",
    ruleStrong: "#433c35",
    legend: "#f4f1ea",
    legendDim: "#b7b1a7",
    legendFaint: "#a19a8f",
    keycap: "#352d27",
    keycapHover: "#403832",
    keycapInk: "#f3f0e9",
    accent: "#ee713c",
    accentHover: "#f98455",
    accentInk: "#250d04",
    accentQuiet: "#672c14",
    selection: "rgba(255, 128, 41, 0.12)",
    live: "#f1be58",
    liveInk: "#f1be58",
    liveQuiet: "#443006",
    red: "#ea3a3a",
    redInk: "#ff746b",
    redQuiet: "#581d1a",
    lampOk: "#74d391",
    lampOkQuiet: "#163b22",
    codeKeyword: "#ff946c",
    codeString: "#7cd897",
    codeNumber: "#f3c368",
    codeType: "#70ceee",
};

const paperLight: Palette = {
    chassis: "#f3ecdf",
    panel: "#fefbf5",
    panelRaised: "#e9e1d2",
    screen: "#f3efe5",
    codeFill: "#e2d9c7",
    edge: "#e1dbcd",
    rule: "#e4ddcf",
    ruleStrong: "#c9c1af",
    legend: "#2b2018",
    legendDim: "#5c4f45",
    legendFaint: "#706156",
    keycap: "#e5ddcc",
    keycapHover: "#d8cebb",
    keycapInk: "#2d221a",
    accent: "#b63315",
    accentHover: "#9f2505",
    accentInk: "#fffbf6",
    accentQuiet: "#fcc0ac",
    selection: "rgba(91, 0, 0, 0.32)",
    live: "#894d02",
    liveInk: "#894d02",
    liveQuiet: "#fceccf",
    red: "#be1520",
    redInk: "#b70519",
    redQuiet: "#ffe5e1",
    lampOk: "#1e6c3c",
    lampOkQuiet: "#d7f5dd",
    codeKeyword: "#b02d0c",
    codeString: "#006530",
    codeNumber: "#884c00",
    codeType: "#006085",
};

const signalDark: Palette = {
    chassis: "#06080b",
    panel: "#090c0f",
    panelRaised: "#1f2327",
    screen: "#111417",
    codeFill: "#272b30",
    edge: "#1b1f23",
    rule: "#1a1e22",
    ruleStrong: "#31363c",
    legend: "#f4f6f8",
    legendDim: "#abb1b8",
    legendFaint: "#9199a0",
    keycap: "#23272c",
    keycapHover: "#2e3338",
    keycapInk: "#f2f5f7",
    accent: "#ade84c",
    accentHover: "#bdf46c",
    accentInk: "#0d1800",
    accentQuiet: "#2b4300",
    selection: "rgba(122, 188, 0, 0.12)",
    live: "#f2bd55",
    liveInk: "#f2bd55",
    liveQuiet: "#3d2a00",
    red: "#ed383d",
    redInk: "#ff716b",
    redQuiet: "#511615",
    lampOk: "#5adf9b",
    lampOkQuiet: "#083520",
    codeKeyword: "#a6d85d",
    codeString: "#5adf9b",
    codeNumber: "#f2bd55",
    codeType: "#76cbf2",
};

const signalLight: Palette = {
    chassis: "#ebeef1",
    panel: "#fcfdfe",
    panelRaised: "#e0e4e8",
    screen: "#eff1f4",
    codeFill: "#d7dce1",
    edge: "#dadee2",
    rule: "#dde0e4",
    ruleStrong: "#bfc4c9",
    legend: "#12171c",
    legendDim: "#4a5057",
    legendFaint: "#5c646b",
    keycap: "#dbdfe3",
    keycapHover: "#ccd1d6",
    keycapInk: "#15191e",
    accent: "#3a7809",
    accentHover: "#2e6500",
    accentInk: "#fcfefb",
    accentQuiet: "#bbdeab",
    selection: "rgba(0, 30, 0, 0.35)",
    live: "#845000",
    liveInk: "#845000",
    liveQuiet: "#fceccf",
    red: "#c40520",
    redInk: "#bb001c",
    redQuiet: "#ffe5e2",
    lampOk: "#00683c",
    lampOkQuiet: "#d4f6e1",
    codeKeyword: "#397509",
    codeString: "#00683c",
    codeNumber: "#845000",
    codeType: "#005d85",
};

/** The two worlds, by name. */
export type Skin = "paper" | "signal";

/** Every palette, by skin and then by mode.
 *
 * Read through `useTheme` everywhere except the picker that chooses between
 * them: a screen that named a palette directly would be a screen the other
 * skin cannot reach. */
export const palettes: Record<Skin, Record<"light" | "dark", Palette>> = {
  paper: { dark: paperDark, light: paperLight },
  signal: { dark: signalDark, light: signalLight },
};

/** What each skin is called, and what it is, where a settings screen has room
 * to say so. */
export const SKINS: { key: Skin; label: string; detail: string }[] = [
  { key: "paper", label: "Paper", detail: "Warm neutrals, one vermillion" },
  { key: "signal", label: "Signal", detail: "Cold near-black, one lime" },
];

/** What the person picked. `system` follows the OS switch. */
export type ThemeChoice = "system" | "light" | "dark";

export const radii = { sm: 6, md: 10, lg: 14, xl: 20 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const text = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
} as const;
