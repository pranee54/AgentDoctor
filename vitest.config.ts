import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // V1 product suite excludes the Software Understanding track.
    // Run understanding with: npm run test:understanding
    exclude: ["tests/unit/understanding/**"],
    environment: "node",
    reporters: ["default"],
    // forks + async CLI spawns avoid Vitest worker RPC starvation (onTaskUpdate).
    pool: "forks",
    testTimeout: 120_000,
    hookTimeout: 60_000,
    teardownTimeout: 60_000,
  },
});
