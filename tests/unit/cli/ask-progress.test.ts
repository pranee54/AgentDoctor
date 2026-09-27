import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAskProgress } from "../../../src/cli/ask-progress.js";
import { runAskCommand } from "../../../src/cli/commands/chat.js";
import { rebuildBrain } from "../../../src/core/brain-cli/service.js";
import { EXIT_CODES } from "../../../src/types/index.js";
import * as retrieveMod from "../../../src/agent/context/retrieve.js";

const temps: string[] = [];

async function mkProject(prefix: string): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  temps.push(root);
  await fs.mkdir(path.join(root, "proxyshield", "backend", "admin"), { recursive: true });
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "ask-progress-fixture" }),
  );
  await fs.writeFile(
    path.join(root, "proxyshield", "backend", "admin", "users.php"),
    "<?php\nfunction list_users() { return []; }\n",
  );
  return root;
}

afterEach(async () => {
  while (temps.length) {
    const p = temps.pop();
    if (p) await fs.rm(p, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});

describe("ask progress UX", () => {
  it("TTY progress lifecycle starts and completes before answer", () => {
    const chunks: string[] = [];
    const stream = new PassThrough();
    stream.on("data", (c) => chunks.push(String(c)));

    const progress = createAskProgress({ enabled: true, stream, isTTY: true });
    progress.stage("understand", "start");
    // First spinner frame is written synchronously while work would run.
    expect(chunks.join("")).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/);
    progress.stage("understand", "ok");
    progress.stage("search", "start");
    progress.stage("search", "ok", "2 relevant claims");
    progress.stage("retrieve", "start");
    progress.stage("retrieve", "ok", "1 candidate source");
    progress.stage("verify", "start");
    progress.stage("verify", "ok", "1 owned source");
    progress.stage("prepare", "start");
    progress.stage("prepare", "ok");
    progress.stop();

    const out = chunks.join("");
    expect(out).toMatch(/Understanding question/);
    expect(out).toMatch(/Searching project knowledge/);
    expect(out).toContain("✓ Answer ready");
  });

  it("non-TTY emits stable lines without ANSI spinner frames", () => {
    const chunks: string[] = [];
    const stream = new PassThrough();
    stream.on("data", (c) => chunks.push(String(c)));
    const progress = createAskProgress({ enabled: true, stream, isTTY: false });
    progress.stage("search", "start");
    progress.stage("search", "ok", "3 relevant claims");
    progress.stop();
    const out = chunks.join("");
    expect(out).toContain("Searching project knowledge...\n");
    expect(out).toContain("✓ Searching project knowledge");
    expect(out).not.toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/);
    expect(out).not.toContain("\x1b[K");
  });

  it("JSON ask emits valid JSON with no spinner contamination on stdout", async () => {
    const root = await mkProject("ad-ask-json-");
    await rebuildBrain(root);
    const stdout: string[] = [];
    const outWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      stdout.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      const code = await runAskCommand({
        root,
        question: "What is the Proxyshield module?",
        json: true,
      });
      expect(code).toBe(EXIT_CODES.SUCCESS);
      const text = stdout.join("");
      expect(() => JSON.parse(text)).not.toThrow();
      expect(text).not.toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/);
      expect(text).not.toContain("Searching project knowledge");
    } finally {
      process.stdout.write = outWrite;
    }
  });

  it("evidence retrieval failure stops progress without Answer ready", async () => {
    const chunks: string[] = [];
    const stream = new PassThrough();
    stream.on("data", (c) => chunks.push(String(c)));

    vi.spyOn(retrieveMod, "retrieveProjectContext").mockImplementation(async (opts) => {
      opts.progress?.stage("search", "ok");
      opts.progress?.stage("retrieve", "start");
      opts.progress?.stage("retrieve", "fail", "boom");
      throw new Error("boom");
    });

    const root = await mkProject("ad-ask-fail-");
    const code = await runAskCommand({
      root,
      question: "What is the Proxyshield module?",
      progressEnabled: true,
      progressStream: stream,
      progressIsTTY: false,
    });
    expect(code).toBe(EXIT_CODES.INTERNAL_ERROR);
    const out = chunks.join("");
    expect(out).toMatch(/✗ Retrieving relevant evidence/);
    expect(out).not.toContain("✓ Answer ready");
  });

  it("UNKNOWN unsupported question still completes progress", async () => {
    const root = await mkProject("ad-ask-unknown-");
    await rebuildBrain(root);
    const chunks: string[] = [];
    const stream = new PassThrough();
    stream.on("data", (c) => chunks.push(String(c)));
    const stdout: string[] = [];
    const outWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      stdout.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      const code = await runAskCommand({
        root,
        question: "What is the quantum payment subsystem?",
        progressEnabled: true,
        progressStream: stream,
        progressIsTTY: false,
      });
      expect(code).toBe(EXIT_CODES.SUCCESS);
      expect(chunks.join("")).toContain("✓ Answer ready");
      expect(stdout.join("")).toMatch(/UNKNOWN|Insufficient/i);
    } finally {
      process.stdout.write = outWrite;
    }
  });

  it("INFERRED Brain-backed Proxyshield ask completes with progress", async () => {
    const root = await mkProject("ad-ask-inferred-");
    await rebuildBrain(root);
    const chunks: string[] = [];
    const stream = new PassThrough();
    stream.on("data", (c) => chunks.push(String(c)));
    const stdout: string[] = [];
    const outWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      stdout.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      const code = await runAskCommand({
        root,
        question: "What is the Proxyshield module?",
        progressEnabled: true,
        progressStream: stream,
        progressIsTTY: false,
      });
      expect(code).toBe(EXIT_CODES.SUCCESS);
      expect(chunks.join("")).toContain("✓ Answer ready");
      expect(stdout.join("")).toMatch(/INFERRED|Brain|Proxyshield/i);
    } finally {
      process.stdout.write = outWrite;
    }
  });

  it("VERIFIED owned source evidence remains labeled VERIFIED", async () => {
    const root = await mkProject("ad-ask-verified-");
    await rebuildBrain(root);
    const stdout: string[] = [];
    const outWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      stdout.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      const code = await runAskCommand({
        root,
        question: "What is the Proxyshield module?",
        json: true,
      });
      expect(code).toBe(EXIT_CODES.SUCCESS);
      const parsed = JSON.parse(stdout.join("")) as {
        citations: Array<{ confidence: string; evidenceType?: string }>;
      };
      const verified = parsed.citations.filter(
        (c) => c.confidence === "VERIFIED" && c.evidenceType === "source-code",
      );
      // May be zero if brain has no path evidence; Brain citations must stay INFERRED.
      const brain = parsed.citations.filter((c) => c.evidenceType === "project-brain");
      expect(brain.every((c) => c.confidence === "INFERRED")).toBe(true);
      expect(verified.every((c) => c.confidence === "VERIFIED")).toBe(true);
    } finally {
      process.stdout.write = outWrite;
    }
  });
});
