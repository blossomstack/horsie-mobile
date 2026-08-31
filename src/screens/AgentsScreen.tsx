import { useNavigation } from "@react-navigation/native";
import { NamedRow, ReadOnlyList } from "@/components/ReadOnlyList";
import { Pill } from "@/components/ui";
import { useAgents } from "@/hooks/useLibrary";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AgentsScreen() {
  const navigation = useNavigation<Nav>();
  const query = useAgents();
  return (
    <>
      <ReadOnlyList
        query={query}
        onOpen={(a) => navigation.navigate("AgentDetail", { name: a.name })}
        keyOf={(a) => a.name}
        empty={{ title: "No agent presets", detail: "Create one in the web UI." }}
        footer="Read-only. Presets are edited in the web UI."
        renderRow={(a) => (
          <NamedRow
            name={a.name}
            detail={a.description ?? a.model}
            trailing={a.model ? <Pill label={a.model} /> : undefined}
          />
        )}
      />
    </>
  );
}
