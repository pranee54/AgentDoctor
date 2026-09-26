import { createHash } from "node:crypto";

export interface IndexDocument {
  id: string;
  path: string;
  text: string;
}

export interface TfidfIndex {
  documents: IndexDocument[];
  idf: Map<string, number>;
  docVectors: Map<string, Map<string, number>>;
  limitations: string[];
}

const TOKEN_RE = /[a-zA-Z][a-zA-Z0-9_]{1,48}|[0-9]+/g;

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const matches = lower.match(TOKEN_RE);
  return matches ?? [];
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  const max = Math.max(1, ...tf.values());
  for (const [k, v] of tf) {
    tf.set(k, v / max);
  }
  return tf;
}

export function buildIndex(documents: IndexDocument[]): TfidfIndex {
  const limitations = [
    "Local index uses keyword TF-IDF — not neural embeddings or semantic similarity.",
  ];
  const docTokens = new Map<string, string[]>();
  const df = new Map<string, number>();

  for (const doc of documents) {
    const tokens = tokenize(doc.text);
    docTokens.set(doc.id, tokens);
    const unique = new Set(tokens);
    for (const t of unique) {
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }

  const n = Math.max(1, documents.length);
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log((1 + n) / (1 + count)) + 1);
  }

  const docVectors = new Map<string, Map<string, number>>();
  for (const doc of documents) {
    const tf = termFrequency(docTokens.get(doc.id) ?? []);
    const vec = new Map<string, number>();
    for (const [term, weight] of tf) {
      const idfVal = idf.get(term) ?? 1;
      vec.set(term, weight * idfVal);
    }
    docVectors.set(doc.id, vec);
  }

  return { documents, idf, docVectors, limitations };
}

function vectorNorm(vec: Map<string, number>): number {
  let sum = 0;
  for (const v of vec.values()) sum += v * v;
  return Math.sqrt(sum) || 1;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  const smaller = a.size <= b.size ? a : b;
  const other = a.size <= b.size ? b : a;
  for (const [term, weight] of smaller) {
    const ow = other.get(term);
    if (ow !== undefined) dot += weight * ow;
  }
  return dot / (vectorNorm(a) * vectorNorm(b));
}

export function searchIndex(
  index: TfidfIndex,
  query: string,
  maxHits = 40,
): Array<{ document: IndexDocument; score: number }> {
  const qTokens = tokenize(query);
  if (!qTokens.length) return [];
  const qTf = termFrequency(qTokens);
  const qVec = new Map<string, number>();
  for (const [term, weight] of qTf) {
    qVec.set(term, weight * (index.idf.get(term) ?? 1));
  }

  const hits: Array<{ document: IndexDocument; score: number }> = [];
  for (const doc of index.documents) {
    const dVec = index.docVectors.get(doc.id);
    if (!dVec) continue;
    const score = cosineSimilarity(qVec, dVec);
    if (score > 0) hits.push({ document: doc, score });
  }

  hits.sort((a, b) => b.score - a.score || a.document.path.localeCompare(b.document.path));
  return hits.slice(0, maxHits);
}

export function documentId(path: string, content: string): string {
  return createHash("sha1").update(`${path}\0${content.length}`).digest("hex").slice(0, 16);
}

export function searchHybrid(
  index: TfidfIndex,
  query: string,
  substringHits: Array<{ path: string; line?: number; excerpt: string; score: number }>,
  maxHits = 40,
): Array<{
  path: string;
  line?: number;
  excerpt: string;
  score: number;
  kind: "tfidf" | "keyword";
}> {
  const tfidf = searchIndex(index, query, maxHits);
  const merged = new Map<
    string,
    { path: string; line?: number; excerpt: string; score: number; kind: "tfidf" | "keyword" }
  >();

  for (const h of tfidf) {
    const key = h.document.path;
    merged.set(key, {
      path: h.document.path,
      excerpt: h.document.text.slice(0, 140),
      score: h.score + 0.05,
      kind: "tfidf",
    });
  }

  for (const h of substringHits) {
    const key = `${h.path}:${h.line ?? 0}`;
    const prev = merged.get(key);
    if (!prev || h.score > prev.score) {
      merged.set(key, { ...h, kind: "keyword" });
    } else if (prev) {
      merged.set(key, { ...prev, score: prev.score + h.score * 0.5 });
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, maxHits);
}
