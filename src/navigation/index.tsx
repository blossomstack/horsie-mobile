import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet } from "react-native";
import { Inbox, MessagesSquare, Boxes, Settings } from "lucide-react-native";
import { Loading } from "@/components/ui";
import { useInboxCounts } from "@/hooks/useInbox";
import { useConnection } from "@/state/connection";
import { useColors, useTheme } from "@/theme";
import type { RootStackParamList, TabParamList } from "./routes";

import ConnectScreen from "@/screens/ConnectScreen";
import ProjectsScreen from "@/screens/ProjectsScreen";
import InboxScreen from "@/screens/InboxScreen";
import SessionsScreen from "@/screens/SessionsScreen";
import LibraryScreen from "@/screens/LibraryScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import SessionScreen from "@/screens/SessionScreen";
import GraphScreen from "@/screens/GraphScreen";
import NewSessionScreen from "@/screens/NewSessionScreen";
import MessageScreen from "@/screens/MessageScreen";
import AgentsScreen from "@/screens/AgentsScreen";
import AgentsDetailScreen from "@/screens/AgentsDetailScreen";
import EnvironmentsScreen from "@/screens/EnvironmentsScreen";
import EnvironmentsDetailScreen from "@/screens/EnvironmentsDetailScreen";
import WorkflowsScreen from "@/screens/WorkflowsScreen";
import WorkflowsDetailScreen from "@/screens/WorkflowsDetailScreen";
import RoutinesScreen from "@/screens/RoutinesScreen";
import RoutinesDetailScreen from "@/screens/RoutinesDetailScreen";
import SettingsAppearanceScreen from "@/screens/SettingsAppearanceScreen";
import SettingsProjectsScreen from "@/screens/SettingsProjectsScreen";
import SettingsModelsScreen from "@/screens/SettingsModelsScreen";
import SettingsRuntimesScreen from "@/screens/SettingsRuntimesScreen";
import SettingsSkillsScreen from "@/screens/SettingsSkillsScreen";
import SettingsMemoryScreen from "@/screens/SettingsMemoryScreen";
import SettingsMcpScreen from "@/screens/SettingsMcpScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  const c = useColors();
  const { openAsks } = useInboxCounts();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: c.chassis,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.edge,
        },
        headerTintColor: c.legend,
        sceneStyle: { backgroundColor: c.chassis },
        tabBarStyle: {
          backgroundColor: c.chassis,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.edge,
        },
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.legendFaint,
      }}
    >
      <Tab.Screen
        name="Inbox"
        component={InboxScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Inbox size={size} color={color} />,
          // Open asks, not unread: an unread notice costs nothing, an open ask
          // is an agent standing still.
          tabBarBadge: openAsks > 0 ? openAsks : undefined,
          tabBarBadgeStyle: { backgroundColor: c.accent, color: c.accentInk },
        }}
      />
      <Tab.Screen
        name="SessionList"
        component={SessionsScreen}
        options={{
          title: "Sessions",
          tabBarIcon: ({ color, size }) => <MessagesSquare size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Boxes size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Which screen a cold start lands on.
 *
 * Three gates in order — a server, a credential, a project — because every
 * data route is scoped by all three, and a screen rendered without one of them
 * shows an empty account rather than an error. Expressed by choosing the
 * navigator's contents rather than by redirecting from a boot screen: there is
 * then no moment where a scoped screen is mounted without its scope.
 */
export function Navigation() {
  const { colors, scheme } = useTheme();
  const { ready, server, signedIn, project } = useConnection();

  if (!ready) return <Loading />;

  return (
    <NavigationContainer
      theme={{
        dark: scheme === "dark",
        colors: {
          primary: colors.accent,
          background: colors.chassis,
          card: colors.chassis,
          text: colors.legend,
          border: colors.edge,
          notification: colors.accent,
        },
        fonts: {
          regular: { fontFamily: "System", fontWeight: "400" },
          medium: { fontFamily: "System", fontWeight: "500" },
          bold: { fontFamily: "System", fontWeight: "700" },
          heavy: { fontFamily: "System", fontWeight: "800" },
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.chassis },
          headerTintColor: colors.legend,
          headerTitleStyle: { color: colors.legend },
          contentStyle: { backgroundColor: colors.chassis },
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        {!server || !signedIn ? (
          <Stack.Screen name="Connect" component={ConnectScreen} options={{ title: "Connect" }} />
        ) : !project ? (
          <Stack.Screen name="Projects" component={ProjectsScreen} options={{ title: "Projects" }} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="Session" component={SessionScreen} />
            <Stack.Screen name="Graph" component={GraphScreen} options={{ title: "Graph" }} />
            <Stack.Screen name="NewSession" component={NewSessionScreen} options={{ title: "New session" }} />
            <Stack.Screen name="Message" component={MessageScreen} />
            <Stack.Screen name="Agents" component={AgentsScreen} options={{ title: "Agents" }} />
            <Stack.Screen name="AgentDetail" component={AgentsDetailScreen} />
            <Stack.Screen name="Environments" component={EnvironmentsScreen} options={{ title: "Environments" }} />
            <Stack.Screen name="EnvironmentDetail" component={EnvironmentsDetailScreen} />
            <Stack.Screen name="Workflows" component={WorkflowsScreen} options={{ title: "Workflows" }} />
            <Stack.Screen name="WorkflowDetail" component={WorkflowsDetailScreen} />
            <Stack.Screen name="Routines" component={RoutinesScreen} options={{ title: "Routines" }} />
            <Stack.Screen name="RoutineDetail" component={RoutinesDetailScreen} />
            <Stack.Screen name="SettingsAppearance" component={SettingsAppearanceScreen} options={{ title: "Appearance" }} />
            <Stack.Screen name="SettingsProjects" component={SettingsProjectsScreen} options={{ title: "Projects" }} />
            <Stack.Screen name="SettingsModels" component={SettingsModelsScreen} options={{ title: "Models" }} />
            <Stack.Screen name="SettingsRuntimes" component={SettingsRuntimesScreen} options={{ title: "Runtimes" }} />
            <Stack.Screen name="SettingsSkills" component={SettingsSkillsScreen} options={{ title: "Skills" }} />
            <Stack.Screen name="SettingsMemory" component={SettingsMemoryScreen} options={{ title: "Memory" }} />
            <Stack.Screen name="SettingsMcp" component={SettingsMcpScreen} options={{ title: "MCP servers" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
