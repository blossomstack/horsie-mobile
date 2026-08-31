import { useNavigation } from "@react-navigation/native";
import { NamedRow, ReadOnlyList } from "@/components/ReadOnlyList";
import { useEnvironments } from "@/hooks/useLibrary";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function EnvironmentsScreen() {
  const navigation = useNavigation<Nav>();
  const query = useEnvironments();
  return (
    <>
      <ReadOnlyList
        query={query}
        onOpen={(e) => navigation.navigate("EnvironmentDetail", { name: e.name })}
        keyOf={(e) => e.name}
        empty={{ title: "No environments", detail: "Create one in the web UI." }}
        footer="Read-only. Environments are edited in the web UI."
        renderRow={(e) => <NamedRow name={e.name} detail={e.description} />}
      />
    </>
  );
}
