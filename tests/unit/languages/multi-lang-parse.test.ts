import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  dartAdapter,
  javaAdapter,
  kotlinAdapter,
  parseDartSource,
  parseJavaSource,
  parseKotlinSource,
  parseRustSource,
  rustAdapter,
} from "../../../src/languages/index.js";

const fixture = (name: string) =>
  path.resolve(import.meta.dirname, "../../fixtures/languages", name);

describe("JVM/native lightweight parsers", () => {
  it("parses Java package, import, class, method", async () => {
    const source = await fs.readFile(fixture("Main.java"), "utf8");
    const summary = parseJavaSource("Main.java", source);
    expect(summary.packageName).toBe("com.example.app");
    expect(summary.imports.some((i) => i.specifier.includes("List"))).toBe(true);
    expect(summary.symbols.some((s) => s.name === "Main" && s.kind === "class")).toBe(true);

    const parsed = await javaAdapter.parse("Main.java", source);
    expect(parsed.ok).toBe(true);
    expect(parsed.capabilities.types).toBe("partial");
    expect(parsed.limitations.join(" ")).toMatch(/EXTERNAL/i);
  });

  it("parses Kotlin package, import, class, fun", async () => {
    const source = await fs.readFile(fixture("sample.kt"), "utf8");
    const summary = parseKotlinSource("sample.kt", source);
    expect(summary.packageName).toBe("com.example");
    expect(summary.symbols.some((s) => s.name === "Greeter")).toBe(true);
    expect(summary.symbols.some((s) => s.name === "hello")).toBe(true);

    const parsed = await kotlinAdapter.parse("sample.kt", source);
    expect(parsed.ok).toBe(true);
    expect(parsed.capabilities.imports).toBe("supported");
  });

  it("parses Rust mod, use, struct, fn", async () => {
    const source = await fs.readFile(fixture("lib.rs"), "utf8");
    const summary = parseRustSource("lib.rs", source);
    expect(summary.moduleName).toBe("utils");
    expect(summary.imports.some((i) => i.specifier.includes("Path"))).toBe(true);
    expect(summary.symbols.some((s) => s.name === "run")).toBe(true);

    const parsed = await rustAdapter.parse("lib.rs", source);
    expect(parsed.ok).toBe(true);
    expect(parsed.capabilities.calls).toBe("partial");
  });

  it("parses Dart import and class", async () => {
    const source = await fs.readFile(fixture("widget.dart"), "utf8");
    const summary = parseDartSource("widget.dart", source);
    expect(summary.imports.some((i) => i.specifier.includes("material"))).toBe(true);
    expect(summary.symbols.some((s) => s.name === "WidgetPanel")).toBe(true);

    const parsed = await dartAdapter.parse("widget.dart", source);
    expect(parsed.ok).toBe(true);
    expect(parsed.capabilities.symbols).toBe("supported");
  });
});
