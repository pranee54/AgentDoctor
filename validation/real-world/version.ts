/** Real-world validation laboratory version (pinned suite contract). */
export const REAL_WORLD_SUITE_VERSION = "1.0.0";

/** Fixed timestamp for deterministic ProjectModel builds during validation. */
export const REAL_WORLD_GENERATED_AT = "2026-08-06T00:00:00.000Z";

/** Per-repository compile wall-clock budget (ms). Exceeded → recorded failure, not hang. */
export const REAL_WORLD_COMPILE_TIMEOUT_MS = 180_000;

/** Concurrent git fetch workers when materializing checkouts. */
export const REAL_WORLD_CLONE_CONCURRENCY = 4;
