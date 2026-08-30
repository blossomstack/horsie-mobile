import { Stack } from "expo-router";
import { NamedRow, ReadOnlyList } from "@/components/ReadOnlyList";
import { Pill } from "@/components/ui";
import { useRoutines } from "@/hooks/useLibrary";

export default function RoutinesScreen() {
  const query = useRoutines();
  return (
    <>
      <Stack.Screen options={{ title: "Routines" }} />
      <ReadOnlyList
        query={query}
        keyOf={(r) => r.name}
        empty={{ title: "No routines", detail: "Create one in the web UI." }}
        footer="Read-only. A routine's runs are hidden from Sessions unless asked for by name."
        renderRow={(r) => (
          <NamedRow
            name={r.name}
            detail={r.prompt}
            trailing={<Pill label={r.enabled ? "On" : "Off"} tone={r.enabled ? "ok" : "quiet"} />}
          />
        )}
      />
    </>
  );
}
