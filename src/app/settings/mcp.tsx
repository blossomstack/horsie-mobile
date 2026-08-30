import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Pill } from "@/components/ui";
import { NamedRow, ReadOnlyList } from "@/components/ReadOnlyList";
import { useConnection } from "@/state/connection";

export default function McpScreen() {
  const { project } = useConnection();
  const query = useQuery({
    queryKey: ["mcp-servers", project],
    queryFn: async () => (await api.mcp.list()).servers,
    enabled: project !== null,
  });

  return (
    <>
      <Stack.Screen options={{ title: "MCP servers" }} />
      <ReadOnlyList
        query={query}
        keyOf={(s) => s.name}
        empty={{ title: "No MCP servers", detail: "Connect one in the web UI." }}
        footer="Read-only. Servers are connected and authorised in the web UI."
        renderRow={(s) => (
          <NamedRow
            name={s.name}
            // The last error, when there is one, is the whole story — a server
            // that is enabled but failing looks identical to a healthy one
            // without it.
            detail={s.lastError ?? s.url}
            trailing={
              <Pill
                label={
                  s.lastError
                    ? "failing"
                    : s.enabled
                      ? `${s.toolCount ?? 0} tools`
                      : "off"
                }
                tone={s.lastError ? "danger" : s.enabled ? "ok" : "quiet"}
              />
            }
          />
        )}
      />
    </>
  );
}
