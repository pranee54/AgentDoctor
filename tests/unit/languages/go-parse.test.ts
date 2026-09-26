import { describe, expect, it } from "vitest";

import { goAdapter, parseGoSource } from "../../../src/languages/go.js";

describe("Go lightweight parser", () => {
  it("extracts package, imports, func, type", async () => {
    const source = `package main

import "fmt"

type User struct {}

func Hello() {}
`;
    const summary = parseGoSource("main.go", source);
    expect(summary.packageName).toBe("main");
    expect(summary.imports.some((i) => i.specifier === "fmt")).toBe(true);
    expect(summary.symbols.some((s) => s.name === "Hello")).toBe(true);

    const parsed = await goAdapter.parse("main.go", source);
    expect(parsed.ok).toBe(true);
    expect(parsed.capabilities.parse).toBe("supported");
    expect(parsed.capabilities.calls).toBe("partial");
  });
});
