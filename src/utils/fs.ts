import fs from "node:fs/promises";
import path from "node:path";

export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(target: string): Promise<boolean> {
  try {
    const stat = await fs.stat(target);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function readTextFile(filePath: string, maxBytes: number): Promise<string | null> {
  try {
    const handle = await fs.open(filePath, "r");
    try {
      const stat = await handle.stat();
      if (stat.size > maxBytes) {
        return null;
      }
      const buffer = Buffer.alloc(Number(stat.size));
      await handle.read(buffer, 0, buffer.length, 0);
      return buffer.toString("utf8");
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

export async function readJsonFile<T>(
  filePath: string,
  maxBytes: number,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const text = await readTextFile(filePath, maxBytes);
  if (text === null) {
    return { ok: false, error: `Unable to read or file too large: ${path.basename(filePath)}` };
  }
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return { ok: false, error: message };
  }
}

export async function listDirectorySafe(
  dirPath: string,
): Promise<{ ok: true; entries: string[] } | { ok: false; error: string }> {
  try {
    const entries = await fs.readdir(dirPath);
    return { ok: true, entries };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read directory";
    return { ok: false, error: message };
  }
}

/**
 * Write text via a same-directory temp file, then replace the target.
 * On Windows, `rename` cannot overwrite an existing destination — remove first.
 */
export async function atomicWriteTextFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.agentdoctor.${process.pid}.${Date.now()}.tmp`,
  );
  await fs.writeFile(tmp, content, "utf8");
  try {
    await replaceFile(tmp, filePath);
  } catch (error) {
    await fs.rm(tmp, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function replaceFile(tmpPath: string, targetPath: string): Promise<void> {
  try {
    await fs.rename(tmpPath, targetPath);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    // Windows (and some locked-file cases) cannot rename over an existing path.
    if (process.platform === "win32" || code === "EEXIST" || code === "EPERM") {
      await fs.rm(targetPath, { force: true });
      await fs.rename(tmpPath, targetPath);
      return;
    }
    throw error;
  }
}
