import { View } from "react-native";
import { NamedRow, ReadOnlyList } from "@/components/ReadOnlyList";
import { Pill } from "@/components/ui";
import { useRuntimes, type RuntimeRow } from "@/hooks/useRuntimes";
import { space } from "@/theme";

export default function RuntimesScreen() {
  const { rows, isLoading, isError, error, refetch } = useRuntimes();

  return (
    <>
      <ReadOnlyList
        query={{ data: rows, isLoading, isError, error, refetch }}
        keyOf={(v) => v.name}
        empty={{
          title: "No runtimes",
          detail: "Run `horsie connect` on a machine, or register a cloud vendor in the web UI.",
        }}
        footer="Read-only. Runtimes are configured where they run, or in the web UI."
        renderRow={(v) => <RuntimeRowView row={v} />}
      />
    </>
  );
}

function RuntimeRowView({ row }: { row: RuntimeRow }) {
  return (
    <NamedRow
      name={row.name}
      detail={
        row.provisions
          ? "Builds the workspace it runs in"
          : "Runs in a directory on the machine it is on"
      }
      trailing={
        <View style={{ flexDirection: "row", gap: space.xs, alignItems: "center" }}>
          {row.isDefault ? <Pill label="Default" tone="ok" /> : null}
          {!row.connected ? (
            <Pill label="Not connected" />
          ) : // Whether a credential is stored, never the credential: the
          // server redacts it and there is nothing here worth showing. Only
          // the vendors the server runs have one — a machine that dialled in
          // keeps its own configuration where it runs.
          row.config ? (
            <Pill
              label={row.config.hasCredential ? "Credentialed" : "No credential"}
              tone={row.config.hasCredential ? "ok" : "quiet"}
            />
          ) : null}
        </View>
      }
    />
  );
}
