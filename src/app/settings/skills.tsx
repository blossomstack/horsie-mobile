import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { api } from "@/api/client";
import { NamedRow, ReadOnlyList } from "@/components/ReadOnlyList";
import { Pill } from "@/components/ui";
import { useConnection } from "@/state/connection";

export default function SkillsScreen() {
  const { project } = useConnection();
  const query = useQuery({
    queryKey: ["plugins", project],
    queryFn: () => api.skills.bundles(),
    enabled: project !== null,
  });

  return (
    <>
      <Stack.Screen options={{ title: "Skills" }} />
      <ReadOnlyList
        query={query}
        keyOf={(p) => p.name}
        empty={{ title: "No skill bundles", detail: "Install one in the web UI." }}
        footer="Read-only. Bundles are installed and enabled in the web UI."
        renderRow={(p) => (
          <NamedRow
            name={p.name}
            detail={p.description}
            trailing={
              <Pill
                label={p.enabledDefault ? "On by default" : "Opt in"}
                tone={p.enabledDefault ? "ok" : "quiet"}
              />
            }
          />
        )}
      />
    </>
  );
}
