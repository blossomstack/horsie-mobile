import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Check } from "lucide-react-native";
import { api } from "@/api/client";
import { NamedRow, ReadOnlyList } from "@/components/ReadOnlyList";
import { useConnection } from "@/state/connection";
import { useColors } from "@/theme";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * The projects on this server, and which one the app is reading.
 *
 * Switching is not an edit — it changes what this device looks at, not what
 * the deployment is — so it is the one tap on a Settings screen that does
 * something.
 */
export default function ProjectsSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const c = useColors();
  const { project, chooseProject, server } = useConnection();

  const query = useQuery({
    queryKey: ["projects", server?.id],
    queryFn: () => api.projects.list(),
  });

  return (
    <>
      <ReadOnlyList
        query={query}
        keyOf={(p) => p.id}
        empty={{ title: "No projects" }}
        footer="Projects are created and deleted in the web UI."
        renderRow={(p) => (
          <NamedRow
            name={p.name}
            detail={p.isDefault ? "Default" : undefined}
            trailing={
              p.id === project ? (
                <Check size={18} color={c.accent} />
              ) : (
                <Check
                  size={18}
                  color={c.legendFaint}
                  onPress={() => {
                    void chooseProject(p.id).then(() => navigation.popTo("Tabs"));
                  }}
                />
              )
            }
          />
        )}
      />
    </>
  );
}
