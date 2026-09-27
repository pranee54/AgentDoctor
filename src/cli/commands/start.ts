import { EXIT_CODES, type ExitCode } from "../../types/index.js";
import { initBrainStore, rebuildBrain, getBrainStatus } from "../../core/brain-cli/service.js";
import { discoverProjectRoots } from "../../product/discovery/roots.js";
import { buildProjectDna, persistProjectDna } from "../../product/dna/build.js";
import { resolveCliProjectRoot } from "../safe-root.js";

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runStartCommand(options: {
  root?: string;
  json?: boolean;
  select?: string;
  maxEntries?: number;
  initBrain?: boolean;
  rebuildBrain?: boolean;
  listOnly?: boolean;
}): Promise<ExitCode> {
  const prefer = options.select ?? options.root;
  // Fail closed before discovery walks anything (home/Desktop refusal must be instant).
  const gated = await resolveCliProjectRoot(prefer);
  if (!gated.ok) {
    console.error(`Error: ${gated.message}`);
    return gated.code;
  }

  const discovery = await discoverProjectRoots({
    cwd: gated.root,
    prefer: gated.root,
    ...(options.maxEntries !== undefined ? { maxEntries: options.maxEntries } : {}),
    autoSelect: !options.listOnly,
  });

  if (options.listOnly || discovery.blocked || !discovery.selected) {
    if (options.json) {
      printJson({ discovery, dna: null, brain: null });
      return discovery.blocked ? EXIT_CODES.USAGE_ERROR : EXIT_CODES.SUCCESS;
    }
    if (discovery.blocked) {
      process.stderr.write(`Blocked: ${discovery.blockReason}\n`);
      return EXIT_CODES.USAGE_ERROR;
    }
    process.stdout.write("Project candidates:\n");
    if (discovery.candidates.length === 0) {
      process.stdout.write(`  (none found under ${gated.root})\n`);
      process.stdout.write(
        "  Tip: open a project directory that contains source code or a manifest (package.json, composer.json, pyproject.toml, .git, …),\n",
      );
      process.stdout.write(`  or run: agentdoctor start ${gated.root}\n`);
      process.stdout.write(
        "  Related: agentdoctor dna .   # inspect what DNA sees in this folder\n",
      );
      return EXIT_CODES.USAGE_ERROR;
    }
    for (const [i, c] of discovery.candidates.entries()) {
      process.stdout.write(
        `  [${i + 1}] ${c.root}\n      score=${c.score} markers=${c.markers.join(", ")} (${c.reason})\n`,
      );
    }
    process.stdout.write(
      "\nMultiple projects detected — re-run with --select <path> (or pass an explicit path).\n",
    );
    return EXIT_CODES.SUCCESS;
  }

  const root = discovery.selected.root;
  const dna = await persistProjectDna(root);
  let brainStatus = null;
  if (options.initBrain !== false) {
    brainStatus = await initBrainStore(root);
    if (options.rebuildBrain) {
      await rebuildBrain(root);
      brainStatus = await getBrainStatus(root);
    }
  }

  const payload = { discovery, dna, brain: brainStatus };
  if (options.json) {
    printJson(payload);
  } else {
    process.stdout.write(`✓ Project detected: ${dna.name}\n`);
    process.stdout.write(`  Root: ${root}\n`);
    process.stdout.write(`AgentDoctor start\n`);
    process.stdout.write(`  fingerprint: ${dna.fingerprint}\n`);
    process.stdout.write(`  type: ${dna.projectType}\n`);
    process.stdout.write(`  languages: ${dna.languages.join(", ") || "(none)"}\n`);
    process.stdout.write(`  frameworks: ${dna.frameworks.join(", ") || "(none)"}\n`);
    process.stdout.write(
      `  files: ${dna.counts.files} (source ${dna.counts.sourceFiles}, tests ${dna.counts.testFiles})\n`,
    );
    if (brainStatus) {
      process.stdout.write(
        `  brain: ${brainStatus.hasSnapshot ? `snapshot ${brainStatus.latestSnapshotId}` : "initialized (no snapshot yet — run with --rebuild-brain or brain rebuild)"}\n`,
      );
    }
    process.stdout.write(`  DNA written to .agentdoctor/dna/project-dna.json\n`);
  }
  return EXIT_CODES.SUCCESS;
}

export async function runDnaCommand(options: {
  root?: string;
  json?: boolean;
  persist?: boolean;
}): Promise<ExitCode> {
  const gated = await resolveCliProjectRoot(options.root);
  if (!gated.ok) {
    console.error(`Error: ${gated.message}`);
    return gated.code;
  }
  const root = gated.root;
  const dna = options.persist ? await persistProjectDna(root) : await buildProjectDna(root);
  if (options.json) {
    printJson(dna);
  } else {
    process.stdout.write(`Project DNA: ${dna.name} (${dna.fingerprint})\n`);
    process.stdout.write(`  type: ${dna.projectType}\n`);
    process.stdout.write(`  languages: ${dna.languages.join(", ") || "(none)"}\n`);
    process.stdout.write(`  frameworks: ${dna.frameworks.join(", ") || "(none)"}\n`);
    process.stdout.write(`  monorepo: ${dna.monorepo.isMonorepo ? dna.monorepo.tool : "no"}\n`);
  }
  return EXIT_CODES.SUCCESS;
}
