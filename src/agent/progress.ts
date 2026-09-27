/**
 * Progress hooks for ask/context retrieval.
 * Presentation lives in CLI; agent code only reports real operation boundaries.
 */
export type AskProgressStageId = "understand" | "search" | "retrieve" | "verify" | "prepare";

export interface AskProgressReporter {
  stage(id: AskProgressStageId, state: "start" | "ok" | "fail", detail?: string): void;
  stop(): void;
}

export const noopAskProgress: AskProgressReporter = {
  stage() {},
  stop() {},
};
