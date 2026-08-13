import {
  LocalBrainStore,
  type ProjectBrain,
  type SnapshotMeta,
} from "../../core/understanding/brain/index.js";
import { compileProjectBrain } from "./compile.js";
import { BrainMcpError } from "./errors.js";
import { resolveProjectRoot } from "./security/root.js";

export interface BrainMcpSessionOptions {
  /** Explicit project root — required. Never defaults to process.cwd(). */
  root: string;
  /** When true, rebuild brain if no snapshot exists. Default true. */
  buildIfMissing?: boolean;
  /** Optional fixed timestamp for deterministic rebuilds in tests. */
  generatedAt?: string;
  /** stderr logger — never write protocol traffic. */
  log?: (message: string) => void;
}

/**
 * Holds a loaded ProjectBrain for the lifetime of an MCP server process.
 * Brain is loaded once; tools query the in-memory snapshot.
 */
export class BrainMcpSession {
  private root: string | null = null;
  private store: LocalBrainStore | null = null;
  private brain: ProjectBrain | null = null;
  private readonly buildIfMissing: boolean;
  private readonly generatedAt: string | undefined;
  private readonly log: (message: string) => void;

  constructor(private readonly options: BrainMcpSessionOptions) {
    this.buildIfMissing = options.buildIfMissing !== false;
    this.generatedAt = options.generatedAt;
    this.log = options.log ?? ((message: string) => process.stderr.write(`${message}\n`));
  }

  async initialize(): Promise<void> {
    this.root = await resolveProjectRoot(this.options.root);
    this.store = LocalBrainStore.underRepo(this.root);
    let loaded: ProjectBrain | null = null;
    try {
      loaded = await this.store.loadLatest();
    } catch (error) {
      const message = error instanceof Error ? error.message : "corrupt brain store";
      throw new BrainMcpError("brain_corrupt", message);
    }

    if (loaded) {
      this.brain = loaded;
      this.log(`agentdoctor brain-mcp: loaded snapshot ${loaded.snapshot.id} from ${this.root}`);
      return;
    }

    if (!this.buildIfMissing) {
      throw new BrainMcpError(
        "brain_not_found",
        "no Project Brain snapshot found; rebuild with brain_snapshot action=rebuild",
      );
    }

    this.log(`agentdoctor brain-mcp: no snapshot found; compiling Project Brain…`);
    await this.rebuild();
  }

  getProjectRoot(): string {
    if (!this.root) {
      throw new BrainMcpError("invalid_root", "session not initialized");
    }
    return this.root;
  }

  getStore(): LocalBrainStore {
    if (!this.store) {
      throw new BrainMcpError("internal", "session not initialized");
    }
    return this.store;
  }

  getBrain(): ProjectBrain {
    if (!this.brain) {
      throw new BrainMcpError(
        "brain_not_found",
        "no Project Brain loaded; rebuild with brain_snapshot action=rebuild",
      );
    }
    return this.brain;
  }

  async rebuild(): Promise<ProjectBrain> {
    const root = this.getProjectRoot();
    const store = this.getStore();
    const previous = this.brain;
    const brain = await compileProjectBrain(root, {
      ...(previous ? { previousClaims: previous.claims } : {}),
      ...(this.generatedAt !== undefined ? { generatedAt: this.generatedAt } : {}),
    });
    try {
      await store.saveSnapshot(brain);
      this.log(`agentdoctor brain-mcp: saved snapshot ${brain.snapshot.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/refusing overwrite/i.test(message)) {
        // Model identity unchanged while claim lifecycle/content differs — keep memory fresh.
        this.log(
          `agentdoctor brain-mcp: snapshot ${brain.snapshot.id} unchanged structurally; refreshed in-memory brain`,
        );
      } else {
        throw error instanceof BrainMcpError
          ? error
          : new BrainMcpError("brain_corrupt", message || "failed to save snapshot");
      }
    }
    this.brain = brain;
    return brain;
  }

  async loadSnapshot(snapshotId: string): Promise<ProjectBrain> {
    const store = this.getStore();
    try {
      const brain = await store.loadSnapshot(snapshotId);
      this.brain = brain;
      return brain;
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to load snapshot";
      if (/not found|ENOENT/i.test(message)) {
        throw new BrainMcpError("not_found", message);
      }
      throw new BrainMcpError("brain_corrupt", message);
    }
  }

  async listSnapshots(): Promise<SnapshotMeta[]> {
    return this.getStore().listSnapshots();
  }

  async compareSnapshots(leftId: string, rightId: string) {
    try {
      return await this.getStore().compareSnapshots(leftId, rightId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "compare failed";
      throw new BrainMcpError("brain_corrupt", message);
    }
  }
}
