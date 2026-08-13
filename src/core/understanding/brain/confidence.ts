/**
 * Shared confidence contract for all Project Brain surfaces.
 * Range: [0, 1]. Meaning: subjective support strength given current evidence.
 * 0 = no support / unknown claim should not be ACTIVE with fabricated certainty.
 * 1 = maximum support the deterministic compiler can assert for this evidence class.
 * Calibration: values are rule-derived, not probabilistically calibrated to human labels.
 */

export const CONFIDENCE_MIN = 0;
export const CONFIDENCE_MAX = 1;

export interface ConfidenceMetadata {
  range: readonly [number, number];
  meaning: string;
  calibration: "rule-derived-uncalibrated";
  unknownPolicy: "preserve-unknown-never-invent";
}

export const CONFIDENCE_CONTRACT: ConfidenceMetadata = {
  range: [CONFIDENCE_MIN, CONFIDENCE_MAX],
  meaning: "Deterministic support strength from explicit repository evidence for this claim class",
  calibration: "rule-derived-uncalibrated",
  unknownPolicy: "preserve-unknown-never-invent",
};

export function clampBrainConfidence(value: number): number {
  if (Number.isNaN(value) || value < CONFIDENCE_MIN) {
    return CONFIDENCE_MIN;
  }
  if (value > CONFIDENCE_MAX) {
    return CONFIDENCE_MAX;
  }
  return Math.round(value * 100) / 100;
}

export function assertBrainConfidence(value: number, path = "confidence"): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${path} must be a number`);
  }
  if (value < CONFIDENCE_MIN || value > CONFIDENCE_MAX) {
    throw new Error(`${path} must be in [0,1]`);
  }
  return clampBrainConfidence(value);
}

export function averageBrainConfidence(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return clampBrainConfidence(values.reduce((a, b) => a + b, 0) / values.length);
}
