import { PACKAGE_VERSION } from "../constants.js";
import { DASHBOARD_CSS } from "./ui/styles.js";
import { DASHBOARD_CLIENT_JS } from "./ui/client.js";

/** Embedded dashboard HTML. Version injected only from PACKAGE_VERSION. */
export function htmlPage(): string {
  const version = PACKAGE_VERSION;
  const client = DASHBOARD_CLIENT_JS.replaceAll("%%PACKAGE_VERSION%%", version).replaceAll(
    "</script>",
    "<\\/script>",
  );
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AgentDoctor ${version}</title>
  <style>${DASHBOARD_CSS}</style>
</head>
<body>
  <div class="app" id="app">
    <header class="topbar" role="banner">
      <button type="button" class="btn btn-ghost mobile-nav" id="btnMenu" aria-label="Open navigation">☰</button>
      <div class="brand">
        <span class="brand-name">AgentDoctor</span>
        <span class="brand-ver" id="headerVersion">v${version}</span>
      </div>
      <div class="project-chip" title="Active project">
        <strong id="projectName">Loading…</strong>
        <span id="projectMeta">Detecting stack…</span>
      </div>
      <div class="topbar-spacer"></div>
      <div class="topbar-actions">
        <span class="topbar-status" id="topbarStatus" title="Dashboard mode"><span class="status-dot" aria-hidden="true"></span>Local · Read-only</span>
        <button type="button" class="btn" id="btnCommand" aria-label="Open command palette">Search <span class="kbd">⌘K</span></button>
        <a class="btn" href="#system">System</a>
      </div>
    </header>
    <aside class="sidebar" id="sidebar" aria-label="Primary">
      <button type="button" class="btn btn-ghost side-toggle" id="btnCollapse" aria-label="Collapse sidebar">⇄</button>
      <nav id="sidebarNav"></nav>
    </aside>
    <main class="main" role="main">
      <div class="content" id="pageRoot"></div>
    </main>
  </div>
  <div class="drawer-backdrop" id="drawerBackdrop"></div>
  <div class="palette" id="palette" role="dialog" aria-modal="true" aria-label="Command palette">
    <div class="palette-box">
      <input id="paletteInput" placeholder="Go to page or search project…" aria-label="Command search" />
      <div class="palette-list" id="paletteList"></div>
    </div>
  </div>
  <script>${client}</script>
</body>
</html>`;
}
