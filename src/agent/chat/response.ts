import type { ContextBundle, ContextCitation, TruthLabel } from "../context/types.js";
import type { ChatTurnResponse, TruthClaim } from "./types.js";
import type { AiProviderId, TokenUsage } from "../../ai/types.js";
import { truthLabelHelp } from "../context/truth.js";

/**
 * Build a conservative structured response from model text + retrieved evidence.
 * Never invents line ranges. Citations come only from the context bundle.
 */
export function buildChatTurnResponse(options: {
  sessionId: string;
  modelText: string;
  context: ContextBundle;
  provider: AiProviderId;
  model: string;
  status: ChatTurnResponse["status"];
  error?: string;
  usage?: TokenUsage;
}): ChatTurnResponse {
  const verifiedSource = options.context.citations.filter(
    (c) => c.path && c.confidence === "VERIFIED" && c.evidenceType === "source-code",
  ) as ContextCitation[];
  const brainCitations = options.context.citations.filter(
    (c) => c.source === "brain" || c.evidenceType === "project-brain",
  );
  const graphCitations = options.context.citations.filter(
    (c) => c.source === "graph" || c.evidenceType === "graph",
  );
  // Surface verified source + brain/graph evidence (brain is never upgraded to VERIFIED).
  const citations = [...verifiedSource, ...brainCitations, ...graphCitations];
  const contextPaths = verifiedSource.map((c) => c.path!).filter(Boolean);
  const mentioned = extractMentionedPaths(options.modelText, contextPaths);

  const truthClaims: TruthClaim[] = [];
  for (const path of mentioned) {
    truthClaims.push({
      text: `Referenced project file: ${path}`,
      label: "VERIFIED",
      citationPaths: [path],
    });
  }

  const hasUsableEvidence = verifiedSource.length > 0 || brainCitations.length > 0;
  if (!hasUsableEvidence) {
    truthClaims.push({
      text: "Insufficient repository evidence was retrieved for this question.",
      label: "UNKNOWN",
      citationPaths: [],
    });
  } else if (brainCitations.length > 0 && verifiedSource.length === 0) {
    truthClaims.push({
      text: "Answer grounded in Project Brain structural evidence (INFERRED; no owned source excerpts).",
      label: "INFERRED",
      citationPaths: [],
    });
  } else if (options.modelText.trim()) {
    truthClaims.push({
      text: "Interpretive explanation based on retrieved project evidence.",
      label: "INFERRED",
      citationPaths: mentioned.length ? mentioned : contextPaths.slice(0, 5),
    });
  }

  if (/\b(redis|kubernetes|production|aws|gcp|azure)\b/i.test(options.modelText)) {
    const verifiedHit = citations.some((c) =>
      /\b(redis|kubernetes|aws|gcp|azure)\b/i.test(
        `${c.path ?? ""} ${c.excerpt ?? ""} ${c.note ?? ""}`,
      ),
    );
    if (!verifiedHit) {
      truthClaims.push({
        text: "Claims about external/runtime infrastructure were not verified from repository evidence.",
        label: "EXTERNAL",
        citationPaths: [],
      });
    }
  }

  const contextTruncated =
    options.context.limitations.some((l) => /truncat|budget|No file excerpts/i.test(l)) ||
    options.context.estimatedTokens > 5_500;

  return {
    sessionId: options.sessionId,
    message: options.modelText.trim(),
    truthClaims,
    citations,
    provider: options.provider,
    model: options.model,
    status: options.status,
    ...(options.error ? { error: options.error } : {}),
    ...(options.usage ? { usage: options.usage } : {}),
    contextPaths,
    contextTruncated,
    limitations: options.context.limitations,
  };
}

function extractMentionedPaths(text: string, known: string[]): string[] {
  const found: string[] = [];
  for (const p of known) {
    if (text.includes(p) && !found.includes(p)) found.push(p);
  }
  return found;
}

export function formatChatResponseForCli(response: ChatTurnResponse): string {
  if (response.status === "provider-none" || response.status === "provider-error") {
    return `${response.message || response.error || "AI provider unavailable."}\n`;
  }

  const lines: string[] = [];
  lines.push("");
  lines.push("AgentDoctor:");
  lines.push("");
  lines.push(response.message || "(empty response)");
  lines.push("");

  if (response.truthClaims.length > 0) {
    lines.push("Truth:");
    for (const claim of response.truthClaims.slice(0, 8)) {
      lines.push(`  [${claim.label}] ${claim.text}`);
    }
    lines.push("");
  }

  if (response.citations.length > 0) {
    lines.push("Evidence:");
    for (const c of response.citations.slice(0, 16)) {
      if (c.source === "brain" || c.evidenceType === "project-brain") {
        lines.push(`  - ${c.excerpt ?? c.note ?? "brain claim"} (${c.confidence})`);
        continue;
      }
      if (c.source === "graph" || c.evidenceType === "graph") {
        const first = (c.excerpt ?? c.note ?? "graph").split("\n")[0] ?? "graph";
        lines.push(`  - ${first} (${c.confidence})`);
        continue;
      }
      const path = c.path ?? "(unknown)";
      lines.push(`  - ${path}${c.range ? `:${c.range}` : ""} (${c.confidence})`);
    }
    lines.push("");
  }

  if (response.contextTruncated) {
    lines.push("Note: context was budget-limited; confidence may be reduced.");
    lines.push("");
  }

  if (response.limitations.length > 0) {
    lines.push("Limitations:");
    for (const l of response.limitations.slice(0, 5)) {
      lines.push(`  - ${l}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function describeTruthLabels(): string {
  return (["VERIFIED", "INFERRED", "UNKNOWN", "EXTERNAL"] as TruthLabel[])
    .map((l) => `${l}: ${truthLabelHelp(l)}`)
    .join("\n");
}
