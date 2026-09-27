import { defineConfig } from "vitest/config";

const isWindows = process.platform === "win32";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // V1 product suite excludes the Software Understanding track.
    // Run understanding with: npm run test:understanding
    exclude: ["tests/unit/understanding/**"],
    environment: "node",
    reporters: ["default"],
    // forks + async CLI spawns avoid Vitest worker RPC starvation (onTaskUpdate).
    // Windows CI: serialize forks — long pack/CLI suites otherwise trip onTaskUpdate.
    pool: "forks",
    fileParallelism: !isWindows,
    poolOptions: {
      forks: {
        singleFork: isWindows,
      },
    },
    testTimeout: 120_000,
    hookTimeout: 60_000,
    teardownTimeout: 120_000,
  },
});
