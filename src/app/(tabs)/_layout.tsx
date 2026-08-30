import { Tabs } from "expo-router";
import { Inbox, MessagesSquare, Boxes, Settings } from "lucide-react-native";
import { StyleSheet } from "react-native";
import { useInboxCounts } from "@/hooks/useInbox";
import { useColors } from "@/theme";

export default function TabsLayout() {
  const c = useColors();
  const { openAsks } = useInboxCounts();

  return (
    <Tabs
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
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, size }) => <Inbox size={size} color={color} />,
          // Open asks, not unread: an unread notice costs nothing, an open
          // ask is an agent standing still.
          tabBarBadge: openAsks > 0 ? openAsks : undefined,
          tabBarBadgeStyle: { backgroundColor: c.accent, color: c.accentInk },
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: "Sessions",
          tabBarIcon: ({ color, size }) => <MessagesSquare size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, size }) => <Boxes size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
