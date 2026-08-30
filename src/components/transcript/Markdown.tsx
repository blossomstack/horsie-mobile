import { useMemo } from "react";
import Marked, { MarkedStyles } from "react-native-marked";
import { monoFamily } from "@/components/ui";
import { radii, space, text, useColors } from "@/theme";

/**
 * Agent and user prose.
 *
 * `react-native-marked` rather than the web client's `react-markdown`: there
 * is no DOM to render into, and `react-native-markdown-display` — the obvious
 * alternative — pulls `markdown-it`, which imports Node's `punycode` and does
 * not bundle under Metro at all.
 *
 * No syntax highlighting yet. There is no React Native equal to
 * `rehype-highlight`, and a wrong highlight reads worse than none — code gets
 * the monospace face and its own fill, which is what makes it legible.
 */
export function Markdown({ children }: { children: string }) {
  const c = useColors();

  const styles = useMemo<MarkedStyles>(
    () => ({
      paragraph: { paddingVertical: space.xs },
      code: {
        backgroundColor: c.codeFill,
        borderRadius: radii.sm,
        padding: space.md,
      },
      codespan: {
        backgroundColor: c.codeFill,
        color: c.legend,
        fontFamily: monoFamily,
        fontSize: text.sm,
      },
      blockquote: {
        backgroundColor: c.screen,
        borderLeftColor: c.ruleStrong,
        borderLeftWidth: 3,
        paddingHorizontal: space.md,
        marginLeft: 0,
      },
      hr: { backgroundColor: c.rule, height: 1 },
      table: { borderColor: c.rule },
      tableCell: { borderColor: c.rule },
      li: { paddingVertical: 2 },
    }),
    [c],
  );

  return (
    <Marked
      value={children}
      flatListProps={{
        // The transcript is already a list; a nested virtualized one both warns
        // and measures wrong. Rendering every block is correct here because one
        // message is small — the list above it is what is long.
        initialNumToRender: undefined,
        scrollEnabled: false,
        contentContainerStyle: { backgroundColor: "transparent" },
      }}
      styles={styles}
      theme={{
        colors: {
          background: "transparent",
          code: c.codeFill,
          link: c.accent,
          text: c.legend,
          border: c.rule,
        },
      }}
    />
  );
}
