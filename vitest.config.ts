import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // V1 product suite excludes the Software Understanding track.
    // Run understanding with: npm run test:understanding
    exclude: ["tests/unit/understanding/**"],
    environment: "node",
    reporters: ["default"],
  },
});
