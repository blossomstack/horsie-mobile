import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { readItem, writeItem } from "@/api/tokens";
import { dark, light, type Palette, type ThemeChoice } from "./tokens";

export { radii, space, text } from "./tokens";
export type { Palette, ThemeChoice } from "./tokens";

const CHOICE_KEY = "horsie.theme.v1";

interface ThemeValue {
  colors: Palette;
  /** Resolved: what is actually on screen right now. */
  scheme: "light" | "dark";
  /** What the person picked, which may be `system`. */
  choice: ThemeChoice;
  setChoice: (next: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [choice, setChoiceState] = useState<ThemeChoice>("system");

  useEffect(() => {
    void readItem(CHOICE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setChoiceState(stored);
      }
    });
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const scheme = choice === "system" ? (system === "dark" ? "dark" : "light") : choice;
    return {
      scheme,
      colors: scheme === "dark" ? dark : light,
      choice,
      setChoice: (next) => {
        setChoiceState(next);
        void writeItem(CHOICE_KEY, next);
      },
    };
  }, [choice, system]);

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
