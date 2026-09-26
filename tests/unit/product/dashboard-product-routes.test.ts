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
});
