import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { describe, expect, it } from "vitest";

import { startDashboardServer } from "../../../src/dashboard/server.js";

async function getJson(port: number, pathname: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${port}${pathname}`, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

describe("dashboard product routes", () => {
  it("serves product doctor APIs", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-dash-prod-"));
    try {
      await fs.writeFile(
        path.join(root, "package.json"),
        JSON.stringify({ name: "dash-prod", private: true }),
        "utf8",
      );
      const server = await startDashboardServer({ root, port: 0 });
      const dna = (await getJson(server.port, "/api/dna")) as { name?: string };
      expect(dna.name).toBe("dash-prod");
      const map = (await getJson(server.port, "/api/map")) as { tree?: unknown };
      expect(map.tree).toBeTruthy();
      const req = (await getJson(server.port, "/api/requirements")) as { requirements?: unknown[] };
      expect(Array.isArray(req.requirements)).toBe(true);
      const deps = (await getJson(server.port, "/api/deps")) as { directDependencies?: unknown[] };
      expect(Array.isArray(deps.directDependencies)).toBe(true);
      const sec = (await getJson(server.port, "/api/security")) as {
        secretScan?: { findings?: unknown[] };
      };
      expect(Array.isArray(sec.secretScan?.findings)).toBe(true);
      const decisions = (await getJson(server.port, "/api/decisions")) as { decisions?: unknown[] };
      expect(Array.isArray(decisions.decisions)).toBe(true);
      const health = (await getJson(server.port, "/api/health")) as { indicators?: unknown[] };
      expect(Array.isArray(health.indicators)).toBe(true);
      const memory = (await getJson(server.port, "/api/memory?q=test")) as { hits?: unknown[] };
      expect(Array.isArray(memory.hits)).toBe(true);
      await server.close();
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("serves Project Overview home HTML with canonical version", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-dash-home-"));
    try {
      await fs.writeFile(
        path.join(root, "package.json"),
        JSON.stringify({ name: "dash-home", private: true }),
        "utf8",
      );
      const server = await startDashboardServer({ root, port: 0 });
      const html = await new Promise<string>((resolve, reject) => {
        http
          .get(`http://127.0.0.1:${server.port}/`, (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
            res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
          })
          .on("error", reject);
      });
      expect(html).toContain("AgentDoctor");
      expect(html).toContain("3.0.3");
      expect(html).not.toContain("AgentDoctor 2.0");
      expect(html).toContain("homeOverview");
      expect(html).toContain("sidebarNav");
      expect(html).toContain("pageRoot");
      expect(html).toContain("btnCommand");
      expect(html).toContain("OVERVIEW");
      expect(html).toContain("Technical Details");
      expect(html).toContain("Safety");
      const status = (await getJson(server.port, "/api/status")) as {
        ops?: { version?: string };
      };
      expect(status.ops?.version).toBe("3.0.3");
      await server.close();
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("serves what-if and whatif aliases", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ad-dash-whatif-"));
    try {
      await fs.writeFile(
        path.join(root, "package.json"),
        JSON.stringify({ name: "dash-whatif", private: true }),
        "utf8",
      );
      await fs.mkdir(path.join(root, "src"), { recursive: true });
      await fs.writeFile(path.join(root, "src", "a.ts"), "export const a = 1;\n", "utf8");
      const server = await startDashboardServer({ root, port: 0 });
      const a = (await getJson(server.port, "/api/what-if?target=src")) as { target?: string };
      const b = (await getJson(server.port, "/api/whatif?target=src")) as { target?: string };
      expect(a.target).toBeTruthy();
      expect(b.target).toBeTruthy();
      await server.close();
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
