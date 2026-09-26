import fs from "node:fs/promises";
import path from "node:path";

import { redactSecrets } from "../../platform/security/redact.js";
import { resolveRepoRoot } from "../../utils/path.js";
import { DEFAULT_MAX_FILE_SIZE_BYTES } from "../../constants.js";
import { pathExists, readJsonFile } from "../../utils/fs.js";
import type { TruthLabel } from "../truth.js";

export interface OrgEntityRef {
  id: string;
  name: string;
  description?: string;
}

export interface OrgProjectLink {
  id: string;
  name: string;
  /** Absolute or repo-relative root path for this project within the workspace catalog */
  rootPath: string;
  teamIds: string[];
  serviceIds: string[];
  ownerIds: string[];
}

export interface OrganizationModel {
  schemaVersion: 1;
  updatedAt: string;
  /** Catalog root this model was loaded from (not shared across repos automatically) */
  catalogRoot: string;
  teams: OrgEntityRef[];
  projects: OrgProjectLink[];
  services: OrgEntityRef[];
  owners: OrgEntityRef[];
  truth: TruthLabel;
  limitations: string[];
}

const FORBIDDEN_KEY = /^(secret|token|password|api[_-]?key|credential|private[_-]?key)$/i;

function modelPath(root: string): string {
  return path.join(resolveRepoRoot(root), ".agentdoctor", "org", "model.json");
}

function sanitizeString(value: string): string {
  return redactSecrets(value).text.slice(0, 2000);
}

function sanitizeEntityRef(raw: unknown): OrgEntityRef | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  for (const key of Object.keys(o)) {
    if (FORBIDDEN_KEY.test(key)) return null;
  }
  const id = typeof o.id === "string" ? sanitizeString(o.id.trim()) : "";
  const name = typeof o.name === "string" ? sanitizeString(o.name.trim()) : "";
  if (!id || !name) return null;
  const description =
    typeof o.description === "string" ? sanitizeString(o.description.trim()) : undefined;
  return {
    id,
    name,
    ...(description !== undefined && description.length > 0 ? { description } : {}),
  };
}

function sanitizeProject(raw: unknown, catalogRoot: string): OrgProjectLink | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  for (const key of Object.keys(o)) {
    if (FORBIDDEN_KEY.test(key)) return null;
  }
  const id = typeof o.id === "string" ? sanitizeString(o.id.trim()) : "";
  const name = typeof o.name === "string" ? sanitizeString(o.name.trim()) : "";
  const rootPathRaw = typeof o.rootPath === "string" ? o.rootPath.trim() : catalogRoot;
  if (!id || !name) return null;
  const resolved = path.isAbsolute(rootPathRaw)
    ? path.normalize(rootPathRaw)
    : path.normalize(path.join(catalogRoot, rootPathRaw));
  if (!resolved.startsWith(catalogRoot)) {
    return null;
  }
  const teamIds = Array.isArray(o.teamIds)
    ? o.teamIds.filter((x): x is string => typeof x === "string").map((x) => sanitizeString(x))
    : [];
  const serviceIds = Array.isArray(o.serviceIds)
    ? o.serviceIds.filter((x): x is string => typeof x === "string").map((x) => sanitizeString(x))
    : [];
  const ownerIds = Array.isArray(o.ownerIds)
    ? o.ownerIds.filter((x): x is string => typeof x === "string").map((x) => sanitizeString(x))
    : [];
  return { id, name, rootPath: resolved, teamIds, serviceIds, ownerIds };
}

function emptyModel(catalogRoot: string): OrganizationModel {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    catalogRoot,
    teams: [],
    projects: [],
    services: [],
    owners: [],
    truth: "VERIFIED",
    limitations: [
      "Org model is repo-local metadata only — not synced across machines or tenants.",
      "Secret-like fields are rejected on load/save; values are redacted when persisted.",
      "Linking a project root does not grant cross-repo file access — workspace rules still apply.",
    ],
  };
}

