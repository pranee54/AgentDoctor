/**
 * Product-layer truth labels (extends agent context labels with maturity markers).
 */
export type TruthLabel =
  "VERIFIED" | "INFERRED" | "UNKNOWN" | "EXTERNAL" | "EXPERIMENTAL" | "PARTIAL";

export interface ProductEvidence {
  path: string;
  line?: number;
  excerpt?: string;
}

const TRUTH_ORDER: TruthLabel[] = [
  "VERIFIED",
  "INFERRED",
  "PARTIAL",
  "EXPERIMENTAL",
  "UNKNOWN",
  "EXTERNAL",
];

/** Never promote weaker evidence to stronger by accident. */
export function minProductTruth(a: TruthLabel, b: TruthLabel): TruthLabel {
  const ia = TRUTH_ORDER.indexOf(a);
  const ib = TRUTH_ORDER.indexOf(b);
  return TRUTH_ORDER[Math.max(ia, ib)]!;
}

export function truthLabelDescription(label: TruthLabel): string {
  switch (label) {
    case "VERIFIED":
      return "Directly supported by repository file evidence.";
    case "INFERRED":
      return "Heuristic or pattern match; not fully verified.";
    case "PARTIAL":
      return "Some evidence exists; coverage is incomplete.";
    case "EXPERIMENTAL":
      return "Early capability; behavior may change.";
    case "UNKNOWN":
      return "Cannot be determined from current evidence.";
    case "EXTERNAL":
      return "Requires information outside the repository.";
  }
}
