import fs from "node:fs/promises";

import type { EntrypointModel } from "./models.js";

export interface ExtractedEntrypointSignals {
  evidence: string[];
  signalHits: number;
}

/**
 * Read a bounded slice of a candidate file and collect matching content signals.
 */
export async function extractEntrypointSignals(options: {
  absolutePath: string;
  model: EntrypointModel;
  maxReadBytes: number;
}): Promise<ExtractedEntrypointSignals> {
  const { absolutePath, model, maxReadBytes } = options;
  let content: string;
  try {
    const handle = await fs.open(absolutePath, "r");
    try {
      const stat = await handle.stat();
      const size = Math.min(Number(stat.size), maxReadBytes);
      if (size <= 0) {
        return { evidence: [], signalHits: 0 };
      }
      const buffer = Buffer.alloc(size);
      const { bytesRead } = await handle.read(buffer, 0, size, 0);
      content = buffer.subarray(0, bytesRead).toString("utf8");
    } finally {
      await handle.close();
    }
  } catch {
    return { evidence: [], signalHits: 0 };
  }

  const evidence: string[] = [];
  for (const signal of model.signals) {
    if (signal.pattern.test(content)) {
      evidence.push(signal.label);
    }
  }
  return { evidence, signalHits: evidence.length };
}

export function scoreEntrypointConfidence(options: {
  pathConfidence: number;
  signalBoost: number;
  signalHits: number;
  requireSignal: boolean;
}): number | null {
  const { pathConfidence, signalBoost, signalHits, requireSignal } = options;
  if (requireSignal && signalHits === 0) {
    return null;
  }
  const raw = pathConfidence + signalHits * signalBoost;
  const clamped = Math.min(0.99, Math.max(0, raw));
  return Math.round(clamped * 100) / 100;
}
