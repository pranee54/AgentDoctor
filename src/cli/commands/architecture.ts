import { EXIT_CODES, type ExitCode } from "../../types/index.js";
import { resolveCliProjectRoot } from "../safe-root.js";
import { buildIntelligenceGraph } from "../../intelligence/graph/build.js";
import { buildC4Views } from "../../architecture/c4.js";
import {
  checkArchitectureAtRoot,
  explainArchitecture,
  initArchitecture,
  loadArchitectureContract,
} from "../../architecture/contract.js";

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runArchitectureCommand(options: {
  action: "init" | "analyze" | "check" | "explain";
  root?: string;
  json?: boolean;
}): Promise<ExitCode> {
  const gated = await resolveCliProjectRoot(options.root ?? process.cwd());
  if (!gated.ok) {
    console.error(`Error: ${gated.message}`);
    return gated.code;
  }
  const root = gated.root;
  try {
    switch (options.action) {
      case "init": {
        const written = await initArchitecture(root);
        if (options.json) printJson({ path: written, createdOrExisting: true });
        else process.stdout.write(`Architecture contract at ${written}\n`);
        return EXIT_CODES.SUCCESS;
      }
      case "analyze": {
        const graph = await buildIntelligenceGraph({ root, mode: "auto" });
        const views = buildC4Views(graph);
        const loaded = await loadArchitectureContract(root);
        const check = await checkArchitectureAtRoot(root, graph);
        const payload = {
          c4: {
            levels: views.map((v) => v.level),
            views,
            label: "Inferred/proposed from graph evidence — not approved architecture facts",
          },
          contract: loaded
            ? {
                path: loaded.path,
                version: loaded.contract.version,
                layerCount: loaded.contract.layers.length,
                forbiddenCount: loaded.contract.forbidden.length,
                allowedCount: loaded.contract.allowed.length,
              }
            : null,
          check: {
            violations: check.violations.length,
            importEdgesChecked: check.importEdgesChecked,
            limitations: check.limitations,
          },
        };
        if (options.json) printJson(payload);
        else {
          process.stdout.write(
            [
              "AgentDoctor architecture analyze",
              `  C4 views: ${views.map((v) => v.level).join(", ")} (inferred)`,
              loaded
                ? `  contract: ${loaded.path} (layers=${loaded.contract.layers.length}, forbidden=${loaded.contract.forbidden.length})`
                : "  contract: none (run architecture init)",
              `  check violations: ${check.violations.length} (edges=${check.importEdgesChecked})`,
            ].join("\n") + "\n",
          );
        }
        return EXIT_CODES.SUCCESS;
      }
      case "check": {
        const graph = await buildIntelligenceGraph({ root, mode: "auto" });
        const check = await checkArchitectureAtRoot(root, graph);
        if (options.json) printJson(check);
        else {
          process.stdout.write(
            [
              "AgentDoctor architecture check",
              `  contract: ${check.contractPath ?? "none"}`,
              `  import edges checked: ${check.importEdgesChecked}`,
              `  violations: ${check.violations.length}`,
              ...check.violations
                .slice(0, 30)
                .map(
                  (v) =>
                    `    - [${v.kind}] ${v.ruleId}: ${v.fromPath} → ${v.toPath} (${v.fromLayer}→${v.toLayer})`,
                ),
              ...check.limitations.map((l) => `  limitation: ${l}`),
            ].join("\n") + "\n",
          );
        }
        if (check.violations.some((v) => v.kind === "forbidden")) {
          return EXIT_CODES.ISSUES_OR_THRESHOLD;
        }
        return EXIT_CODES.SUCCESS;
      }
      case "explain": {
        const loaded = await loadArchitectureContract(root);
        const graph = await buildIntelligenceGraph({ root, mode: "auto" });
        const check = await checkArchitectureAtRoot(root, graph);
        if (options.json) {
          printJson({
            contract: loaded?.contract ?? null,
            path: loaded?.path ?? null,
            check,
            explanation: explainArchitecture(loaded?.contract ?? null, check),
          });
        } else {
          process.stdout.write(explainArchitecture(loaded?.contract ?? null, check));
        }
        return EXIT_CODES.SUCCESS;
      }
      default:
        console.error(`Error: unknown architecture action`);
        return EXIT_CODES.USAGE_ERROR;
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return EXIT_CODES.INTERNAL_ERROR;
  }
}
