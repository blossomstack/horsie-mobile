import type { ComponentType, ReactNode } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";
import { Inbox, MessagesSquare, Boxes, Settings } from "lucide-react-native";
import { Loading } from "@/components/ui";
import { useInboxCounts } from "@/hooks/useInbox";
import { useConnection } from "@/state/connection";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isIOS, radii, space, typeRamp, useColors, useTheme } from "@/theme";
import { TopAppBar } from "./header";
import { ScreenScrollProvider } from "./scroll";
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
const TabStack = createNativeStackNavigator();

/**
 * The header a tab screen wears.
 *
 * iOS asks the native stack for a large title and gets the collapse for free —
 * UIKit owns the animation, and nothing in JS could match it. Android has no
 * medium app bar in `native-stack` at all, so it draws its own; that is the
 * whole reason each tab is its own one-screen stack rather than four screens
 * under one shared header, which could only ever show one title.
 */
function tabHeaderOptions(title: string) {
  if (isIOS) {
    return {
      title,
      headerLargeTitle: true,
      headerLargeTitleShadowVisible: false,
      // Load-bearing, not cosmetic. From iOS 26 UIKit hosts the large title
      // inside the screen's scroll view rather than inside the bar, so an
      // opaque bar background — which is what `headerStyle.backgroundColor`
      // gives the scroll-edge appearance — paints straight over it and the
      // title is never seen. Nothing is lost by clearing it: at the scroll
      // edge the chassis behind is the same colour, and the moment the list
      // moves the bar switches to its opaque standard appearance.
      headerLargeStyle: { backgroundColor: "transparent" },
    };
  }
  return {
    title,
    header: () => <TopAppBar title={title} />,
  };
}

/** One tab: its own stack, so its header is native and its scroll offset is
 * its own. Routes are unchanged — the deep screens still live on the root. */
function tabScreen(name: string, title: string, component: ComponentType) {
  function TabRoot() {
    const c = useColors();
    return (
      <ScreenScrollProvider>
        <TabStack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: c.chassis },
            headerTintColor: c.legend,
            headerTitleStyle: { color: c.legend },
            headerLargeTitleStyle: { color: c.legend },
            contentStyle: { backgroundColor: c.chassis },
          }}
        >
          <TabStack.Screen
            name={name}
            component={component}
            options={tabHeaderOptions(title)}
          />
        </TabStack.Navigator>
      </ScreenScrollProvider>
    );
  }
  TabRoot.displayName = `${name}Tab`;
  return TabRoot;
}

const InboxTab = tabScreen("InboxRoot", "Inbox", InboxScreen);
const SessionsTab = tabScreen("SessionsRoot", "Sessions", SessionsScreen);
const LibraryTab = tabScreen("LibraryRoot", "Library", LibraryScreen);
const SettingsTab = tabScreen("SettingsRoot", "Settings", SettingsScreen);

/**
 * The tab bar's active state, drawn per platform.
 *
 * Android's M3 bar marks the active tab with a 64×32 pill behind the glyph;
 * iOS marks it by tinting the glyph and nothing else. Both are the icon slot,
 * so both are drawn here rather than by two different navigator options.
 */
function TabIcon({
  children,
  focused,
}: {
  children: ReactNode;
  focused: boolean;
}) {
  const c = useColors();
  if (isIOS) return <>{children}</>;
  return (
    <View
      style={{
        width: 64,
        height: 32,
        borderRadius: radii.indicator,
        backgroundColor: focused ? c.accentQuiet : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </View>
  );
}

function Tabs() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { openAsks } = useInboxCounts();
  const iconSize = isIOS ? 26 : 24;

  const tabs = [
    { name: "Inbox" as const, title: "Inbox", component: InboxTab, glyph: Inbox },
    { name: "SessionList" as const, title: "Sessions", component: SessionsTab, glyph: MessagesSquare },
    { name: "Library" as const, title: "Library", component: LibraryTab, glyph: Boxes },
    { name: "Settings" as const, title: "Settings", component: SettingsTab, glyph: Settings },
  ];

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.chassis },
        tabBarStyle: {
          // The glass fill is a flat colour, not a blur: RN ships no blur view
          // and the handoff names this exact fallback. It is opaque enough to
          // carry a label over any content that scrolls beneath it.
          backgroundColor: isIOS ? c.glass : c.chassis,
          borderTopWidth: isIOS ? StyleSheet.hairlineWidth : 0,
          borderTopColor: c.edge,
          // The bar is 49pt (iOS) or 80dp (Android) of *content*; the home
          // indicator's inset is added rather than eaten, or the labels sit
          // under it on every phone that has one.
          height: (isIOS ? 49 : 80) + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: isIOS ? 0 : space.md,
        },
        tabBarActiveTintColor: isIOS ? c.accent : c.legend,
        tabBarInactiveTintColor: c.legendFaint,
        tabBarLabelStyle: isIOS
          ? { fontSize: 10, lineHeight: 12, fontWeight: "600" }
          : { ...typeRamp.micro },
        tabBarIconStyle: isIOS ? undefined : { height: 32, width: 64 },
      }}
    >
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon focused={focused}>
                <tab.glyph size={iconSize} color={color} />
              </TabIcon>
            ),
            // Open asks, not unread: an unread notice costs nothing, an open
            // ask is an agent standing still.
            tabBarBadge:
              tab.name === "Inbox" && openAsks > 0 ? openAsks : undefined,
            tabBarBadgeStyle: {
              backgroundColor: c.accent,
              color: c.accentInk,
              fontWeight: "700",
            },
          }}
        />
      ))}
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
          headerTitleStyle: { color: colors.legend, ...typeRamp.headline },
          headerShadowVisible: false,
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
