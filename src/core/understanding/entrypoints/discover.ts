import { discoverFiles } from "../../../discovery/files.js";
import { ENTRYPOINT_MODELS } from "./models.js";
import { extractEntrypointSignals, scoreEntrypointConfidence } from "./extract.js";
import type {
  EntrypointDiscoveryOptions,
  EntrypointDiscoveryResult,
  EntrypointMatch,
} from "./types.js";

const DEFAULT_MAX_READ_BYTES = 256 * 1024;

/**
 * Discover likely application entrypoints via deterministic path + content heuristics.
 * Isolated from scan — internal understanding API only.
 */
export async function discoverEntrypoints(
  options: EntrypointDiscoveryOptions = {},
): Promise<EntrypointDiscoveryResult> {
  const started = performance.now();
  const cwd = options.cwd ?? process.cwd();
  const minConfidence = options.minConfidence ?? 0.55;
  const maxReadBytes = options.maxReadBytes ?? DEFAULT_MAX_READ_BYTES;

  const discovery = await discoverFiles({ root: cwd });
  const entrypoints: EntrypointMatch[] = [];
  let filesInspected = 0;

  for (const file of discovery.files) {
    for (const model of ENTRYPOINT_MODELS) {
      if (!model.pathTest(file.relativePath)) {
        continue;
      }

      filesInspected += 1;
      const extracted = await extractEntrypointSignals({
        absolutePath: file.absolutePath,
        model,
        maxReadBytes,
      });

      const confidence = scoreEntrypointConfidence({
        pathConfidence: model.pathConfidence,
        signalBoost: model.signalBoost,
        signalHits: extracted.signalHits,
        requireSignal: model.requireSignal,
      });

      if (confidence === null || confidence < minConfidence) {
        continue;
      }

      const evidence = [`path:${file.relativePath}`, ...extracted.evidence];
      entrypoints.push({
        framework: model.framework,
        file: file.relativePath,
        confidence,
        evidence,
      });
    }
  }

  entrypoints.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    const frameworkCmp = a.framework.localeCompare(b.framework);
    if (frameworkCmp !== 0) {
      return frameworkCmp;
    }
    return a.file.localeCompare(b.file);
  });

  return {
    entrypoints,
    timingMs: Math.round(performance.now() - started),
    filesConsidered: discovery.files.length,
    filesInspected,
  };
}
