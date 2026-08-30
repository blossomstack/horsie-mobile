import { defineConfig } from "vitest/config";
import path from "node:path";

// The suite covers `src/lib`, `src/core` and `src/api` — plain TypeScript with
// no React Native imports, which is why vitest can run it without the
// react-native preset. Anything that renders a component belongs in a
// device-level check, not here.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
