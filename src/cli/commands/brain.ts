import { EXIT_CODES, type ExitCode } from "../../types/index.js";
import { resolveCliProjectRoot } from "../safe-root.js";
import {
  exportBrain,
  getBrainStatus,
  importBrain,
  initBrainStore,
  inspectBrainSummary,
  listBrainSnapshots,
  loadLatestBrain,
  rebuildBrain,
  searchBrain,
  showBrainSnapshot,
} from "../../core/brain-cli/service.js";
import {
  listProposals,
  reviewProposal,
  writeBrainProductSnapshot,
} from "../../core/brain-product/init.js";

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runBrainCommand(options: {
  action: string;
  root?: string;
  query?: string;
  snapshotId?: string;
  file?: string;
  json?: boolean;
  artifactId?: string;
  decision?: "approved" | "rejected" | "pending-review" | "deprecated";
  note?: string;
}): Promise<ExitCode> {
  const gated = await resolveCliProjectRoot(options.root);
  if (!gated.ok) {
    console.error(`Error: ${gated.message}`);
    return gated.code;
  }
  const root = gated.root;
  const json = options.json === true;

  try {
    switch (options.action) {
      case "init": {
        const status = await initBrainStore(root);
        if (json) printJson(status);
        else process.stdout.write(`Project Brain store ready at ${status.storeRoot}\n`);
        return EXIT_CODES.SUCCESS;
      }
      case "status": {
        const status = await getBrainStatus(root);
        if (json) printJson(status);
        else
          process.stdout.write(
            `Brain status\n  root: ${status.root}\n  snapshots: ${status.snapshotCount}\n  latest: ${status.latestSnapshotId ?? "(none)"}\n`,
          );
        return EXIT_CODES.SUCCESS;
      }
      case "inspect": {
        const summary = await inspectBrainSummary(root);
        if (json) printJson(summary);
        else
          process.stdout.write(
            `Brain inspect\n  project: ${String(summary.projectName)}\n  snapshot: ${String(summary.snapshotId)}\n  claims: ${String(summary.claimCount)}\n  components: ${String(summary.componentCount)}\n  risks: ${String(summary.riskCount)}\n`,
          );
        return EXIT_CODES.SUCCESS;
      }
      case "rebuild":
      case "update": {
        const brain = await rebuildBrain(root);
        const productSnap = await writeBrainProductSnapshot(root);
        if (json)
          printJson({
            snapshotId: brain.snapshot.id,
            projectName: brain.metadata.projectName,
            productSnapshot: productSnap,
          });
        else
          process.stdout.write(
            `Rebuilt Project Brain snapshot ${brain.snapshot.id}\nRepository Brain product snapshot: ${productSnap}\n`,
          );
        return EXIT_CODES.SUCCESS;
      }
      case "snapshot": {
        const brain = await rebuildBrain(root);
        const productSnap = await writeBrainProductSnapshot(root);
        if (json) printJson({ brainSnapshotId: brain.snapshot.id, productSnapshot: productSnap });
        else
          process.stdout.write(
            `Brain snapshot ${brain.snapshot.id}\nProduct snapshot ${productSnap}\n`,
          );
        return EXIT_CODES.SUCCESS;
      }
      case "review": {
        if (!options.artifactId || !options.decision) {
          console.error("Error: --artifact <id> and --decision <approved|rejected|...> required");
          return EXIT_CODES.USAGE_ERROR;
        }
        const item = await reviewProposal({
          root,
          artifactId: options.artifactId,
          decision: options.decision,
          ...(options.note ? { note: options.note } : {}),
        });
        if (json) printJson(item);
        else process.stdout.write(`Reviewed ${item.artifactId} -> ${item.status}\n`);
        return EXIT_CODES.SUCCESS;
      }
      case "proposals": {
        const proposals = await listProposals(root);
        if (json) printJson({ proposals });
        else {
          for (const p of proposals) {
            process.stdout.write(`${p.id}  [${p.status}]  ${p.kind}  ${p.path}\n`);
          }
        }
        return EXIT_CODES.SUCCESS;
      }
      case "snapshot-list":
      case "history": {
        const snapshots = await listBrainSnapshots(root);
        if (json) printJson({ snapshots });
        else if (snapshots.length === 0) {
          process.stdout.write("No snapshots yet. Run: agentdoctor brain rebuild\n");
        } else {
          for (const snap of snapshots) {
            process.stdout.write(`${snap.id}  ${snap.createdAt}  ${snap.projectName}\n`);
          }
        }
        return EXIT_CODES.SUCCESS;
      }
      case "snapshot-show": {
        if (!options.snapshotId) {
          console.error("Error: snapshot id required");
          return EXIT_CODES.USAGE_ERROR;
        }
        const brain = await showBrainSnapshot(root, options.snapshotId);
        printJson({
          snapshotId: brain.snapshot.id,
          projectName: brain.metadata.projectName,
          claimCount: brain.claims.length,
          componentCount: brain.components.length,
        });
        return EXIT_CODES.SUCCESS;
      }
      case "search": {
        if (!options.query) {
          console.error("Error: search query required");
          return EXIT_CODES.USAGE_ERROR;
        }
        let brain = await loadLatestBrain(root);
        if (!brain) brain = await rebuildBrain(root);
        const hits = searchBrain(brain, options.query);
        if (json) printJson({ query: options.query, hits });
        else if (hits.length === 0) process.stdout.write("No matches.\n");
        else for (const hit of hits) process.stdout.write(`[${hit.kind}] ${hit.id}: ${hit.text}\n`);
        return EXIT_CODES.SUCCESS;
      }
      case "export": {
        if (!options.file) {
          console.error("Error: --file <path> required for export");
          return EXIT_CODES.USAGE_ERROR;
        }
        const out = await exportBrain(root, options.file, options.snapshotId);
        process.stdout.write(`Exported redacted brain to ${out}\n`);
        return EXIT_CODES.SUCCESS;
      }
      case "import": {
        if (!options.file) {
          console.error("Error: --file <path> required for import");
          return EXIT_CODES.USAGE_ERROR;
        }
        const meta = await importBrain(root, options.file);
        process.stdout.write(`Imported snapshot ${meta.id}\n`);
        return EXIT_CODES.SUCCESS;
      }
      default:
        console.error(`Error: unknown brain action: ${options.action}`);
        return EXIT_CODES.USAGE_ERROR;
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return EXIT_CODES.INTERNAL_ERROR;
  }
}
