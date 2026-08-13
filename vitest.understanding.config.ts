import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/understanding/**/*.test.ts", "tests/unit/mcp/**/*.test.ts"],
    environment: "node",
    reporters: ["default"],
  },
});
