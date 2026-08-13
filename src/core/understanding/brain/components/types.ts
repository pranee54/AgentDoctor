export type BrainComponentType = "module" | "entrypoint" | "package" | "domain-surface";

export interface BrainComponent {
  id: string;
  type: BrainComponentType;
  name: string;
  path: string;
  domainIds: readonly string[];
  dependencyIds: readonly string[];
  dependentIds: readonly string[];
  entrypointIds: readonly string[];
  owner?: string;
  riskKinds: readonly string[];
  evidenceIds: readonly string[];
  confidence: number;
}

export function createComponentId(type: BrainComponentType, path: string): string {
  const key = `${type}\0${path}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return `comp_${hash.toString(16).padStart(8, "0")}`;
}
