import { finalizeMatch } from "./models.js";
import { ARCHITECTURE_RULES } from "./rules.js";
import type {
  ArchitectureInferenceInput,
  ArchitectureInferenceOptions,
  ArchitectureInferenceResult,
  ArchitectureMatch,
} from "./types.js";

function assertInput(input: ArchitectureInferenceInput): void {
  if (!input.domains || !input.entrypoints || !input.dependencies || !input.relationships) {
    throw new Error(
      "inferArchitectures requires domains, entrypoints, dependencies, and relationships inputs",
    );
  }
}

/**
 * Infer architectural patterns from prior discovery outputs only.
 * Does not scan the filesystem or repository.
 */
export function inferArchitectures(
  input: ArchitectureInferenceInput,
  options: ArchitectureInferenceOptions = {},
): ArchitectureInferenceResult {
  const started = performance.now();
  assertInput(input);
  const minConfidence = options.minConfidence ?? 0.55;

  const architectures: ArchitectureMatch[] = [];
  for (const definition of ARCHITECTURE_RULES) {
    const evaluated = definition.evaluate({ input });
    const match = finalizeMatch(definition.pattern, evaluated);
    if (!match) {
      continue;
    }
    if (match.confidence < minConfidence) {
      continue;
    }
    architectures.push(match);
  }

  architectures.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    return a.pattern.localeCompare(b.pattern);
  });

  return {
    architectures,
    timingMs: Math.round(performance.now() - started),
    patternsEvaluated: ARCHITECTURE_RULES.length,
  };
}
