import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { api } from "@/api/client";
import { NamedRow, ReadOnlyList } from "@/components/ReadOnlyList";
import { Pill } from "@/components/ui";
import { useConnection } from "@/state/connection";

export default function MemoryScreen() {
  const { project } = useConnection();
  const query = useQuery({
    queryKey: ["memories", project],
    queryFn: () => api.memory.list(),
    enabled: project !== null,
  });

  return (
    <>
      <Stack.Screen options={{ title: "Memory" }} />
      <ReadOnlyList
        query={query}
        keyOf={(m) => String(m.id)}
        empty={{ title: "Nothing remembered", detail: "Agents write here as they work." }}
        footer="Read-only. Memories are written by agents and edited in the web UI."
        renderRow={(m) => (
          <NamedRow name={m.name} detail={m.description} trailing={<Pill label={m.space} />} />
        )}
      />
    </>
  );
}
