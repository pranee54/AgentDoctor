import type { Scores } from "../../types/index.js";

/**
 * Historical filesScanned-based stub. Kept for unit tests that document the
 * pre-v1 placeholder behavior. Production scans use computeReadinessScores
 * (docs/scoring.md) — do not call this from scan().
 */
export function computePlaceholderScores(filesScanned: number): Scores {
  const base = 72;
  const fileBonus = Math.min(8, Math.floor(filesScanned / 25));
  const overall = clamp(base + fileBonus);

  return {
    overall,
    categories: {
      security: clamp(overall + 4),
      context: clamp(overall - 6),
      instructions: clamp(overall - 10),
      mcp: clamp(overall - 8),
      compatibility: clamp(overall - 4),
      performance: clamp(overall),
    },
    agents: {
      cursor: clamp(overall - 5),
      "claude-code": clamp(overall - 8),
      codex: clamp(overall - 6),
    },
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
