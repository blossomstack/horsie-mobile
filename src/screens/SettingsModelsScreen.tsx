import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { NamedRow, ReadOnlyList } from "@/components/ReadOnlyList";
import { Pill } from "@/components/ui";
import { useConnection } from "@/state/connection";

export default function ModelsScreen() {
  const { project } = useConnection();
  const query = useQuery({
    queryKey: ["models", project],
    queryFn: () => api.settings.models(),
    enabled: project !== null,
  });

  return (
    <>
      <ReadOnlyList
        query={query}
        keyOf={(m) => m.alias}
        empty={{ title: "No models", detail: "Add one in the web UI." }}
        footer="Read-only. Models and their providers are configured in the web UI."
        renderRow={(m) => (
          <NamedRow name={m.alias} detail={m.modelId} trailing={<Pill label={m.provider} />} />
        )}
      />
    </>
  );
}
