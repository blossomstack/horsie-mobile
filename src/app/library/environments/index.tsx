import { Stack, useRouter } from "expo-router";
import { NamedRow, ReadOnlyList } from "@/components/ReadOnlyList";
import { useEnvironments } from "@/hooks/useLibrary";

export default function EnvironmentsScreen() {
  const router = useRouter();
  const query = useEnvironments();
  return (
    <>
      <Stack.Screen options={{ title: "Environments" }} />
      <ReadOnlyList
        query={query}
        onOpen={(e) => router.push(`/library/environments/${encodeURIComponent(e.name)}`)}
        keyOf={(e) => e.name}
        empty={{ title: "No environments", detail: "Create one in the web UI." }}
        footer="Read-only. Environments are edited in the web UI."
        renderRow={(e) => <NamedRow name={e.name} detail={e.description} />}
      />
    </>
  );
}
