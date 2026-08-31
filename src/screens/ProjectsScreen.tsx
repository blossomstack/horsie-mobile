import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { FlatList, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { api } from "@/api/client";
import { Body, Card, Empty, Loading, ReadError, Row } from "@/components/ui";
import { useConnection } from "@/state/connection";
import { space, useColors } from "@/theme";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Which project to read.
 *
 * Every data route is scoped by one, so this stands between sign-in and the
 * rest of the app rather than being a setting somewhere: without it the first
 * screen would render an empty list that looks like an empty account.
 */
export default function Projects() {
  const navigation = useNavigation<Nav>();
  const c = useColors();
  const { chooseProject, server } = useConnection();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["projects", server?.id],
    queryFn: () => api.projects.list(),
  });

  if (isLoading) return <Loading label="Reading projects…" />;
  if (isError) return <ReadError error={error} onRetry={() => void refetch()} />;
  if (!data?.length) {
    return (
      <Empty
        title="No projects"
        detail="This account has no projects yet. Create one in the web UI and pull to refresh."
      />
    );
  }

  return (
    <FlatList
      contentContainerStyle={{ padding: space.lg }}
      data={data}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <Body tone="dim" style={{ marginBottom: space.md }}>
          Everything the app reads belongs to one project. You can switch later in
          Settings.
        </Body>
      }
      renderItem={({ item, index }) => (
        <Card style={index === 0 ? undefined : { marginTop: -1 }}>
          <Row
            first
            onPress={async () => {
              await chooseProject(item.id);
              navigation.navigate("Tabs");
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: space.md,
              }}
            >
              <Body size="lg" weight="600">
                {item.name}
              </Body>
              <ChevronRight size={18} color={c.legendFaint} />
            </View>
          </Row>
        </Card>
      )}
    />
  );
}
