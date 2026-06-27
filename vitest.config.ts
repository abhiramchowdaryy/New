import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      // Focus coverage on the critical, pure business logic. IO/infra modules
      // (SDK client, request-context via next/headers, React cache wiring,
      // network connectors, console logger) are integration-tested elsewhere.
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/lib/**/*.test.ts",
        "src/lib/data/seed.ts",
        "src/lib/anthropic.ts",
        "src/lib/data/index.ts",
        "src/lib/auth/context.ts",
        "src/lib/erp/rest-connector.ts",
        "src/lib/observability/logger.ts",
      ],
      thresholds: {
        statements: 85,
        branches: 75,
        functions: 85,
        lines: 85,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
