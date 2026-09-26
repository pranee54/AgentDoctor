import { describe, expect, it } from "vitest";

import { minProductTruth, truthLabelDescription } from "../../../src/product/truth.js";

describe("product truth", () => {
  it("minProductTruth never promotes weaker to stronger", () => {
    expect(minProductTruth("VERIFIED", "INFERRED")).toBe("INFERRED");
    expect(minProductTruth("UNKNOWN", "EXTERNAL")).toBe("EXTERNAL");
    expect(minProductTruth("PARTIAL", "VERIFIED")).toBe("PARTIAL");
  });

  it("describes labels", () => {
    expect(truthLabelDescription("EXPERIMENTAL")).toContain("Early");
  });
});
