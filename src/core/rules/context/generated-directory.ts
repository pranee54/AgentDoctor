import type { FindingDraft, RuleDefinition } from "../types.js";

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
    const skipped = new Set(context.discovery.directoriesSkipped.map((d) => d.split("/")[0] ?? d));
    // directoriesSkipped stores relative paths like "dist" or "packages/app/dist"
    const present = new Set<string>();
    for (const dir of context.discovery.directoriesSkipped) {
      const top = dir.split("/")[0] ?? dir;
      present.add(top);
      present.add(dir);
    }
    void skipped;

    const affected = context.agents.filter((a) => a.configured || a.detected).map((a) => a.id);
    if (affected.length === 0) {
      return [];
    }

    for (const entry of GENERATED) {
      const found =
        present.has(entry.name) ||
        [...present].some((p) => p === entry.name || p.endsWith(`/${entry.name}`));
      if (!found) {
        continue;
      }

      // If .gitignore or .cursorignore already exclude it, skip (already appropriately excluded)
      const samplePath = `${entry.name}/`;
      const excluded =
        context.ignore.matchesGitignore(samplePath) ||
        context.ignore.matchesGitignore(entry.name) ||
        context.ignore.matchesCursorignore(samplePath) ||
        context.ignore.matchesCursorignore(entry.name);

      if (excluded) {
        continue;
      }

      // Discovery already skips these dirs by default — absence from ignore files is still useful info
      // when agents are configured. Keep severity info.
      findings.push({
        ruleId: "context/generated-directory",
        category: "context",
        severity: "info",
        title: "Generated directory may enter agent context",
        message: `${entry.name}/ (${entry.label}) is present and no project ignore pattern was detected`,
        whyItMatters:
          "Generated directories are usually low-value for coding agents and can bloat indexing/context when not excluded.",
        recommendation: `Add ${entry.name}/ to .gitignore and, for Cursor, .cursorignore if you need agent-specific exclusion beyond gitignore.`,
        affectedAgents: affected,
        evidence: { path: entry.name },
        fixability: "safe",
      });
    }

    // vendor/ — only flag for non-PHP/Composer ecosystems
    if (
      (present.has("vendor") ||
        [...present].some((p) => p === "vendor" || p.endsWith("/vendor"))) &&
      context.repository.primaryPackageManager !== "composer" &&
      context.repository.primaryLanguage !== "php"
    ) {
      const excluded =
        context.ignore.matchesGitignore("vendor/") || context.ignore.matchesCursorignore("vendor/");
      if (!excluded) {
        findings.push({
          ruleId: "context/generated-directory",
          category: "context",
          severity: "info",
          title: "Generated directory may enter agent context",
          message:
            "vendor/ is present outside a PHP/Composer project and no ignore pattern was detected",
          whyItMatters:
            "In non-PHP projects, vendor/ is often third-party or generated content that adds noise to agent context.",
          recommendation: "Confirm whether vendor/ should be ignored for git and AI tooling.",
          affectedAgents: affected,
          evidence: { path: "vendor" },
          fixability: "safe",
        });
      }
    }

    return findings;
  },
};
