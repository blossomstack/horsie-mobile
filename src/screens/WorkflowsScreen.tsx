import { useNavigation } from "@react-navigation/native";
import { NamedRow, ReadOnlyList } from "@/components/ReadOnlyList";
import { Pill } from "@/components/ui";
import { useWorkflows } from "@/hooks/useLibrary";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WorkflowsScreen() {
  const navigation = useNavigation<Nav>();
  const query = useWorkflows();
  return (
    <>
      <ReadOnlyList
        query={query}
        onOpen={(w) => navigation.navigate("WorkflowDetail", { name: w.name })}
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
