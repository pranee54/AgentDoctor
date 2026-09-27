import { colors, symbolFail, symbolOk } from "../utils/colors.js";
import type { AskProgressReporter, AskProgressStageId } from "../agent/progress.js";

export type { AskProgressReporter, AskProgressStageId };

const STAGE_LABELS: Record<AskProgressStageId, string> = {
  understand: "Understanding question",
  search: "Searching project knowledge",
  retrieve: "Retrieving relevant evidence",
  verify: "Verifying evidence",
  prepare: "Preparing answer",
};

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;

export interface CreateAskProgressOptions {
  /** When false, all methods are no-ops (JSON / quiet / tests). */
  enabled?: boolean;
  /** Defaults to stderr — keeps stdout free for answers / JSON. */
  stream?: NodeJS.WritableStream;
  /** Override TTY detection (tests). Defaults to stream.isTTY. */
  isTTY?: boolean;
}

/**
 * Human-readable ask progress. Stages must be driven by real operations.
 * Animation uses setInterval only for frame updates while work is in flight —
 * never to invent delay.
 */
export function createAskProgress(options: CreateAskProgressOptions = {}): AskProgressReporter {
  const enabled = options.enabled !== false;
  const stream = options.stream ?? process.stderr;
  const tty =
    options.isTTY ??
    Boolean(stream && typeof stream === "object" && "isTTY" in stream && stream.isTTY);
  let frame = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let activeLabel: string | undefined;
  let stopped = false;

  const clearLine = (): void => {
    if (!tty || !enabled) return;
    stream.write("\r\x1b[K");
  };

  const stopSpin = (): void => {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
    clearLine();
  };

  const renderSpin = (): void => {
    if (!tty || !enabled || !activeLabel || stopped) return;
    const glyph = SPINNER_FRAMES[frame % SPINNER_FRAMES.length]!;
    frame += 1;
    stream.write(`\r${colors.cyan(glyph)} ${activeLabel}...`);
  };

  const writeDone = (ok: boolean, label: string, detail?: string): void => {
    if (!enabled || stopped) return;
    const mark = ok ? symbolOk() : symbolFail();
    const suffix = detail ? colors.dim(` — ${detail}`) : "";
    stream.write(`${mark} ${label}${suffix}\n`);
  };

  return {
    stage(id, state, detail) {
      if (!enabled || stopped) return;
      const label = STAGE_LABELS[id];
      if (state === "start") {
        stopSpin();
        activeLabel = label;
        if (tty) {
          frame = 0;
          renderSpin();
          timer = setInterval(renderSpin, 80);
          timer.unref?.();
        } else {
          stream.write(`${label}...\n`);
        }
        return;
      }
      stopSpin();
      activeLabel = undefined;
      writeDone(
        state === "ok",
        state === "ok" && id === "prepare" ? "Answer ready" : label,
        detail,
      );
    },
    stop() {
      stopSpin();
      activeLabel = undefined;
      stopped = true;
    },
  };
}

export function silentAskProgress(): AskProgressReporter {
  return {
    stage() {},
    stop() {},
  };
}
