import { Stack, useRouter } from "expo-router";
import { NamedRow, ReadOnlyList } from "@/components/ReadOnlyList";
import { Pill } from "@/components/ui";
import { useWorkflows } from "@/hooks/useLibrary";

export default function WorkflowsScreen() {
  const router = useRouter();
  const query = useWorkflows();
  return (
    <>
      <Stack.Screen options={{ title: "Workflows" }} />
      <ReadOnlyList
        query={query}
        onOpen={(w) => router.push(`/library/workflows/${encodeURIComponent(w.name)}`)}
        keyOf={(w) => w.name}
        empty={{ title: "No workflows", detail: "Create one in the web UI." }}
        footer="Read-only. A run appears in Sessions, where its graph can be opened."
        renderRow={(w) => (
          <NamedRow
            name={w.name}
            detail={w.description}
            trailing={
              <Pill label={`${w.steps.length} step${w.steps.length === 1 ? "" : "s"}`} />
            }
          />
        )}
      />
    </>
  );
}
