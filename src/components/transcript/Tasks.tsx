import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { CheckCircle2, ChevronDown, ChevronRight, Circle, CircleDot } from "lucide-react-native";
import { TaskStatus, type TaskItem } from "@/api/types";
import { Body } from "@/components/ui";
import { isIOS, space, useColors } from "@/theme";

/**
 * The agent's own plan, as it is keeping it.
 *
 * Folded shut by default and showing only the count: on a phone the plan is
 * context for the transcript, not the point of the screen, and an eight-item
 * list pinned open pushes the actual answer off the top.
 *
 * The list is derived in `@/core/transcript` from the log and the agent
 * document, whichever reflects the later position. It was being computed and
 * dropped — an agent working through a plan looked like one working at random.
 */
export function Tasks({ tasks }: { tasks: TaskItem[] }) {
  const c = useColors();
  const [open, setOpen] = useState(false);

  if (tasks.length === 0) return null;

  const done = tasks.filter((t) => t.status === TaskStatus.Completed).length;
  const current = tasks.find((t) => t.status === TaskStatus.InProgress);

  return (
    <View
      style={{
        borderBottomWidth: isIOS ? StyleSheet.hairlineWidth : 1,
        borderBottomColor: c.edge,
        backgroundColor: c.panel,
      }}
    >
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          paddingHorizontal: space.lg,
          paddingVertical: space.sm,
        }}
      >
        {open ? (
          <ChevronDown size={14} color={c.legendFaint} />
        ) : (
          <ChevronRight size={14} color={c.legendFaint} />
        )}
        <Body role="subhead" weight="600">
          {done} of {tasks.length} done
        </Body>
        {/* What it is on right now, when shut — the one line worth the space. */}
        {!open && current ? (
          <Body role="subhead" tone="dim" numberOfLines={1} style={{ flex: 1 }}>
            {current.content}
          </Body>
        ) : null}
      </Pressable>

      {open ? (
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.xs }}>
          {tasks.map((task) => (
            <View
              key={task.id}
              style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-start" }}
            >
              <View style={{ paddingTop: 2 }}>
                {task.status === TaskStatus.Completed ? (
                  <CheckCircle2 size={14} color={c.lampOk} />
                ) : task.status === TaskStatus.InProgress ? (
                  <CircleDot size={14} color={c.live} />
                ) : (
                  <Circle size={14} color={c.legendFaint} />
                )}
              </View>
              <Body
                role="subhead"
                tone={task.status === TaskStatus.Completed ? "faint" : "normal"}
                style={{ flex: 1 }}
              >
                {task.content}
              </Body>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
