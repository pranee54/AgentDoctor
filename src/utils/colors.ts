import pc from "picocolors";

const useColor =
  !("NO_COLOR" in process.env) &&
  process.env["FORCE_COLOR"] !== "0" &&
  process.stdout.isTTY === true;

export const colors = {
  bold: (s: string) => (useColor ? pc.bold(s) : s),
  dim: (s: string) => (useColor ? pc.dim(s) : s),
  cyan: (s: string) => (useColor ? pc.cyan(s) : s),
  green: (s: string) => (useColor ? pc.green(s) : s),
  yellow: (s: string) => (useColor ? pc.yellow(s) : s),
  red: (s: string) => (useColor ? pc.red(s) : s),
  magenta: (s: string) => (useColor ? pc.magenta(s) : s),
  white: (s: string) => (useColor ? pc.white(s) : s),
};

export function symbolOk(): string {
  return colors.green("✓");
}

export function symbolWarn(): string {
  return colors.yellow("!");
}

export function symbolFail(): string {
  return colors.red("✗");
}

export function symbolInfo(): string {
  return colors.cyan("i");
}
