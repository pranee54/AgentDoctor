/**
 * Real-world Project Brain validation — one child process per checkout.
 * Parent never builds Brain in-process (isolates OOM / hangs per repo).
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const checkoutsRoot = path.resolve(here, "../real-world/repositories/checkouts");
const reportsDir = path.resolve(here, "reports");
const workerPath = path.join(here, "real-world-worker.ts");
const REPO_TIMEOUT_MS = Number(process.env.BRAIN_RW_TIMEOUT_MS ?? 90_000);

const DEFAULT_REPOS = ["express", "commander", "axios", "gin", "flask", "chi", "clap"];

interface RepoResult {
  id: string;
  ok: boolean;
  buildMs: number;
  persistMs: number;
  reloadMs: number;
  queryMs: number;
  traceMs: number;
  storageBytes: number;
  claimCount: number;
  activeClaimCount: number;
  evidenceCount: number;
  unknownCount: number;
  ownershipCount: number;
  riskCount: number;
  componentCount: number;
  contradictionCount: number;
  explainOk: boolean;
  reloadOk: boolean;
  queryOk: boolean;
  deltaOk: boolean;
  error?: string;
  notes: string[];
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function runWorker(id: string): Promise<RepoResult> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ["--max-old-space-size=2048", "--import", "tsx", workerPath, id, checkoutsRoot, reportsDir],
      {
        cwd: path.resolve(here, "../.."),
        env: { ...process.env, BRAIN_RW_TIMEOUT_MS: String(REPO_TIMEOUT_MS) },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({
        id,
        ok: false,
        buildMs: 0,
        persistMs: 0,
        reloadMs: 0,
        queryMs: 0,
        traceMs: 0,
        storageBytes: 0,
        claimCount: 0,
        activeClaimCount: 0,
        evidenceCount: 0,
        unknownCount: 0,
        ownershipCount: 0,
        riskCount: 0,
        componentCount: 0,
        contradictionCount: 0,
        explainOk: false,
        reloadOk: false,
        queryOk: false,
        deltaOk: false,
        error: `timeout after ${REPO_TIMEOUT_MS}ms`,
        notes: ["controlled failure recorded"],
      });
    }, REPO_TIMEOUT_MS + 5_000);

    child.stdout.on("data", (c: Buffer) => {
      stdout += c.toString("utf8");
    });
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString("utf8");
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      try {
        const line = stdout
          .trim()
          .split("\n")
          .filter((l) => l.startsWith("{"))
          .pop();
        if (!line) {
          resolve({
            id,
            ok: false,
            buildMs: 0,
            persistMs: 0,
            reloadMs: 0,
            queryMs: 0,
            traceMs: 0,
            storageBytes: 0,
            claimCount: 0,
            activeClaimCount: 0,
            evidenceCount: 0,
            unknownCount: 0,
            ownershipCount: 0,
            riskCount: 0,
            componentCount: 0,
            contradictionCount: 0,
            explainOk: false,
            reloadOk: false,
            queryOk: false,
            deltaOk: false,
            error: `worker exit ${code}: ${stderr.slice(0, 400) || "no output"}`,
            notes: ["controlled failure recorded"],
          });
          return;
        }
        resolve(JSON.parse(line) as RepoResult);
      } catch (error) {
        resolve({
          id,
          ok: false,
          buildMs: 0,
          persistMs: 0,
          reloadMs: 0,
          queryMs: 0,
          traceMs: 0,
          storageBytes: 0,
          claimCount: 0,
          activeClaimCount: 0,
          evidenceCount: 0,
          unknownCount: 0,
          ownershipCount: 0,
          riskCount: 0,
          componentCount: 0,
          contradictionCount: 0,
          explainOk: false,
          reloadOk: false,
          queryOk: false,
          deltaOk: false,
          error: error instanceof Error ? error.message : String(error),
          notes: ["controlled failure recorded"],
        });
      }
    });
  });
}

async function main(): Promise<number> {
  await fs.mkdir(reportsDir, { recursive: true });
  const all = process.env.ALL === "1";
  let repos = DEFAULT_REPOS;
  if (all && (await exists(checkoutsRoot))) {
    repos = (await fs.readdir(checkoutsRoot)).sort((a, b) => a.localeCompare(b));
  }

  const results: RepoResult[] = [];
  for (const id of repos) {
    process.stdout.write(`Brain real-world: ${id}... `);
    if (!(await exists(path.join(checkoutsRoot, id)))) {
      const missing: RepoResult = {
        id,
        ok: false,
        buildMs: 0,
        persistMs: 0,
        reloadMs: 0,
        queryMs: 0,
        traceMs: 0,
        storageBytes: 0,
        claimCount: 0,
        activeClaimCount: 0,
        evidenceCount: 0,
        unknownCount: 0,
        ownershipCount: 0,
        riskCount: 0,
        componentCount: 0,
        contradictionCount: 0,
        explainOk: false,
        reloadOk: false,
        queryOk: false,
        deltaOk: false,
        error: "checkout missing",
        notes: ["UNKNOWN: checkout not present locally"],
      };
      results.push(missing);
      console.log("FAIL checkout missing");
      continue;
    }
    const result = await runWorker(id);
    results.push(result);
    console.log(result.ok ? `PASS (${result.buildMs}ms)` : `FAIL ${result.error ?? ""}`.trim());
  }

  const present = results.filter((r) => r.error !== "checkout missing");
  const passed = present.filter((r) => r.ok).length;
  const report = {
    suite: "project-brain-real-world",
    generatedAt: new Date().toISOString(),
    checkoutRoot: checkoutsRoot,
    timeoutMs: REPO_TIMEOUT_MS,
    total: results.length,
    present: present.length,
    passed,
    failed: present.length - passed,
    results,
  };
  const out = path.join(reportsDir, "real-world-latest.json");
  await fs.writeFile(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\n${passed}/${present.length} present repos passed (${results.length} listed)`);
  console.log(`Report: ${out}`);
  return present.length > 0 && passed === present.length ? 0 : 1;
}

const code = await main();
process.exit(code);
