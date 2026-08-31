import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { deleteItem, readItem, writeItem } from "@/api/tokens";
import {
  nativePlatform,
  palettes,
  tints,
  type Palette,
  type ThemeChoice,
  type TintName,
  type TintRamp,
} from "./tokens";

export {
  CHOICE_LABEL,
  TINT_LABEL,
  TINTS,
  isIOS,
  monoFamily,
  nativePlatform,
  palettes,
  radii,
  space,
  text,
  tints,
  touchTarget,
  type,
} from "./tokens";
export type {
  NativePlatform,
  Palette,
  ThemeChoice,
  TintName,
  TintRamp,
  TypeRole,
} from "./tokens";

const CHOICE_KEY = "horsie.theme.v1";
const TINT_KEY = "horsie.tint.v1";
/** Read once at boot, mapped onto a tint, then deleted. Nothing else reads it. */
const LEGACY_SKIN_KEY = "horsie.skin.v1";

const DEFAULT_TINT: TintName = "vermillion";

function isTint(value: string | null): value is TintName {
  return (
    value === "vermillion" ||
    value === "amber" ||
    value === "fern" ||
    value === "lime" ||
    value === "cyan"
  );
}

interface ThemeValue {
  colors: Palette;
  /** Resolved: what is actually on screen right now. */
  scheme: "light" | "dark";
  /** What the person picked, which may be `system`. */
  choice: ThemeChoice;
  setChoice: (next: ThemeChoice) => void;
  /** The one hue they chose. Orthogonal to `choice`: every tint carries a
   * light and a dark value, so picking one never decides the other. */
  tint: TintName;
  setTint: (next: TintName) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [choice, setChoiceState] = useState<ThemeChoice>("system");
  const [tint, setTintState] = useState<TintName>(DEFAULT_TINT);

  useEffect(() => {
    void readItem(CHOICE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setChoiceState(stored);
      }
    });
    void (async () => {
      const stored = await readItem(TINT_KEY);
      if (isTint(stored)) {
        setTintState(stored);
        return;
      }
      // The skins are gone. Whoever ran Signal picked the lime world and keeps
      // its hue; Paper was vermillion, which is also the default, so a fresh
      // install and a migrated Paper install land in the same place.
      const skin = await readItem(LEGACY_SKIN_KEY);
      if (skin === "signal" || skin === "paper") {
        const migrated: TintName = skin === "signal" ? "lime" : "vermillion";
        setTintState(migrated);
        await writeItem(TINT_KEY, migrated);
      }
      if (skin !== null) await deleteItem(LEGACY_SKIN_KEY);
    })();
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const scheme =
      choice === "system" ? (system === "dark" ? "dark" : "light") : choice;
    return {
      scheme,
      // The merge is the whole architecture: a platform decides the surfaces, a
      // tint decides the accent, and neither knows about the other.
      colors: {
        ...palettes[nativePlatform][scheme],
        ...tints[tint][nativePlatform][scheme],
      },
      choice,
      setChoice: (next) => {
        setChoiceState(next);
        void writeItem(CHOICE_KEY, next);
      },
      tint,
      setTint: (next) => {
        setTintState(next);
        void writeItem(TINT_KEY, next);
      },
    };
  }, [choice, tint, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme outside ThemeProvider");
  return value;
}

/** Shorthand for the common case of wanting colours and nothing else. */
export function useColors(): Palette {
  return useTheme().colors;
}

/**
 * What a tint looks like right now, for the one screen that has to show a tint
 * it is not wearing.
 *
 * The picker is the single legitimate reader of another tint's colours, and it
 * asks through here rather than indexing `tints` itself — so the rule that no
 * screen names a tint survives having a screen whose whole job is naming them.
 */
export function useTintRamp(name: TintName): TintRamp {
  const { scheme } = useTheme();
  return tints[name][nativePlatform][scheme];
}
