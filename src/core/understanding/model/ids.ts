import { createHash } from "node:crypto";

import type { CompilerPassId } from "./types.js";

/** Deterministic short stable id from pass + kind + natural key. */
export function stableModelId(pass: CompilerPassId, kind: string, key: string): string {
  const digest = createHash("sha256")
    .update(pass)
    .update("\0")
    .update(kind)
    .update("\0")
    .update(key)
    .digest("hex")
    .slice(0, 16);
  return `${kind}_${digest}`;
}

export function clampModelConfidence(value: number): number {
  if (Number.isNaN(value) || value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return Math.round(value * 100) / 100;
}

export function averageConfidence(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sum = values.reduce((acc, value) => acc + value, 0);
  return clampModelConfidence(sum / values.length);
}

export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

export function isIsoTimestamp(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    return false;
  }
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}
