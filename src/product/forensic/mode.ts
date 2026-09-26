import { analyzeGitIntelligence } from "../../intelligence/git/analyze.js";
import { getBrainStatus } from "../../core/brain-cli/service.js";
import { readChangeLedger } from "../ledger/change-ledger.js";
import { loadDecisionLedger } from "../decisions/ledger.js";
import { resolveRepoRoot } from "../../utils/path.js";
import type { TruthLabel } from "../truth.js";

export interface ForensicAnalysisReport {
  root: string;
  mode: "read-only";
  brainStatus: Awaited<ReturnType<typeof getBrainStatus>>;
  git: Awaited<ReturnType<typeof analyzeGitIntelligence>>;
  changeLedgerEntryCount: number;
  decisionCount: number;
  findings: Array<{ id: string; label: string; truth: TruthLabel; detail: string }>;
  limitations: string[];
}

export class ForensicWriteRefusedError extends Error {
  readonly code = "FORENSIC_READ_ONLY";
  constructor(message = "Forensic mode refuses write operations") {
    super(message);
    this.name = "ForensicWriteRefusedError";
  }
}

/** Call before any mutating product operation when forensic mode is active. */
export function assertForensicReadOnly(forensicMode: boolean): void {
  if (forensicMode) {
    throw new ForensicWriteRefusedError();
  }
}

export async function runForensicAnalysis(rootInput: string): Promise<ForensicAnalysisReport> {
  const root = resolveRepoRoot(rootInput);
  const limitations = [
    "Forensic mode aggregates read-only signals; it does not modify the repository.",
    "Change/decision ledgers may be incomplete if never used.",
  ];

  const [brainStatus, git, changeLedger, decisions] = await Promise.all([
    getBrainStatus(root),
    analyzeGitIntelligence(root),
    readChangeLedger(root),
    loadDecisionLedger(root),
  ]);

  const findings: ForensicAnalysisReport["findings"] = [];

  findings.push({
    id: "brain-snapshot",
    label: "Project Brain snapshot present",
    truth: brainStatus.hasSnapshot ? "VERIFIED" : "UNKNOWN",
    detail: brainStatus.hasSnapshot
      ? `latest=${brainStatus.latestSnapshotId}`
      : "No snapshot in .agentdoctor/project-brain",
  });

  findings.push({
    id: "git-available",
    label: "Git repository available",
    truth: git.gitAvailable ? "VERIFIED" : "UNKNOWN",
    detail: git.gitAvailable
      ? `hotspots=${git.hotspots.length}`
      : "Not a git repo or git unavailable",
  });

  findings.push({
    id: "change-ledger",
    label: "AI change ledger entries",
    truth: changeLedger.entries.length ? "VERIFIED" : "UNKNOWN",
    detail: `entries=${changeLedger.entries.length}`,
  });

  findings.push({
    id: "decisions",
    label: "Decision records (ADR + ledger)",
    truth: decisions.decisions.length ? "VERIFIED" : "PARTIAL",
    detail: `decisions=${decisions.decisions.length}`,
  });

  return {
    root,
    mode: "read-only",
    brainStatus,
    git,
    changeLedgerEntryCount: changeLedger.entries.length,
    decisionCount: decisions.decisions.length,
    findings,
    limitations,
  };
}
