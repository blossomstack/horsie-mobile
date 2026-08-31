import { useMemo, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Marked, {
  Renderer,
  type MarkedStyles,
  type RendererInterface,
} from "react-native-marked";
import { Check } from "lucide-react-native";
import { Body, monoFamily } from "@/components/ui";
import {
  isIOS,
  radii,
  space,
  typeRamp,
  useColors,
  type Palette,
} from "@/theme";
import { splitTaskLists } from "@/core/markdown";

/**
 * Agent and user prose.
 *
 * `react-native-marked` rather than the web client's `react-markdown`: there
 * is no DOM to render into, and `react-native-markdown-display` — the obvious
 * alternative — pulls `markdown-it`, which imports Node's `punycode` and does
 * not bundle under Metro at all.
 *
 * No syntax highlighting, and that is a decision rather than a gap: there is
 * no React Native equal to `rehype-highlight`, and a wrong highlight reads
 * worse than none. What makes a code block legible here is the header naming
 * its language, its own fill, and a mono face that never wraps — a wrapped
 * line of code is a line you cannot trust the shape of.
 */
export function Markdown({ children }: { children: string }) {
  const c = useColors();

  // Task lists are split off before parsing because the parser drops their
  // state. See `@/core/markdown` for why there is nothing to override.
  const blocks = useMemo(() => splitTaskLists(children), [children]);
  const renderer = useMemo(() => new ProseRenderer(c), [c]);
  const styles = useMemo<MarkedStyles>(
    () => ({
      paragraph: { paddingVertical: 0, marginBottom: space.md },
      text: { ...typeRamp.prose, color: c.legend },
      strong: { fontWeight: "700" },
      em: { fontStyle: "italic" },
      li: { paddingVertical: 3, ...typeRamp.prose, color: c.legend },
      list: { marginBottom: space.md },
      codespan: {
        backgroundColor: c.codeFill,
        color: c.legend,
        fontFamily: monoFamily,
        fontSize: isIOS ? 15 : 14,
      },
      hr: { backgroundColor: c.rule, height: 1, marginVertical: space.md },
      link: {
        color: c.accent,
        textDecorationLine: "underline",
      },
    }),
    [c],
  );

  return (
    <View>
      {blocks.map((block, i) =>
        block.kind === "tasks" ? (
          <TaskList key={`tasks-${i}`} items={block.items} />
        ) : (
          <Marked
            key={`md-${i}`}
            value={block.text}
            renderer={renderer}
            flatListProps={{
              // The transcript is already a list; a nested virtualized one both
              // warns and measures wrong. Rendering every block is correct here
              // because one message is small — the list above it is what is
              // long.
              initialNumToRender: undefined,
              scrollEnabled: false,
              // Both, not just the content container: the list's own view
              // carries the theme background, which paints a slab inside
              // whatever card the prose sits in.
              style: { backgroundColor: "transparent" },
              contentContainerStyle: { backgroundColor: "transparent" },
            }}
            styles={styles}
            theme={{
              colors: {
                background: "transparent",
                code: c.codeFill,
                link: c.accent,
                text: c.legend,
                border: c.edge,
              },
            }}
          />
        ),
      )}
    </View>
  );
}

/**
 * The blocks the library draws thinly, drawn again.
 *
 * A subclass rather than a fork: everything not listed here — emphasis, links,
 * lists, inline code — is already right once the styles above are applied, and
 * reimplementing it would be a second parser's worth of surface to keep in step.
 */
class ProseRenderer extends Renderer implements RendererInterface {
  private readonly c: Palette;

  constructor(colors: Palette) {
    super();
    this.c = colors;
  }

  heading(text: string | ReactNode[], _styles?: object, depth = 1): ReactNode {
    const ramp =
      depth === 1
        ? typeRamp.title
        : depth === 2
          ? typeRamp.heading
          : typeRamp.headline;
    return (
      <Text
        key={this.getKey()}
        style={{
          ...ramp,
          color: this.c.legend,
          marginTop: space.sm,
          marginBottom: space.sm,
        }}
      >
        {text}
      </Text>
    );
  }

  /**
   * A labelled, scrollable code block.
   *
   * Never wrapped. A wrapped line of code is a line whose indentation lies, and
   * on a phone that is most lines — so it scrolls sideways instead, which is
   * the one direction the transcript underneath it does not.
   */
  code(text: string, language?: string): ReactNode {
    return (
      <View
        key={this.getKey()}
        style={{
          backgroundColor: this.c.codeFill,
          borderRadius: radii.block,
          overflow: "hidden",
          marginBottom: space.md,
        }}
      >
        {language ? (
          <View
            style={{
              paddingHorizontal: space.md,
              paddingVertical: 7,
              borderBottomWidth: isIOS ? StyleSheet.hairlineWidth : 1,
              borderBottomColor: this.c.edge,
            }}
          >
            <Text
              style={{
                fontFamily: monoFamily,
                fontSize: 10,
                lineHeight: 13,
                letterSpacing: 0.8,
                color: this.c.legendDim,
              }}
            >
              {language.toUpperCase()}
            </Text>
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text
            style={{
              fontFamily: monoFamily,
              fontSize: 13,
              lineHeight: isIOS ? 19 : 20,
              color: this.c.legend,
              padding: space.md,
            }}
          >
            {text}
          </Text>
        </ScrollView>
      </View>
    );
  }

  blockquote(children: ReactNode[]): ReactNode {
    return (
      <View
        key={this.getKey()}
        style={{
          borderLeftWidth: isIOS ? 3 : 4,
          borderLeftColor: this.c.legendFaint,
          backgroundColor: isIOS ? "transparent" : this.c.panelRaised,
          borderTopRightRadius: isIOS ? 0 : radii.block,
          borderBottomRightRadius: isIOS ? 0 : radii.block,
          paddingLeft: isIOS ? 13 : 12,
          paddingRight: isIOS ? 0 : 14,
          paddingVertical: isIOS ? 0 : space.md,
          marginBottom: space.md,
        }}
      >
        {children}
      </View>
    );
  }

  /**
   * A table that scrolls rather than compresses.
   *
   * Squeezing five columns into a phone's width turns every cell into one
   * character per line — technically all the data, and unreadable. Sideways
   * scrolling keeps the rows intact, which is the only form in which a table
   * is worth anything.
   */
  table(header: ReactNode[][], rows: ReactNode[][][]): ReactNode {
    const cell = (content: ReactNode, i: number, head: boolean) => (
      <View
        key={i}
        style={{
          minWidth: 96,
          paddingHorizontal: space.md,
          paddingVertical: space.sm,
        }}
      >
        <Text
          style={
            head
              ? {
                  ...(isIOS ? typeRamp.caption : typeRamp.subhead),
                  fontWeight: isIOS ? "600" : "500",
                  color: this.c.legendDim,
                }
              : {
                  fontFamily: monoFamily,
                  fontSize: 13,
                  lineHeight: isIOS ? 18 : 20,
                  color: this.c.legend,
                }
          }
        >
          {content}
        </Text>
      </View>
    );
    return (
      <View
        key={this.getKey()}
        style={{
          backgroundColor: isIOS ? this.c.panel : this.c.panelRaised,
          borderRadius: radii.block,
          borderWidth: isIOS ? StyleSheet.hairlineWidth : 0,
          borderColor: this.c.edge,
          overflow: "hidden",
          marginBottom: space.md,
        }}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View
              style={{
                flexDirection: "row",
                backgroundColor: isIOS ? this.c.panelRaised : this.c.surfaceHigh,
              }}
            >
              {header.map((content, i) => cell(content, i, true))}
            </View>
            {rows.map((row, r) => (
              <View
                key={r}
                style={{
                  flexDirection: "row",
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: this.c.edge,
                }}
              >
                {row.map((content, i) => cell(content, i, false))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }
}

/** A checklist the agent wrote into its prose. Not the same thing as the plan
 * strip above the transcript, which is the agent's own task list — this is
 * whatever it typed. */
function TaskList({
  items,
}: {
  items: { checked: boolean; text: string }[];
}) {
  const c = useColors();
  const box = isIOS ? 19 : 20;
  return (
    <View style={{ gap: 7, marginBottom: space.md }}>
      {items.map((item, i) => (
        <View
          key={i}
          style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-start" }}
        >
          <View
            style={{
              width: box,
              height: box,
              borderRadius: isIOS ? 5 : 3,
              marginTop: 3,
              backgroundColor: item.checked ? c.accent : "transparent",
              borderWidth: item.checked ? 0 : 2,
              borderColor: c.legendFaint,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {item.checked ? (
              <Check size={box - 6} color={c.accentInk} strokeWidth={3} />
            ) : null}
          </View>
          <Body
            role="prose"
            tone={item.checked ? "dim" : "normal"}
            style={{
              flex: 1,
              textDecorationLine: item.checked ? "line-through" : "none",
            }}
          >
            {item.text}
          </Body>
        </View>
      ))}
    </View>
  );
}
