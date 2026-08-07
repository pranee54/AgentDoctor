import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { scan } from "../../../src/index.js";
import { renderTerminalReport } from "../../../src/reporters/terminal/report.js";

const tempDirs: string[] = [];

async function tempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agentdoctor-next-steps-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
});

describe("terminal Next steps workflow", () => {
  it("points review-only findings at explain/verify instead of implying Fix will apply", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(path.join(root, "AGENTS.md"), "demo\n");
    await fs.writeFile(path.join(root, ".env"), "SECRET=1\n");

    const output = renderTerminalReport(await scan({ cwd: root }));

    expect(output).toContain("Next");
    expect(output).toMatch(/\[review\]/);
    expect(output).toMatch(/need review or manual action/);
    expect(output).toContain("agentdoctor fix");
    expect(output).toContain("will not change them automatically");
    expect(output).toContain("agentdoctor scan --json > agentdoctor-report.json");
    expect(output).toContain("agentdoctor verify --baseline agentdoctor-report.json");
    expect(output).not.toContain("agentdoctor fix --dry-run");
  });

  it("points safe findings at fix --dry-run", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(path.join(root, "AGENTS.md"), "demo\n");
    await fs.mkdir(path.join(root, "dist"), { recursive: true });
    await fs.writeFile(path.join(root, "dist/out.js"), "1\n");

    const output = renderTerminalReport(await scan({ cwd: root }));

    expect(output).toContain("Next");
    expect(output).toMatch(/\[safe\]/);
    expect(output).toContain("agentdoctor fix --dry-run");
    expect(output).toContain("agentdoctor fix -y");
    expect(output).toContain("agentdoctor verify --baseline agentdoctor-report.json");
  });

  it("does not add a Next block when there are no findings and agents are configured", async () => {
    const root = await tempRepo();
    await fs.writeFile(path.join(root, "package.json"), "{}\n");
    await fs.writeFile(path.join(root, "AGENTS.md"), "Keep secrets out of agent context.\n");

    const output = renderTerminalReport(await scan({ cwd: root }));
    expect(output).toContain("No findings");
    expect(output).not.toMatch(/\nNext\n/);
  });
});
