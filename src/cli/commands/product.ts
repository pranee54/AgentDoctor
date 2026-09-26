import { EXIT_CODES, type ExitCode } from "../../types/index.js";
import { resolveRepoRoot } from "../../utils/path.js";
import { resolveTargetArgument } from "./scan.js";
import {
  traceRequirements,
  analyzeApiSurface,
  analyzeDatabaseSchema,
  analyzeEvents,
  analyzeDependencies,
  analyzeCodeHealth,
  buildSoftwareMap,
  analyzeWhatIf,
  loadDecisionLedger,
  runForensicAnalysis,
  buildSoftwareDigitalTwin,
  runEvalLab,
  diagnoseAgentDoctorSelf,
  analyzeInfra,
  buildIncidentHypotheses,
  readChangeLedger,
  analyzeSecuritySurface,
  analyzePrivacySurface,
  searchSymbolsAndConcepts,
  buildTechnicalDebtRoadmap,
  analyzeFeatureIntelligence,
  buildSoftwareEvolutionTimeline,
  queryMemory,
  loadOrganizationModel,
  analyzeTestBrain,
} from "../../product/index.js";
import { runRoleAgent, type AgentRole } from "../../agent/roles.js";

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export type ProductCommandAction =
  | "requirements"
  | "api"
  | "database"
  | "events"
  | "dependency"
  | "health-code"
  | "map"
  | "what-if"
  | "decisions"
  | "forensic"
  | "twin"
  | "eval-lab"
  | "self-check"
  | "infra"
  | "incident"
  | "security-doctor"
  | "privacy-doctor"
  | "search"
  | "tech-debt"
  | "features"
  | "evolution"
  | "memory"
  | "org"
  | "role-agent"
  | "test-brain";

export async function runProductCommand(options: {
  action: ProductCommandAction;
  root?: string;
  json?: boolean;
  target?: string;
  changedFiles?: string[];
  query?: string;
  role?: AgentRole;
  goal?: string;
  approve?: boolean;
  apply?: boolean;
}): Promise<ExitCode> {
  const root = resolveRepoRoot(options.root ?? resolveTargetArgument(undefined));

  try {
    let payload: unknown;
    switch (options.action) {
      case "requirements":
        payload = await traceRequirements(root);
        break;
      case "api":
        payload = await analyzeApiSurface(root);
        break;
      case "database":
        payload = await analyzeDatabaseSchema(root);
        break;
      case "events":
        payload = await analyzeEvents(root);
        break;
      case "dependency":
        payload = await analyzeDependencies(root);
        break;
      case "health-code":
        payload = await analyzeCodeHealth(root);
        break;
      case "map":
        payload = await buildSoftwareMap(root);
        break;
      case "what-if":
        if (!options.target) {
          console.error(
            "Error: what-if requires a file path or symbol target (--target or argument)",
          );
          return EXIT_CODES.USAGE_ERROR;
        }
        payload = await analyzeWhatIf(root, options.target);
        break;
      case "decisions":
        payload = await loadDecisionLedger(root);
        break;
      case "forensic":
        payload = await runForensicAnalysis(root);
        break;
      case "twin":
        payload = await buildSoftwareDigitalTwin(root);
        break;
      case "eval-lab":
        payload = await runEvalLab(root);
        break;
      case "self-check":
        payload = await diagnoseAgentDoctorSelf(root);
        break;
      case "infra":
        payload = await analyzeInfra(root);
        break;
      case "incident":
        payload = await buildIncidentHypotheses(
          root,
          options.changedFiles ? { changedFiles: options.changedFiles } : undefined,
        );
        break;
      case "security-doctor":
        payload = await analyzeSecuritySurface(root);
        break;
      case "privacy-doctor":
        payload = await analyzePrivacySurface(root);
        break;
      case "search":
        if (!options.query?.trim()) {
          console.error("Error: search requires a query (--query or argument)");
          return EXIT_CODES.USAGE_ERROR;
        }
        payload = await searchSymbolsAndConcepts(root, options.query);
        break;
      case "tech-debt":
        payload = await buildTechnicalDebtRoadmap(root);
        break;
      case "features":
        payload = await analyzeFeatureIntelligence(root);
        break;
      case "evolution":
        payload = await buildSoftwareEvolutionTimeline(root);
        break;
      case "memory":
        if (!options.query?.trim()) {
          console.error("Error: memory requires a query (--query or argument)");
          return EXIT_CODES.USAGE_ERROR;
        }
        payload = await queryMemory(root, options.query);
        break;
      case "org":
        payload = await loadOrganizationModel(root);
        break;
      case "test-brain":
        payload = await analyzeTestBrain({ root });
        break;
      case "role-agent":
        if (!options.role || !options.goal?.trim()) {
          console.error("Error: role-agent requires --role and --goal");
          return EXIT_CODES.USAGE_ERROR;
        }
        if (options.apply && !options.approve) {
          console.error("Error: role-agent --apply requires --approve");
          return EXIT_CODES.USAGE_ERROR;
        }
        payload = await runRoleAgent({
          role: options.role,
          goal: options.goal,
          root,
          approvedByHuman: options.approve === true,
        });
        break;
      default:
        return EXIT_CODES.USAGE_ERROR;
    }

    if (options.json) {
      printJson(payload);
    } else {
      const action = options.action;
      process.stdout.write(`AgentDoctor ${action} completed for ${root}\n`);
      if (action === "self-check" && payload && typeof payload === "object" && "ok" in payload) {
        process.stdout.write(`  ok: ${(payload as { ok: boolean }).ok}\n`);
      }
      if (action === "eval-lab" && payload && typeof payload === "object" && "passed" in payload) {
        process.stdout.write(`  passed: ${(payload as { passed: boolean }).passed}\n`);
      }
      process.stdout.write("  (use --json for full report)\n");
    }
    return EXIT_CODES.SUCCESS;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return EXIT_CODES.INTERNAL_ERROR;
  }
}

export async function runChangeLedgerListCommand(options: {
  root?: string;
  json?: boolean;
}): Promise<ExitCode> {
  const root = resolveRepoRoot(options.root ?? process.cwd());
  const payload = await readChangeLedger(root);
  if (options.json) printJson(payload);
  else process.stdout.write(`Change ledger entries: ${payload.entries.length}\n`);
  return EXIT_CODES.SUCCESS;
}
