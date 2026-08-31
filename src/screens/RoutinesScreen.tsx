import { useNavigation } from "@react-navigation/native";
import { NamedRow, ReadOnlyList } from "@/components/ReadOnlyList";
import { Pill } from "@/components/ui";
import { useRoutines } from "@/hooks/useLibrary";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function RoutinesScreen() {
  const navigation = useNavigation<Nav>();
  const query = useRoutines();
  return (
    <>
      <ReadOnlyList
        query={query}
        onOpen={(r) => navigation.navigate("RoutineDetail", { name: r.name })}
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
