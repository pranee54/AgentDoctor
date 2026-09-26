import type { ProductEvidence, TruthLabel } from "../truth.js";
import { lineNumberAt, loadProjectSourceFiles } from "../evidence-scan.js";

export interface EventFlowNode {
  id: string;
  kind: "queue" | "worker" | "cron" | "bus" | "job" | "unknown";
  label: string;
  truth: TruthLabel;
  evidence: ProductEvidence[];
}

export interface EventFlowEdge {
  from: string;
  to: string;
  kind: "produces" | "consumes" | "schedules" | "inferred";
  truth: TruthLabel;
}

export interface EventsDoctorReport {
  root: string;
  nodes: EventFlowNode[];
  edges: EventFlowEdge[];
  limitations: string[];
}

interface MarkerRule {
  id: string;
  kind: EventFlowNode["kind"];
  label: string;
  importRe?: RegExp;
  contentRe?: RegExp;
}

const MARKERS: MarkerRule[] = [
  {
    id: "bull",
    kind: "queue",
    label: "Bull queue",
    importRe: /from\s+['"]bull['"]|require\(\s*['"]bull['"]\)/,
  },
  {
    id: "bullmq",
    kind: "queue",
    label: "BullMQ",
    importRe: /from\s+['"]bullmq['"]|require\(\s*['"]bullmq['"]\)/,
  },
  {
    id: "sqs",
    kind: "queue",
    label: "AWS SQS",
    contentRe: /@aws-sdk\/client-sqs|SQSClient|aws-sdk.*SQS/i,
  },
  { id: "kafka", kind: "bus", label: "Kafka", contentRe: /kafkajs|from\s+['"]kafka['"]/i },
  {
    id: "laravel-job",
    kind: "job",
    label: "Laravel Job",
    contentRe: /implements\s+ShouldQueue|use\s+Illuminate\\Contracts\\Queue\\ShouldQueue/,
  },
  {
    id: "cron-node",
    kind: "cron",
    label: "node-cron",
    importRe: /from\s+['"]node-cron['"]|require\(\s*['"]node-cron['"]\)/,
  },
  { id: "cron-php", kind: "cron", label: "Laravel schedule", contentRe: /Schedule::|->cron\s*\(/ },
  {
    id: "worker",
    kind: "worker",
    label: "Worker process",
    contentRe: /new\s+Worker\s*\(|\.process\s*\(\s*['"]/,
  },
];

const SOURCE_FILTER = (rel: string): boolean => {
  const lower = rel.toLowerCase();
  return (
    lower.endsWith(".ts") ||
    lower.endsWith(".js") ||
    lower.endsWith(".php") ||
    lower.endsWith(".py") ||
    lower.endsWith(".yaml") ||
    lower.endsWith(".yml")
  );
};

function scanFile(relativePath: string, content: string): EventFlowNode[] {
  const nodes: EventFlowNode[] = [];
  for (const marker of MARKERS) {
    if (marker.importRe) {
      marker.importRe.lastIndex = 0;
      const m = marker.importRe.exec(content);
      if (m) {
        nodes.push({
          id: `${marker.id}:${relativePath}`,
          kind: marker.kind,
          label: marker.label,
          truth: "INFERRED",
          evidence: [
            {
              path: relativePath,
              line: lineNumberAt(content, m.index),
              excerpt: m[0].slice(0, 120),
            },
          ],
        });
      }
    }
    if (marker.contentRe) {
      marker.contentRe.lastIndex = 0;
      const m = marker.contentRe.exec(content);
      if (m) {
        nodes.push({
          id: `${marker.id}:${relativePath}`,
          kind: marker.kind,
          label: marker.label,
          truth: "INFERRED",
          evidence: [
            {
              path: relativePath,
              line: lineNumberAt(content, m.index),
              excerpt: m[0].slice(0, 120),
            },
          ],
        });
      }
    }
  }

  const queueNameRe = /(?:Queue|queue)\(\s*['"`]([^'"`]+)['"`]/g;
  let qm: RegExpExecArray | null;
  while ((qm = queueNameRe.exec(content)) !== null) {
    const name = qm[1]!;
    nodes.push({
      id: `queue-name:${name}:${relativePath}`,
      kind: "queue",
      label: name,
      truth: "INFERRED",
      evidence: [
        {
          path: relativePath,
          line: lineNumberAt(content, qm.index),
          excerpt: qm[0].slice(0, 120),
        },
      ],
    });
  }

  return nodes;
}

function inferEdges(nodes: EventFlowNode[]): EventFlowEdge[] {
  const edges: EventFlowEdge[] = [];
  const workers = nodes.filter((n) => n.kind === "worker");
  const queues = nodes.filter((n) => n.kind === "queue" || n.kind === "job");
  for (const w of workers) {
    for (const q of queues) {
      if (w.evidence[0]?.path === q.evidence[0]?.path) {
        edges.push({
          from: q.id,
          to: w.id,
          kind: "inferred",
          truth: "INFERRED",
        });
      }
    }
  }
  return edges;
}

export async function analyzeEvents(rootInput: string): Promise<EventsDoctorReport> {
  const {
    root,
    files,
    limitations: scanLimits,
  } = await loadProjectSourceFiles(rootInput, SOURCE_FILTER);
  const limitations = [
    "Event flow is inferred from imports and string patterns; no runtime queue topology.",
    "Cross-file producer/consumer links are partial (same-file heuristics only).",
    ...scanLimits,
  ];

  const nodeMap = new Map<string, EventFlowNode>();
  for (const file of files) {
    for (const node of scanFile(file.relativePath, file.content)) {
      nodeMap.set(node.id, node);
    }
  }
  const nodes = [...nodeMap.values()].sort((a, b) => a.id.localeCompare(b.id));
  const edges = inferEdges(nodes);

  return { root, nodes, edges, limitations };
}
