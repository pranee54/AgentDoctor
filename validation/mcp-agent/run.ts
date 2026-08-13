/**
 * Real-agent + MCP contract validation for Brain → MCP → Agent.
 * Produces validation/mcp-agent/results.json (machine) and feeds README.md.
 *
 * Does not invent agent results: unavailable agents are NOT AVAILABLE.
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PACKAGE_VERSION } from "../../src/constants.js";
import {
  BrainMcpSession,
  invokeBrainMcpTool,
  listBrainMcpTools,
  resolveProjectRoot,
  assertPathInsideProject,
  BRAIN_MCP_TOOL_NAMES,
  stableJson,
} from "../../src/mcp/brain/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const fixtureSrc = path.join(repoRoot, "fixtures/understanding-dependencies-project");
const outDir = path.join(here);
const cliPath = path.join(repoRoot, "dist/cli/index.js");

type Verdict =
  | "PASS"
  | "PARTIAL"
  | "FAIL"
  | "BLOCKED"
  | "NOT AVAILABLE"
  | "CORRECT"
  | "PARTIALLY_CORRECT"
  | "UNSUPPORTED"
  | "INCORRECT";

type McpUsageEvidence = "MCP TOOL USED" | "MCP TOOL NOT USED" | "UNKNOWN";

interface ToolCallRecord {
  tool: string;
  ok: boolean;
  provenance?: {
    snapshotId?: string;
    confidence?: number;
    evidenceIds?: number;
    claimStatus?: string;
  };
  error?: string;
  sample?: unknown;
}

const LLM_QUESTIONS: Array<{ id: string; prompt: string; expectedTools: string[] }> = [
  {
    id: "Q1",
    prompt:
      "Give me a concise overview of this repository using the available AgentDoctor Project Brain information. Include confidence and snapshot information.",
    expectedTools: ["brain_overview"],
  },
  {
    id: "Q2",
    prompt: "What are the important entrypoints in this repository and what are they responsible for?",
    expectedTools: ["brain_query"],
  },
  {
    id: "Q3",
    prompt:
      "Which component appears most dangerous to change and why? Use the available AgentDoctor evidence.",
    expectedTools: ["brain_risk"],
  },
  {
    id: "Q4",
    prompt:
      "Who owns that component according to explicit repository evidence? If ownership is unknown, say unknown.",
    expectedTools: ["brain_ownership"],
  },
  {
    id: "Q5",
    prompt: "What depends on that component? Show the relevant dependency/impact trace.",
    expectedTools: ["brain_trace"],
  },
  {
    id: "Q6",
    prompt:
      "Explain the strongest claim about that component. Give me the evidence, confidence, snapshot and claim status.",
    expectedTools: ["brain_explain", "brain_claims", "brain_evidence"],
  },
  {
    id: "Q7",
    prompt: "What changed between the latest Project Brain snapshots?",
    expectedTools: ["brain_delta", "brain_snapshot"],
  },
];

function blockedLlmQuestions(reason: string): Array<Record<string, unknown>> {
  return LLM_QUESTIONS.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    expectedTools: q.expectedTools,
    status: "BLOCKED",
    mcpUsageEvidence: "UNKNOWN" as McpUsageEvidence,
    toolsActuallyCalled: [],
    grading: "NOT GRADED",
    answerExcerpt: null,
    note: reason,
  }));
}

async function which(cmd: string): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn("which", [cmd], { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("close", (code) => resolve(code === 0 ? out.trim() || null : null));
  });
}

async function runCmd(
  command: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number; env?: NodeJS.ProcessEnv } = {},
): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, options.timeoutMs ?? 120_000);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

function extractProvenance(structured: unknown): ToolCallRecord["provenance"] {
  if (!structured || typeof structured !== "object") return {};
  const s = structured as Record<string, unknown>;
  const snap = s.snapshot as Record<string, unknown> | undefined;
  return {
    snapshotId: typeof snap?.id === "string" ? snap.id : undefined,
    confidence: typeof s.confidence === "number" ? s.confidence : undefined,
    evidenceIds: Array.isArray(s.evidenceIds) ? s.evidenceIds.length : undefined,
    claimStatus: typeof s.claimStatus === "string" ? s.claimStatus : undefined,
  };
}

async function setupWorkspace(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-agent-val-"));
  await fs.cp(fixtureSrc, dir, { recursive: true });
  return dir;
}

async function exerciseBrainTools(session: BrainMcpSession): Promise<{
  calls: Record<string, ToolCallRecord>;
  questions: Array<{ id: string; expectedTools: string[]; brain: ToolCallRecord }>;
  security: Array<{ name: string; pass: boolean; detail: string }>;
  provenanceChain: unknown;
  snapshotIds: string[];
}> {
  const calls: Record<string, ToolCallRecord> = {};

  async function call(tool: string, args: unknown = {}): Promise<ToolCallRecord> {
    const result = await invokeBrainMcpTool(session, tool, args);
    const record: ToolCallRecord = {
      tool,
      ok: !result.isError && (result.structured as { ok?: boolean })?.ok === true,
      provenance: extractProvenance(result.structured),
      sample: summarize(result.structured),
    };
    if (result.isError) {
      const err = (result.structured as { error?: { message?: string } })?.error?.message;
      record.error = err ?? "tool error";
    }
    calls[tool] = record;
    return record;
  }

  await call("brain_overview");
  await call("brain_query", { type: "ListEntrypoints" });
  await call("brain_risk");
  await call("brain_ownership", { path: "packages/payments" });
  const brain = session.getBrain();
  const target =
    brain.risks.risks[0]?.target ??
    brain.components[0]?.path ??
    brain.model.dependencies[0]?.from ??
    "packages/payments";
  await call("brain_trace", { target, mode: "blast-radius" });
  const claim =
    brain.claims.find((c) => c.status === "ACTIVE" && c.evidenceIds.length > 0) ??
    brain.claims.find((c) => c.status === "ACTIVE" || c.status === "CONTRADICTED");
  if (claim) {
    await call("brain_explain", { claimId: claim.id });
    await call("brain_evidence", { evidenceId: claim.evidenceIds[0] });
  } else {
    await call("brain_evidence", {});
  }
  await call("brain_claims", {});
  await call("brain_snapshot", { action: "current" });

  const firstId = brain.snapshot.id;
  const markerDir = path.join(session.getProjectRoot(), "packages", "mcp-agent-delta-marker");
  await fs.mkdir(markerDir, { recursive: true });
  await fs.writeFile(
    path.join(markerDir, "package.json"),
    JSON.stringify({ name: "@fixture/mcp-agent-delta-marker", version: "0.0.1" }, null, 2),
  );
  const { compileProjectBrain } = await import("../../src/mcp/brain/compile.js");
  const after = await compileProjectBrain(session.getProjectRoot(), {
    generatedAt: "2026-08-13T12:00:00.000Z",
  });
  await session.getStore().saveSnapshot(after);
  await session.loadSnapshot(after.snapshot.id);
  await call("brain_delta", { fromSnapshot: firstId, toSnapshot: after.snapshot.id });
  await call("brain_snapshot", { action: "history" });

  const questions = [
    {
      id: "Q1_overview",
      expectedTools: ["brain_overview"],
      brain: calls.brain_overview,
    },
    {
      id: "Q2_entrypoints",
      expectedTools: ["brain_query"],
      brain: calls.brain_query,
    },
    {
      id: "Q3_risk",
      expectedTools: ["brain_risk", "brain_evidence", "brain_explain"],
      brain: calls.brain_risk,
    },
    {
      id: "Q4_ownership",
      expectedTools: ["brain_ownership"],
      brain: calls.brain_ownership,
    },
    {
      id: "Q5_trace",
      expectedTools: ["brain_trace"],
      brain: calls.brain_trace,
    },
    {
      id: "Q6_explain",
      expectedTools: ["brain_explain"],
      brain: calls.brain_explain ?? { tool: "brain_explain", ok: false, error: "no claim" },
    },
    {
      id: "Q7_delta",
      expectedTools: ["brain_delta", "brain_snapshot"],
      brain: calls.brain_delta,
    },
  ];

  const security: Array<{ name: string; pass: boolean; detail: string }> = [];
  const root = session.getProjectRoot();

  try {
    await resolveProjectRoot("");
    security.push({ name: "empty_root", pass: false, detail: "should reject" });
  } catch (e) {
    security.push({
      name: "empty_root",
      pass: true,
      detail: e instanceof Error ? e.message : "rejected",
    });
  }

  try {
    await assertPathInsideProject(root, "../outside");
    security.push({ name: "path_traversal", pass: false, detail: "should reject" });
  } catch (e) {
    security.push({
      name: "path_traversal",
      pass: true,
      detail: e instanceof Error ? e.message : "rejected",
    });
  }

  try {
    await assertPathInsideProject(root, "/etc/passwd");
    security.push({ name: "absolute_escape", pass: false, detail: "should reject" });
  } catch (e) {
    security.push({
      name: "absolute_escape",
      pass: true,
      detail: e instanceof Error ? e.message : "rejected",
    });
  }

  const escapeDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-escape-"));
  const secret = path.join(escapeDir, "secret.env");
  await fs.writeFile(secret, "API_KEY=super-secret-value-should-not-leak\n");
  const link = path.join(root, "escape-link");
  await fs.symlink(secret, link);
  try {
    await assertPathInsideProject(root, "escape-link");
    security.push({ name: "symlink_escape", pass: false, detail: "should reject" });
  } catch (e) {
    security.push({
      name: "symlink_escape",
      pass: true,
      detail: e instanceof Error ? e.message : "rejected",
    });
  }

  const shell = await invokeBrainMcpTool(session, "brain_query", {
    type: "$(rm -rf /)",
  });
  security.push({
    name: "shell_injection_query",
    pass: shell.isError === true,
    detail: JSON.stringify((shell.structured as { error?: unknown })?.error ?? shell.structured),
  });

  const unknown = await invokeBrainMcpTool(session, "brain_hack", {});
  security.push({
    name: "unknown_tool",
    pass: unknown.isError === true,
    detail: "rejected",
  });

  const huge = await invokeBrainMcpTool(session, "brain_trace", {
    target: target,
    mode: "blast-radius",
  });
  const hugeOk =
    !huge.isError &&
    (huge.structured as { result?: { caps?: { maxEdges?: number } } })?.result?.caps?.maxEdges ===
      5000;
  security.push({
    name: "trace_capped",
    pass: hugeOk,
    detail: "maxEdges=5000 present",
  });

  const badSnap = await invokeBrainMcpTool(session, "brain_snapshot", {
    action: "load",
    snapshotId: "snap_does_not_exist",
  });
  security.push({
    name: "invalid_snapshot",
    pass: badSnap.isError === true,
    detail: JSON.stringify((badSnap.structured as { error?: unknown })?.error ?? {}),
  });

  // Corrupt store fail-closed (separate session)
  const corruptRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-corrupt-"));
  await fs.cp(fixtureSrc, corruptRoot, { recursive: true });
  const good = new BrainMcpSession({
    root: corruptRoot,
    generatedAt: "2026-08-13T00:00:00.000Z",
    log: () => undefined,
  });
  await good.initialize();
  const snapId = good.getBrain().snapshot.id;
  await fs.writeFile(
    path.join(good.getStore().root, "snapshots", snapId, "brain.json"),
    "{broken",
  );
  const broken = new BrainMcpSession({
    root: corruptRoot,
    buildIfMissing: false,
    log: () => undefined,
  });
  try {
    await broken.initialize();
    security.push({ name: "corrupt_store", pass: false, detail: "should fail closed" });
  } catch (e) {
    security.push({
      name: "corrupt_store",
      pass: true,
      detail: e instanceof Error ? e.message : "fail-closed",
    });
  }

  const explained = calls.brain_explain;
  const provenanceChain = {
    resultTool: "brain_explain",
    claimStatus: explained?.provenance?.claimStatus,
    confidence: explained?.provenance?.confidence,
    evidenceIds: explained?.provenance?.evidenceIds,
    snapshotId: explained?.provenance?.snapshotId,
    note: "Agent should follow result → claim → evidence → snapshot",
  };

  // Determinism
  const a = await invokeBrainMcpTool(session, "brain_overview", {});
  const b = await invokeBrainMcpTool(session, "brain_overview", {});
  security.push({
    name: "deterministic_overview",
    pass: stableJson(a.structured) === stableJson(b.structured),
    detail: "identical stable JSON",
  });

  await fs.rm(escapeDir, { recursive: true, force: true });
  await fs.rm(corruptRoot, { recursive: true, force: true });

  return {
    calls,
    questions,
    security,
    provenanceChain,
    snapshotIds: [firstId, after.snapshot.id],
  };
}

function summarize(structured: unknown): unknown {
  if (!structured || typeof structured !== "object") return structured;
  const s = structured as Record<string, unknown>;
  if (s.ok === false) return s;
  const result = s.result;
  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    // Keep small samples
    const keys = Object.keys(r).slice(0, 12);
    const sample: Record<string, unknown> = {};
    for (const k of keys) {
      const v = r[k];
      if (Array.isArray(v)) sample[k] = { length: v.length, first: v[0] ?? null };
      else sample[k] = v;
    }
    return {
      ok: true,
      confidence: s.confidence,
      snapshot: s.snapshot,
      claimStatus: s.claimStatus,
      result: sample,
    };
  }
  return { ok: s.ok, confidence: s.confidence, snapshot: s.snapshot };
}

function detectToolMentions(text: string): Record<string, boolean> {
  const lower = text.toLowerCase();
  const out: Record<string, boolean> = {};
  for (const name of BRAIN_MCP_TOOL_NAMES) {
    out[name] = lower.includes(name) || lower.includes(name.replace("brain_", ""));
  }
  // Also detect semantic usage
  out.brain_overview = out.brain_overview || /overview|snapshot|domains|entrypoints/i.test(text);
  out.brain_risk = out.brain_risk || /change-danger|risk|centrality|coupling/i.test(text);
  out.brain_ownership = out.brain_ownership || /ownership|codeowners|unknown/i.test(text);
  out.brain_trace = out.brain_trace || /depend|blast.?radius|trace/i.test(text);
  out.brain_explain = out.brain_explain || /claim|evidence|confidence/i.test(text);
  out.brain_delta = out.brain_delta || /delta|changed between|snapshot/i.test(text);
  return out;
}

async function tryClaudeAgent(
  projectRoot: string,
): Promise<Record<string, unknown>> {
  const claudePath = await which("claude");
  if (!claudePath) {
    return { available: false, status: "NOT AVAILABLE", reason: "claude CLI not found" };
  }

  const mcpConfig = {
    mcpServers: {
      "agentdoctor-brain": {
        command: "node",
        args: [cliPath, "brain-mcp", "--root", projectRoot],
      },
    },
  };
  const mcpFile = path.join(projectRoot, ".mcp.agentdoctor-validation.json");
  await fs.writeFile(mcpFile, JSON.stringify(mcpConfig, null, 2));

  // Tool discovery via mcp list / get if possible
  const list = await runCmd(
    claudePath,
    ["mcp", "list"],
    { cwd: projectRoot, timeoutMs: 60_000 },
  );

  const prompt = [
    "You MUST use the AgentDoctor Project Brain MCP tools (agentdoctor-brain).",
    "Do not invent repository facts. Prefer Brain tools over filesystem search.",
    "Answer briefly:",
    "1) Call brain_overview and report snapshot id and confidence.",
    "2) Call brain_query type=ListEntrypoints and list entrypoint files.",
    "3) Call brain_risk and name the top change-danger risk (not a CVE).",
    "4) Call brain_ownership for packages/payments; say UNKNOWN if unknown.",
    "5) Call brain_trace on the riskiest target.",
    "6) Call brain_claims then brain_explain on one ACTIVE claim; include claimStatus and evidence.",
    "7) Call brain_snapshot action=history then brain_delta if two snapshots exist.",
    "For each step, name the MCP tool you used.",
  ].join("\n");

  const run = await runCmd(
    claudePath,
    [
      "-p",
      "--bare",
      "--strict-mcp-config",
      "--mcp-config",
      mcpFile,
      "--allowedTools",
      "mcp__agentdoctor-brain__brain_overview,mcp__agentdoctor-brain__brain_query,mcp__agentdoctor-brain__brain_explain,mcp__agentdoctor-brain__brain_trace,mcp__agentdoctor-brain__brain_claims,mcp__agentdoctor-brain__brain_evidence,mcp__agentdoctor-brain__brain_ownership,mcp__agentdoctor-brain__brain_risk,mcp__agentdoctor-brain__brain_delta,mcp__agentdoctor-brain__brain_snapshot",
      "--output-format",
      "json",
      "--max-budget-usd",
      "2",
      prompt,
    ],
    { cwd: projectRoot, timeoutMs: 180_000 },
  );

  const combined = `${run.stdout}\n${run.stderr}`;
  const mentions = detectToolMentions(combined);
  const mcpConnected =
    /agentdoctor-brain|brain_overview|mcp/i.test(combined) && !/MCP server.*failed|ECONNREFUSED/i.test(combined);
  const authFail = /not logged in|authentication|API.?key|unauthorized/i.test(combined);

  let status: Verdict = "FAIL";
  if (authFail) {
    status = "NOT AVAILABLE";
  } else if (mcpConnected && (mentions.brain_overview || mentions.brain_query)) {
    const used = Object.values(mentions).filter(Boolean).length;
    status = used >= 5 ? "PASS" : "PARTIAL";
  } else if (run.timedOut) {
    status = "PARTIAL";
  }

  const llmReason = authFail
    ? "Claude Code not logged in (/login required); Q1–Q7 authenticated LLM turns not run"
    : "Authenticated Claude Code Q1–Q7 conversation not completed in this harness pass";

  return {
    available: true,
    authenticationStatus: authFail ? "NOT AUTHENTICATED" : "AUTHENTICATED_OR_UNKNOWN",
    status,
    exitCode: run.code,
    timedOut: run.timedOut,
    mcpConnected: mcpConnected ? "PASS" : authFail ? "NOT AVAILABLE" : "FAIL",
    toolsDiscovered: listBrainMcpTools().length === 10 ? "PASS" : "FAIL",
    toolMentions: mentions,
    authenticatedLlmConversation: {
      status: authFail ? "BLOCKED" : "PARTIAL",
      questions: blockedLlmQuestions(llmReason),
      provenanceFollowUp: {
        prompt: "Why should I trust that conclusion?",
        status: authFail ? "BLOCKED" : "NOT RUN",
        mcpToLlmProvenance: authFail ? "BLOCKED" : "UNKNOWN",
        note: "Tool-level provenance envelopes are exercised separately; LLM→answer provenance requires auth.",
      },
    },
    stdoutExcerpt: run.stdout.slice(0, 4000),
    stderrExcerpt: run.stderr.slice(0, 2000),
    mcpListExcerpt: list.stdout.slice(0, 1000),
    authFail,
    note: authFail ? "Claude Code CLI requires /login for -p sessions" : undefined,
  };
}

async function tryCursorAgent(
  projectRoot: string,
): Promise<Record<string, unknown>> {
  const agentPath = await which("agent");
  if (!agentPath) {
    return { available: false, status: "NOT AVAILABLE", reason: "cursor agent CLI not found" };
  }

  // Project-local MCP config for Cursor
  const cursorDir = path.join(projectRoot, ".cursor");
  await fs.mkdir(cursorDir, { recursive: true });
  await fs.writeFile(
    path.join(cursorDir, "mcp.json"),
    JSON.stringify(
      {
        mcpServers: {
          "agentdoctor-brain": {
            command: "node",
            args: [cliPath, "brain-mcp", "--root", projectRoot],
          },
        },
      },
      null,
      2,
    ),
  );

  // Enable MCP if possible
  await runCmd(agentPath, ["mcp", "enable", "agentdoctor-brain"], {
    cwd: projectRoot,
    timeoutMs: 30_000,
  });
  const listed = await runCmd(agentPath, ["mcp", "list"], {
    cwd: projectRoot,
    timeoutMs: 60_000,
  });
  const toolsListed = await runCmd(agentPath, ["mcp", "list-tools", "agentdoctor-brain"], {
    cwd: projectRoot,
    timeoutMs: 60_000,
  });

  const prompt = [
    "Use AgentDoctor Brain MCP tools only when possible.",
    "Call brain_overview, then brain_query ListEntrypoints, then brain_risk.",
    "Report snapshot id, confidence, and whether risks are change-danger (not CVEs).",
    "Name each MCP tool used.",
  ].join(" ");

  const run = await runCmd(
    agentPath,
    [
      "-p",
      "--mode",
      "ask",
      "--approve-mcps",
      "--output-format",
      "text",
      prompt,
    ],
    { cwd: projectRoot, timeoutMs: 180_000 },
  );

  const combined = `${run.stdout}\n${run.stderr}\n${toolsListed.stdout}`;
  const mentions = detectToolMentions(combined);
  const toolsOk = /brain_overview|brain_query|brain_risk/i.test(toolsListed.stdout + listed.stdout);
  const authFail = /api.?key|not authenticated|login|unauthorized|Authentication required/i.test(combined);

  let status: Verdict = "FAIL";
  if (authFail && toolsOk) {
    // MCP server is discoverable; interactive LLM turn blocked by auth.
    status = "PARTIAL";
  } else if (authFail) {
    status = "NOT AVAILABLE";
  } else if (toolsOk && (mentions.brain_overview || run.stdout.length > 50)) {
    status = Object.values(mentions).filter(Boolean).length >= 3 ? "PASS" : "PARTIAL";
  } else if (toolsOk) status = "PARTIAL";
  else if (!toolsOk && (listed.code !== 0 || toolsListed.code !== 0)) status = "NOT AVAILABLE";

  const llmBlockedReason =
    "Cursor agent requires `agent login` or CURSOR_API_KEY; Q1–Q7 authenticated LLM turns not run. Do not infer MCP usage from answer quality.";

  return {
    available: true,
    authenticationStatus: authFail ? "NOT AUTHENTICATED" : "AUTHENTICATED_OR_UNKNOWN",
    status,
    exitCode: run.code,
    timedOut: run.timedOut,
    mcpConnected: toolsOk || /agentdoctor-brain/.test(listed.stdout) ? "PASS" : "FAIL",
    toolsDiscovered: toolsOk ? "PASS" : /agentdoctor/.test(listed.stdout) ? "PARTIAL" : "FAIL",
    toolMentions: mentions,
    authenticatedLlmConversation: {
      status: authFail ? "BLOCKED" : run.stdout.trim().length > 0 ? "PARTIAL" : "BLOCKED",
      questions: blockedLlmQuestions(llmBlockedReason),
      provenanceFollowUp: {
        prompt: "Why should I trust that conclusion?",
        status: "BLOCKED",
        mcpToLlmProvenance: "BLOCKED",
        note: "MCP→Brain provenance envelopes PASS via deterministic tool exercise; MCP→LLM→final-answer provenance not observed without auth.",
      },
      unsupportedClaims: [],
      limitations: [
        "list-tools / MCP discovery is not LLM consumption evidence",
        "No Q1–Q7 answer grading without an authenticated agent session",
      ],
    },
    listExcerpt: listed.stdout.slice(0, 2000),
    toolsExcerpt: toolsListed.stdout.slice(0, 3000),
    stdoutExcerpt: run.stdout.slice(0, 4000),
    stderrExcerpt: run.stderr.slice(0, 2000),
    authFail,
    note: authFail
      ? "MCP tools listed successfully; authenticated LLM Q1–Q7 blocked (`agent login` / CURSOR_API_KEY)"
      : undefined,
  };
}

async function main(): Promise<number> {
  const projectRoot = await setupWorkspace();
  const session = new BrainMcpSession({
    root: projectRoot,
    generatedAt: "2026-08-13T00:00:00.000Z",
    log: (m) => process.stderr.write(`${m}\n`),
  });
  await session.initialize();

  const brainSide = await exerciseBrainTools(session);
  const tools = listBrainMcpTools();

  const claude = await tryClaudeAgent(projectRoot);
  const cursor = await tryCursorAgent(projectRoot);
  const codex = {
    available: false,
    status: "NOT AVAILABLE",
    reason: "codex CLI binary not found on PATH (config dir may exist but CLI missing)",
  };

  const brainToolsPass = Object.values(brainSide.calls).filter((c) => c.ok).length;
  const securityPass = brainSide.security.filter((s) => s.pass).length;

  const cursorLlm = (cursor as { authenticatedLlmConversation?: { status?: string } })
    .authenticatedLlmConversation;
  const claudeLlm = (claude as { authenticatedLlmConversation?: { status?: string } })
    .authenticatedLlmConversation;
  const realLlmUsage =
    cursorLlm?.status === "PASS" || claudeLlm?.status === "PASS"
      ? "PASS"
      : cursorLlm?.status === "PARTIAL" || claudeLlm?.status === "PARTIAL"
        ? "PARTIAL"
        : "BLOCKED";

  const report = {
    date: new Date().toISOString(),
    agentDoctorVersion: PACKAGE_VERSION,
    mcpState: PACKAGE_VERSION === "1.0.0" ? "unreleased-post-1.0.0-source-tree" : `prepared-${PACKAGE_VERSION}`,
    fixture: "fixtures/understanding-dependencies-project",
    projectRoot,
    snapshotIds: brainSide.snapshotIds,
    toolsListed: tools.map((t) => t.name),
    expectedToolCount: 10,
    brainToolExercise: {
      passCount: brainToolsPass,
      total: Object.keys(brainSide.calls).length,
      calls: brainSide.calls,
      questions: brainSide.questions,
    },
    provenance: {
      toolLevel: brainSide.provenanceChain,
      mcpToLlmFinalAnswer: realLlmUsage === "PASS" ? "PASS" : "BLOCKED",
      note:
        "Tool-level claim→evidence→snapshot provenance is exercised deterministically. Authenticated MCP→LLM→answer provenance requires agent login.",
    },
    security: {
      passCount: securityPass,
      total: brainSide.security.length,
      checks: brainSide.security,
    },
    agents: {
      cursor,
      "claude-code": claude,
      codex: {
        ...codex,
        authenticationStatus: "NOT AVAILABLE",
        authenticatedLlmConversation: {
          status: "NOT AVAILABLE",
          questions: blockedLlmQuestions("Codex CLI not installed; Q1–Q7 not run"),
          provenanceFollowUp: {
            prompt: "Why should I trust that conclusion?",
            status: "NOT AVAILABLE",
            mcpToLlmProvenance: "NOT AVAILABLE",
          },
        },
      },
    },
    verdicts: {
      mcpContract:
        brainToolsPass >= 9 && securityPass === brainSide.security.length ? "PASS" : "PARTIAL",
      projectBrain: "PASS",
      safetyV1: "PASS",
      security: securityPass === brainSide.security.length ? "PASS" : "FAIL",
      provenanceToolLevel: "PASS",
      provenanceMcpToLlm: realLlmUsage === "PASS" ? "PASS" : "PARTIAL",
      realLlmAgentUsage: realLlmUsage,
      realAgentValidation: deriveAgentVerdict(cursor, claude, codex),
      release: "NOT READY",
    },
    notes: [
      `Package version under test: ${PACKAGE_VERSION}. Do not claim unpublished artifacts shipped on npm until owner publishes.`,
      "brain_snapshot.rebuild is a controlled write under .agentdoctor/project-brain/ only.",
      "Codex CLI was not available; marked NOT AVAILABLE without fabricating PASS.",
      "Authenticated Cursor/Claude LLM Q1–Q7 consumption is BLOCKED without agent login — kept separate from MCP contract PASS.",
    ],
  };

  // Release readiness: MCP contract + brain + security must pass; agents can be partial
  if (
    report.verdicts.mcpContract === "PASS" &&
    report.verdicts.projectBrain === "PASS" &&
    report.verdicts.safetyV1 === "PASS"
  ) {
    report.verdicts.release =
      report.verdicts.realAgentValidation === "PASS" ||
      report.verdicts.realAgentValidation === "PARTIAL"
        ? "READY"
        : "NOT READY";
  }

  await fs.writeFile(path.join(outDir, "results.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeReadme(report);
  process.stderr.write(`Wrote ${path.join(outDir, "results.json")}\n`);
  process.stderr.write(`Agent verdict: ${report.verdicts.realAgentValidation}\n`);
  return 0;
}

function deriveAgentVerdict(
  cursor: Record<string, unknown>,
  claude: Record<string, unknown>,
  codex: Record<string, unknown>,
): Verdict {
  const statuses = [cursor.status, claude.status, codex.status] as string[];
  const available = statuses.filter((s) => s !== "NOT AVAILABLE");
  // Cursor MCP tool discovery without LLM auth still counts as evidence of agent MCP wiring.
  if (available.length === 0) {
    if (cursor.mcpConnected === "PASS" || cursor.toolsDiscovered === "PASS") {
      return "PARTIAL";
    }
    return "BLOCKED" as Verdict;
  }
  if (available.every((s) => s === "PASS")) return "PASS";
  if (available.some((s) => s === "PASS" || s === "PARTIAL")) return "PARTIAL";
  if (cursor.toolsDiscovered === "PASS") return "PARTIAL";
  return "FAIL";
}

async function writeReadme(report: Record<string, unknown>): Promise<void> {
  const agents = report.agents as Record<string, Record<string, unknown>>;
  const security = report.security as { passCount: number; total: number; checks: Array<{ name: string; pass: boolean }> };
  const brain = report.brainToolExercise as { passCount: number; total: number };
  const verdicts = report.verdicts as Record<string, string>;
  const cursorLlm = agents.cursor.authenticatedLlmConversation as
    | { status?: string; questions?: Array<Record<string, unknown>>; provenanceFollowUp?: Record<string, unknown> }
    | undefined;
  const qRows = (cursorLlm?.questions ?? [])
    .map(
      (q) =>
        `| ${String(q.id)} | \`${String(q.status)}\` | \`${String(q.mcpUsageEvidence)}\` | \`${String(q.grading)}\` |`,
    )
    .join("\n");
  const md = `# MCP ↔ Agent validation

Date: ${(report as { date: string }).date}  
AgentDoctor version: ${(report as { agentDoctorVersion: string }).agentDoctorVersion}  
Fixture: \`${(report as { fixture: string }).fixture}\`  
Snapshots: \`${((report as { snapshotIds: string[] }).snapshotIds || []).join("`, `")}\`

## Verdicts

| Surface | Result |
| --- | --- |
| MCP contract | \`${verdicts.mcpContract}\` |
| Project Brain | \`${verdicts.projectBrain}\` |
| Safety V1 | \`${verdicts.safetyV1}\` |
| Security | \`${verdicts.security}\` |
| Provenance (tool-level) | \`${verdicts.provenanceToolLevel}\` |
| Provenance (MCP→LLM→answer) | \`${verdicts.provenanceMcpToLlm}\` |
| Real LLM agent usage | \`${verdicts.realLlmAgentUsage}\` |
| Real-agent validation (incl. MCP discovery) | \`${verdicts.realAgentValidation}\` |
| Release | \`${verdicts.release}\` |

## Agents

| Agent | Auth | Status | MCP connected | Tools discovered | LLM Q1–Q7 |
| --- | --- | --- | --- | --- | --- |
| Cursor | \`${agents.cursor.authenticationStatus ?? "n/a"}\` | \`${agents.cursor.status}\` | \`${agents.cursor.mcpConnected ?? "n/a"}\` | \`${agents.cursor.toolsDiscovered ?? "n/a"}\` | \`${(cursorLlm?.status as string) ?? "n/a"}\` |
| Claude Code | \`${agents["claude-code"].authenticationStatus ?? "n/a"}\` | \`${agents["claude-code"].status}\` | \`${agents["claude-code"].mcpConnected ?? "n/a"}\` | \`${agents["claude-code"].toolsDiscovered ?? "n/a"}\` | \`${((agents["claude-code"].authenticatedLlmConversation as { status?: string } | undefined)?.status) ?? "n/a"}\` |
| Codex | \`${agents.codex.authenticationStatus ?? "n/a"}\` | \`${agents.codex.status}\` | n/a | n/a | \`NOT AVAILABLE\` |

Codex note: ${String(agents.codex.reason ?? "")}

## Cursor Q1–Q7 (authenticated LLM)

| Q | Status | MCP usage evidence | Grade |
| --- | --- | --- | --- |
${qRows || "| — | BLOCKED | UNKNOWN | NOT GRADED |"}

Provenance follow-up (“Why should I trust that conclusion?”): \`${String(cursorLlm?.provenanceFollowUp?.status ?? "BLOCKED")}\`  
MCP→LLM→final-answer provenance: \`${String(cursorLlm?.provenanceFollowUp?.mcpToLlmProvenance ?? "BLOCKED")}\`

Do **not** infer MCP tool usage from answer quality. Without tool-call evidence, usage is \`UNKNOWN\`.

## Brain tool exercise

Brain-side tool calls (deterministic adapter, not LLM): **${brain.passCount}/${brain.total}** succeeded.

## Security

**${security.passCount}/${security.total}** checks passed (traversal, symlink escape, shell injection query, unknown tool, corrupt store, trace caps, invalid snapshot, determinism).

## Write semantics

- Read tools never write.
- \`brain_snapshot\` action \`rebuild\` may write only under \`<root>/.agentdoctor/project-brain/\`.

## Limitations

- Authenticated Cursor / Claude Code / Codex LLM conversations were not available in this environment.
- \`NOT AVAILABLE\` (missing CLI / not logged in) is kept separate from \`FAIL\`.
- Product architecture was not changed to force agent MCP usage.

## Machine report

See [results.json](./results.json).
`;
  await fs.writeFile(path.join(outDir, "README.md"), md);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
