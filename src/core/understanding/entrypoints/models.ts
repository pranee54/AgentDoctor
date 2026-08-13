import type { EntrypointFramework } from "./types.js";

export interface ContentSignal {
  /** Stable evidence label returned in JSON (e.g. "runApp()"). */
  label: string;
  pattern: RegExp;
}

export interface EntrypointModel {
  framework: EntrypointFramework;
  /** Path must match before we inspect content (except contentOnly models). */
  pathTest: (relativePath: string) => boolean;
  signals: ContentSignal[];
  /** Confidence when only the path convention matches. */
  pathConfidence: number;
  /** Added per distinct content signal hit, capped with pathConfidence at 0.99. */
  signalBoost: number;
  /**
   * When true, pathTest alone is insufficient — at least one content signal required.
   * Prevents guessing from generic names like main.ts / app.ts.
   */
  requireSignal: boolean;
}

function basename(relativePath: string): string {
  const parts = relativePath.split("/");
  return parts[parts.length - 1] ?? relativePath;
}

function posix(relativePath: string): string {
  return relativePath.replace(/\\/g, "/");
}

/**
 * Deterministic entrypoint models. Order matters for stable multi-match preference
 * when the same file could qualify under multiple frameworks (NestJS before Node).
 */
export const ENTRYPOINT_MODELS: readonly EntrypointModel[] = [
  {
    framework: "Flutter",
    pathTest: (p) => {
      const path = posix(p);
      return (
        path === "lib/main.dart" ||
        path.endsWith("/lib/main.dart") ||
        basename(path) === "main.dart"
      );
    },
    signals: [
      { label: "runApp()", pattern: /\brunApp\s*\(/ },
      { label: "MaterialApp", pattern: /\bMaterialApp\b/ },
      { label: "CupertinoApp", pattern: /\bCupertinoApp\b/ },
      { label: "GoRouter", pattern: /\bGoRouter\b/ },
    ],
    pathConfidence: 0.7,
    signalBoost: 0.1,
    requireSignal: false,
  },
  {
    framework: "Laravel",
    pathTest: (p) => {
      const path = posix(p);
      return (
        path === "routes/web.php" ||
        path === "routes/api.php" ||
        path.endsWith("/routes/web.php") ||
        path.endsWith("/routes/api.php") ||
        basename(path) === "artisan" ||
        path === "bootstrap/app.php" ||
        path.endsWith("/bootstrap/app.php")
      );
    },
    signals: [
      { label: "Route::", pattern: /\bRoute\s*::/ },
      { label: "Illuminate\\", pattern: /Illuminate\\/ },
      { label: "Application::configure", pattern: /Application\s*::\s*configure/ },
    ],
    pathConfidence: 0.85,
    signalBoost: 0.05,
    requireSignal: false,
  },
  {
    framework: "Next.js",
    pathTest: (p) => {
      const path = posix(p);
      const base = basename(path);
      const inApp =
        /(^|\/)app\//.test(path) &&
        (base === "layout.tsx" ||
          base === "layout.jsx" ||
          base === "layout.js" ||
          base === "page.tsx" ||
          base === "page.jsx" ||
          base === "page.js");
      const inPages =
        /(^|\/)pages\//.test(path) &&
        (base === "_app.tsx" ||
          base === "_app.jsx" ||
          base === "_app.js" ||
          base === "index.tsx" ||
          base === "index.jsx" ||
          base === "index.js");
      return inApp || inPages;
    },
    signals: [
      { label: "next/navigation", pattern: /from\s+["']next\/navigation["']/ },
      { label: "next/router", pattern: /from\s+["']next\/router["']/ },
      { label: "next/head", pattern: /from\s+["']next\/head["']/ },
      { label: "Metadata", pattern: /\bexport\s+(const|async\s+function|function)\s+metadata\b/ },
    ],
    pathConfidence: 0.8,
    signalBoost: 0.06,
    requireSignal: false,
  },
  {
    framework: "NestJS",
    pathTest: (p) => {
      const path = posix(p);
      const base = basename(path);
      return base === "main.ts" || base === "main.js";
    },
    signals: [
      { label: "NestFactory", pattern: /\bNestFactory\b/ },
      {
        label: "bootstrap()",
        pattern: /\basync\s+function\s+bootstrap\s*\(|\bbootstrap\s*\(\s*\)/,
      },
      { label: "@nestjs/core", pattern: /@nestjs\/core/ },
    ],
    pathConfidence: 0.55,
    signalBoost: 0.15,
    requireSignal: true,
  },
  {
    framework: "React",
    pathTest: (p) => {
      const path = posix(p);
      const base = basename(path);
      if (/(^|\/)(app|pages)\//.test(path)) {
        return false;
      }
      return (
        base === "main.tsx" ||
        base === "main.jsx" ||
        base === "index.tsx" ||
        base === "index.jsx" ||
        base === "App.tsx" ||
        base === "App.jsx"
      );
    },
    signals: [
      { label: "ReactDOM.createRoot()", pattern: /ReactDOM\s*\.\s*createRoot\s*\(/ },
      { label: "createRoot()", pattern: /\bcreateRoot\s*\(/ },
      { label: "ReactDOM.render(", pattern: /ReactDOM\s*\.\s*render\s*\(/ },
      { label: 'from "react"', pattern: /from\s+["']react["']/ },
    ],
    pathConfidence: 0.6,
    signalBoost: 0.12,
    requireSignal: true,
  },
  {
    framework: "Node",
    pathTest: (p) => {
      const path = posix(p);
      const base = basename(path);
      return (
        base === "server.ts" ||
        base === "server.js" ||
        base === "server.mjs" ||
        base === "app.ts" ||
        base === "app.js" ||
        base === "app.mjs" ||
        base === "index.ts" ||
        base === "index.js"
      );
    },
    signals: [
      { label: "express()", pattern: /\bexpress\s*\(/ },
      { label: "fastify()", pattern: /\bfastify\s*\(/ },
      { label: "createServer(", pattern: /\bcreateServer\s*\(/ },
      { label: "listen(", pattern: /\.listen\s*\(/ },
      { label: "koa(", pattern: /\bnew\s+Koa\s*\(|\bkoa\s*\(/ },
    ],
    pathConfidence: 0.5,
    signalBoost: 0.15,
    requireSignal: true,
  },
  {
    framework: "Django",
    pathTest: (p) => basename(posix(p)) === "manage.py",
    signals: [
      { label: "django", pattern: /\bdjango\b/i },
      { label: "execute_from_command_line", pattern: /\bexecute_from_command_line\b/ },
    ],
    pathConfidence: 0.9,
    signalBoost: 0.04,
    requireSignal: false,
  },
  {
    framework: "Python",
    pathTest: (p) => {
      const base = basename(posix(p));
      return base === "main.py" || base === "app.py" || base === "wsgi.py" || base === "asgi.py";
    },
    signals: [
      { label: "FastAPI()", pattern: /\bFastAPI\s*\(/ },
      { label: "Flask(", pattern: /\bFlask\s*\(/ },
      { label: "uvicorn", pattern: /\buvicorn\b/ },
      { label: "if __name__", pattern: /if\s+__name__\s*==\s*["']__main__["']/ },
    ],
    pathConfidence: 0.55,
    signalBoost: 0.15,
    requireSignal: true,
  },
  {
    framework: "Java",
    pathTest: (p) => {
      const path = posix(p);
      return path.endsWith(".java") && /Application\.java$|Main\.java$/i.test(basename(path));
    },
    signals: [
      { label: "@SpringBootApplication", pattern: /@SpringBootApplication\b/ },
      { label: "public static void main", pattern: /public\s+static\s+void\s+main\s*\(/ },
      { label: "SpringApplication.run", pattern: /\bSpringApplication\s*\.\s*run\s*\(/ },
    ],
    pathConfidence: 0.55,
    signalBoost: 0.15,
    requireSignal: true,
  },
  {
    framework: "Go",
    pathTest: (p) => basename(posix(p)) === "main.go",
    signals: [
      { label: "package main", pattern: /^package\s+main\b/m },
      { label: "func main()", pattern: /\bfunc\s+main\s*\(\s*\)/ },
    ],
    pathConfidence: 0.65,
    signalBoost: 0.15,
    requireSignal: true,
  },
  {
    framework: "Rust",
    pathTest: (p) => {
      const path = posix(p);
      return (
        path === "src/main.rs" || path.endsWith("/src/main.rs") || basename(path) === "main.rs"
      );
    },
    signals: [{ label: "fn main()", pattern: /\bfn\s+main\s*\(\s*\)/ }],
    pathConfidence: 0.7,
    signalBoost: 0.2,
    requireSignal: true,
  },
];
