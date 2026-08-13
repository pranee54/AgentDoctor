import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { appendHistoryIndex } from "../../../validation/real-world/runner/report.js";
import type { HistoryEntry } from "../../../validation/real-world/types.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((d) => fsPromises.rm(d, { recursive: true, force: true })),
  );
});

function sampleEntry(stamp: string): HistoryEntry {
  return {
    suiteVersion: "test",
    generatedAt: stamp,
    compilerScore: 90,
    passAggregates: {} as HistoryEntry["passAggregates"],
    failedRepositories: [],
    repositoryScores: [{ id: "demo", score: 90, executionTimeMs: 1 }],
  };
}

describe("appendHistoryIndex", () => {
  it("starts with [] when index.json is missing", async () => {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "history-index-"));
    tempDirs.push(dir);
    const indexPath = path.join(dir, "index.json");
    const entry = sampleEntry("2026-01-01T00:00:00.000Z");

    appendHistoryIndex(entry, indexPath);

    const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8")) as HistoryEntry[];
    expect(parsed).toEqual([entry]);
  });

  it("appends to an existing history index", async () => {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "history-index-"));
    tempDirs.push(dir);
    const indexPath = path.join(dir, "index.json");
    const first = sampleEntry("2026-01-01T00:00:00.000Z");
    const second = sampleEntry("2026-01-02T00:00:00.000Z");
    fs.writeFileSync(indexPath, `${JSON.stringify([first], null, 2)}\n`);

    appendHistoryIndex(second, indexPath);

    const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8")) as HistoryEntry[];
    expect(parsed).toEqual([first, second]);
  });

  it("preserves pretty-printed JSON with trailing newline", async () => {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "history-index-"));
    tempDirs.push(dir);
    const indexPath = path.join(dir, "index.json");
    const entry = sampleEntry("2026-01-03T00:00:00.000Z");

    appendHistoryIndex(entry, indexPath);

    expect(fs.readFileSync(indexPath, "utf8")).toBe(`${JSON.stringify([entry], null, 2)}\n`);
  });

  it("rethrows when index.json exists but is malformed", async () => {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "history-index-"));
    tempDirs.push(dir);
    const indexPath = path.join(dir, "index.json");
    fs.writeFileSync(indexPath, "{not-json\n");

    expect(() => appendHistoryIndex(sampleEntry("2026-01-04T00:00:00.000Z"), indexPath)).toThrow();
  });
});
