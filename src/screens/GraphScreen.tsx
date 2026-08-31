import { useEffect } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SessionGraph } from "@/components/SessionGraph";
import { useSession } from "@/hooks/useSessions";

import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/routes";

/**
 * What a session hosts, as a screen of its own.
 *
 * Thin, because the picture is a component: a workflow run's session page draws
 * the same thing without this route, and a second copy of the layout would be a
 * second chance for the two to disagree about what a session hosts.
 */
export default function GraphScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { id } = useRoute<RouteProp<RootStackParamList, "Graph">>().params;
  const session = useSession(id);
  const name = session.data?.session.name;

  useEffect(() => {
    navigation.setOptions({ title: name ?? "Graph" });
  }, [navigation, name]);

  return <SessionGraph id={id} />;
}
