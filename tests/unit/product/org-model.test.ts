import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  linkProjectToOrgModel,
  loadOrganizationModel,
  saveOrganizationModel,
} from "../../../src/product/org/model.js";

describe("organization model", () => {
  it("persists teams/projects without secret fields", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-org-"));
    try {
      await saveOrganizationModel(root, {
        teams: [{ id: "t1", name: "Platform" }],
        services: [{ id: "s1", name: "API" }],
        owners: [{ id: "o1", name: "Owner" }],
        projects: [
          {
            id: "p1",
            name: "Main",
            rootPath: root,
            teamIds: ["t1"],
            serviceIds: ["s1"],
            ownerIds: ["o1"],
          },
        ],
      });
      const loaded = await loadOrganizationModel(root);
      expect(loaded.projects[0]?.id).toBe("p1");
      expect(loaded.teams[0]?.name).toBe("Platform");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("rejects path escape on link", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-org-"));
    try {
      await expect(
        linkProjectToOrgModel(root, {
          id: "bad",
          name: "Bad",
          rootPath: "/etc",
          teamIds: [],
          serviceIds: [],
          ownerIds: [],
        }),
      ).rejects.toThrow(/Invalid project link/);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("strips secret-like keys on load", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-org-"));
    try {
      const dir = path.join(root, ".agentdoctor", "org");
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        path.join(dir, "model.json"),
        JSON.stringify({
          teams: [{ id: "x", name: "X", apiKey: "should-drop" }],
          projects: [],
          services: [],
          owners: [],
        }),
        "utf8",
      );
      const loaded = await loadOrganizationModel(root);
      expect(loaded.teams).toEqual([]);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