export async function loadOrganizationModel(rootInput: string): Promise<OrganizationModel> {
  const catalogRoot = resolveRepoRoot(rootInput);
  const file = modelPath(catalogRoot);
  if (!(await pathExists(file))) {
    return emptyModel(catalogRoot);
  }
  const parsed = await readJsonFile<unknown>(file, DEFAULT_MAX_FILE_SIZE_BYTES);
  if (!parsed.ok || typeof parsed.data !== "object" || parsed.data === null) {
    return {
      ...emptyModel(catalogRoot),
      truth: "PARTIAL",
      limitations: [
        ...emptyModel(catalogRoot).limitations,
        "Corrupt org model file — using empty model.",
      ],
    };
  }
  const o = parsed.data as Record<string, unknown>;
  const teams: OrgEntityRef[] = [];
  const services: OrgEntityRef[] = [];
  const owners: OrgEntityRef[] = [];
  const projects: OrgProjectLink[] = [];
  if (Array.isArray(o.teams)) {
    for (const item of o.teams) {
      const ref = sanitizeEntityRef(item);
      if (ref) teams.push(ref);
    }
  }
  if (Array.isArray(o.services)) {
    for (const item of o.services) {
      const ref = sanitizeEntityRef(item);
      if (ref) services.push(ref);
    }
  }
  if (Array.isArray(o.owners)) {
    for (const item of o.owners) {
      const ref = sanitizeEntityRef(item);
      if (ref) owners.push(ref);
    }
  }
  if (Array.isArray(o.projects)) {
    for (const item of o.projects) {
      const link = sanitizeProject(item, catalogRoot);
      if (link) projects.push(link);
    }
  }
  return {
    schemaVersion: 1,
    updatedAt:
      typeof o.updatedAt === "string" && o.updatedAt.trim()
        ? o.updatedAt.trim()
        : new Date().toISOString(),
    catalogRoot,
    teams,
    projects,
    services,
    owners,
    truth: "VERIFIED",
    limitations: emptyModel(catalogRoot).limitations,
  };
}

export async function saveOrganizationModel(
  rootInput: string,
  model: Omit<
    OrganizationModel,
    "schemaVersion" | "updatedAt" | "catalogRoot" | "truth" | "limitations"
  >,
): Promise<OrganizationModel> {
  const catalogRoot = resolveRepoRoot(rootInput);
  const teams = model.teams
    .map((t) => sanitizeEntityRef(t))
    .filter((t): t is OrgEntityRef => t !== null);
  const services = model.services
    .map((s) => sanitizeEntityRef(s))
    .filter((s): s is OrgEntityRef => s !== null);
  const owners = model.owners
    .map((o) => sanitizeEntityRef(o))
    .filter((o): o is OrgEntityRef => o !== null);
  const projects = model.projects
    .map((p) => sanitizeProject(p, catalogRoot))
    .filter((p): p is OrgProjectLink => p !== null);

  const record: OrganizationModel = {
    ...emptyModel(catalogRoot),
    teams,
    services,
    owners,
    projects,
    updatedAt: new Date().toISOString(),
  };

  const dir = path.dirname(modelPath(catalogRoot));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(modelPath(catalogRoot), `${JSON.stringify(record, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  return record;
}

/** Register or update a project link under the catalog root (path must stay within catalogRoot). */
export async function linkProjectToOrgModel(
  rootInput: string,
  link: Omit<OrgProjectLink, "rootPath"> & { rootPath?: string },
): Promise<OrganizationModel> {
  const catalogRoot = resolveRepoRoot(rootInput);
  const current = await loadOrganizationModel(catalogRoot);
  const rootPath = link.rootPath ?? catalogRoot;
  const sanitized = sanitizeProject({ ...link, rootPath }, catalogRoot);
  if (!sanitized) {
    throw new Error("Invalid project link — path escape or forbidden fields");
  }
  const projects = current.projects.filter((p) => p.id !== sanitized.id);
  projects.push(sanitized);
  return saveOrganizationModel(catalogRoot, {
    teams: current.teams,
    services: current.services,
    owners: current.owners,
    projects,
  });
}

export function resolveLinkedProjectRoot(
  model: OrganizationModel,
  projectId: string,
): string | null {
  const hit = model.projects.find((p) => p.id === projectId);
  return hit?.rootPath ?? null;
}
