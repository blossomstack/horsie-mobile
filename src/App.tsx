import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Navigation } from "@/navigation";
import { ConnectionProvider } from "@/state/connection";
import { ThemeProvider, useTheme } from "@/theme";

function Shell() {
  const { scheme } = useTheme();
  return (
    <>
      <StatusBar barStyle={scheme === "dark" ? "light-content" : "dark-content"} />
      <Navigation />
    </>
  );
}

export default function App() {
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
