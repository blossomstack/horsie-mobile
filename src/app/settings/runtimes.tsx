import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { api } from "@/api/client";
import { NamedRow, ReadOnlyList } from "@/components/ReadOnlyList";
import { Pill } from "@/components/ui";
import { useConnection } from "@/state/connection";

export default function RuntimesScreen() {
  const { project } = useConnection();
  const query = useQuery({
    queryKey: ["runtime-vendors", project],
    queryFn: () => api.settings.runtimeVendors(),
    enabled: project !== null,
  });

  return (
    <>
      <Stack.Screen options={{ title: "Runtimes" }} />
      <ReadOnlyList
        query={query}
        keyOf={(v) => v.name}
        empty={{ title: "No runtimes", detail: "Register one in the web UI." }}
        footer="Read-only. Runtime vendors are configured in the web UI."
        renderRow={(v) => (
          <NamedRow
            name={v.name}
            // Whether a credential is stored, never the credential: the server
            // redacts it and there is nothing here worth showing anyway.
            trailing={
              <Pill
                label={v.hasCredential ? "Credentialed" : "No credential"}
                tone={v.hasCredential ? "ok" : "quiet"}
              />
            }
          />
        )}
      />
    </>
  );
}
