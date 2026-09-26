import { describe, expect, it } from "vitest";

import { buildIndex, searchIndex } from "../../../src/product/search/index.js";

describe("TF-IDF index", () => {
  it("ranks documents by query terms", () => {
    const index = buildIndex([
      { id: "a", path: "a.ts", text: "authentication login session" },
      { id: "b", path: "b.ts", text: "database migration schema" },
    ]);
    const hits = searchIndex(index, "authentication login");
    expect(hits[0]?.document.path).toBe("a.ts");
    expect(index.limitations[0]).toMatch(/TF-IDF/i);
  });
});
