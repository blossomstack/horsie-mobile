import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ConnectionProvider } from "@/state/connection";
import { ThemeProvider, useTheme } from "@/theme";

function Shell() {
  const { colors, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.chassis },
          headerTintColor: colors.legend,
          headerTitleStyle: { color: colors.legend },
          contentStyle: { backgroundColor: colors.chassis },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="connect" options={{ title: "Connect" }} />
        <Stack.Screen name="projects" options={{ title: "Projects" }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const client = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // A phone wakes up to a stale cache far more often than a laptop
            // does, and a wrong session status is worse than a spinner.
            staleTime: 5_000,
            retry: 1,
          },
        },
      }),
    [],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={client}>
          <ThemeProvider>
            <ConnectionProvider>
              <Shell />
            </ConnectionProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
