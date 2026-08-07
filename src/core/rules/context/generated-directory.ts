import type { AgentId } from "../../../types/index.js";
import { claudeDeniesPath } from "../claude-deny.js";
import { codexDeniesPath } from "../codex-deny.js";
import {
  isCheckedInGithubActionDist,
  isSampleOrTestPath,
  isSourceNamedArtifactCollision,
} from "../path-kind.js";
import type { FindingDraft, RuleContext, RuleDefinition } from "../types.js";


/** Directories commonly generated/build-related. vendor/ is ecosystem-aware. */
const GENERATED = [
  { name: "dist", label: "build output" },
  { name: "build", label: "build output" },
  { name: "coverage", label: "test coverage" },
  { name: ".next", label: "Next.js build cache" },
  { name: ".nuxt", label: "Nuxt build cache" },
  { name: ".svelte-kit", label: "SvelteKit build output" },
  { name: ".dart_tool", label: "Dart tooling cache" },
  { name: "target", label: "Rust/Java build output" },
] as const;

function isGeneratedPath(relativePath: string, name: string): boolean {
  return relativePath === name || relativePath.endsWith(`/${name}`);
}

function isGitIgnored(context: RuleContext, relativePath: string): boolean {
  return (
    context.ignore.matchesGitignore(relativePath) ||
    context.ignore.matchesGitignore(`${relativePath}/`)
  );
}

async function agentsStillExposed(
  context: RuleContext,
  relativePath: string,
  configured: AgentId[],
): Promise<AgentId[]> {
  const exposed: AgentId[] = [];
  for (const agent of configured) {
    if (
      agent === "cursor" &&
      (context.ignore.matchesCursorignore(relativePath) ||
        context.ignore.matchesCursorignore(`${relativePath}/`))
    ) {
      continue;
    }
    if (agent === "claude-code" && (await claudeDeniesPath(context, relativePath))) {
      continue;
    }
    if (agent === "codex" && (await codexDeniesPath(context, relativePath))) {
      continue;
    }
    exposed.push(agent);
  }
  return exposed;
}

export const generatedDirectoryRule: RuleDefinition = {
  id: "context/generated-directory",
  title: "Generated directory may enter agent context",
  description:
    "Notes common generated directories present in the tree when agent exclusion is unclear.",
  category: "context",
  severity: "info",
  fixability: "safe",
  rationale: "Generated artifacts are usually low-value context and can be large.",
  recommendation:
    "Ensure generated directories are listed in .gitignore and agent ignore configuration where applicable.",
  async check(context): Promise<FindingDraft[]> {
    const findings: FindingDraft[] = [];
    const configured = context.agents.filter((a) => a.configured || a.detected).map((a) => a.id);
    if (configured.length === 0) {
      return [];
    }

    for (const entry of GENERATED) {
      const matches = context.discovery.directoriesSkipped.filter((dir) =>
        isGeneratedPath(dir, entry.name),
      );
      for (const relativePath of matches) {
        if (isSampleOrTestPath(relativePath)) {
          continue;
        }
        if (isSourceNamedArtifactCollision(relativePath)) {
          continue;
        }
        if (isCheckedInGithubActionDist(relativePath)) {
          continue;
        }
        if (isGitIgnored(context, relativePath)) {
          continue;
        }

        const affected = await agentsStillExposed(context, relativePath, configured);
        if (affected.length === 0) {
          continue;
        }

        findings.push({
          ruleId: "context/generated-directory",
          category: "context",
          severity: "info",
          title: "Generated directory may enter agent context",
          message: `${relativePath}/ (${entry.label}) is present and no project ignore pattern was detected`,
          whyItMatters:
            "Generated directories are usually low-value for coding agents and can bloat indexing/context when not excluded.",
          recommendation: `Add an ignore pattern covering ${relativePath}/ to .gitignore and agent exclusions (.cursorignore, Claude Code Read deny, and/or Codex filesystem deny).`,
          affectedAgents: affected,
          evidence: { path: relativePath },
          fixability: "safe",
        });
      }
    }

    const vendorPaths = context.discovery.directoriesSkipped.filter((dir) =>
      isGeneratedPath(dir, "vendor"),
    );
    if (
      vendorPaths.length > 0 &&
      context.repository.primaryPackageManager !== "composer" &&
      !context.repository.packageManagers.includes("composer") &&
      context.repository.primaryLanguage !== "php"
    ) {
      for (const relativePath of vendorPaths) {
        if (isSampleOrTestPath(relativePath)) {
          continue;
        }
        if (isSourceNamedArtifactCollision(relativePath)) {
          continue;
        }
        if (isGitIgnored(context, relativePath)) {
          continue;
        }
        const affected = await agentsStillExposed(context, relativePath, configured);
        if (affected.length === 0) {
          continue;
        }
        findings.push({
          ruleId: "context/generated-directory",
          category: "context",
          severity: "info",
          title: "Generated directory may enter agent context",
          message: `${relativePath}/ is present outside a PHP/Composer project and no ignore pattern was detected`,
          whyItMatters:
            "In non-PHP projects, vendor/ is often third-party or generated content that adds noise to agent context.",
          recommendation: "Confirm whether vendor/ should be ignored for git and AI tooling.",
          affectedAgents: affected,
          evidence: { path: relativePath },
          fixability: "safe",
        });
      }
    }

    return findings;
  },
};
