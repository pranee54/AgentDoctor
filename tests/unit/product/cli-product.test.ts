import { describe, expect, it } from "vitest";

import { runProductCommand } from "../../../src/cli/commands/product.js";
import { EXIT_CODES } from "../../../src/types/index.js";
import path from "node:path";

describe("product CLI", () => {
  it("runs map command with json", async () => {
    const root = path.resolve(import.meta.dirname, "../../..");
    const code = await runProductCommand({ action: "map", root, json: true });
    expect(code).toBe(EXIT_CODES.SUCCESS);
  }, 60_000);
});
