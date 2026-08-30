import { Stack } from "expo-router";
import { NamedRow, ReadOnlyList } from "@/components/ReadOnlyList";
import { Pill } from "@/components/ui";
import { useAgents } from "@/hooks/useLibrary";

export default function AgentsScreen() {
  const query = useAgents();
  return (
    <>
      <Stack.Screen options={{ title: "Agents" }} />
      <ReadOnlyList
        query={query}
        keyOf={(a) => a.name}
        empty={{ title: "No agent presets", detail: "Create one in the web UI." }}
        footer="Read-only. Presets are edited in the web UI."
        renderRow={(a) => (
          <NamedRow
            name={a.name}
            detail={a.description ?? a.model}
            trailing={a.model ? <Pill label={a.model} /> : undefined}
          />
        )}
      />
    </>
  );
}
