/**
 * The colour tokens, lifted from the horsie web UI's Paper skin
 * (`clients/web/src/index.css`) and converted from oklch to sRGB, which is all
 * React Native understands.
 *
 * Same names, same meanings, so a screen here and a screen there can be
 * compared without translating: `panel` is the surface a list sits on,
 * `panelRaised` is the interaction fill (lighter in the dark, DARKER in the
 * light — it has to separate from its ground, and a white fill on a white
 * panel separates from nothing), `screen` is machine output, `edge` is
 * structural chrome and `rule` is a line that means something on its own.
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

export const dark: Palette = {
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

export const light: Palette = {
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
