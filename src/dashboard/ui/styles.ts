/** AgentDoctor dashboard design system CSS. */
export const DASHBOARD_CSS = `
:root{
  --bg:#0b0f14;--bg-elev:#111820;--bg-soft:#151d27;--panel:#161e28;--border:#243040;
  --fg:#e8eef5;--muted:#93a0b0;--faint:#6b7888;--accent:#4aa3ff;--accent-2:#2d7fd6;
  --ok:#3ecf8e;--warn:#e6b84d;--crit:#e26060;--unk:#8b9aab;--focus:#7cc4ff;
  --sidebar-w:248px;--sidebar-collapsed:64px;--topbar-h:52px;
  --radius:10px;--font:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{font-family:var(--font);background:var(--bg);color:var(--fg);line-height:1.45;overflow-x:hidden}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
button,input,textarea,select{font:inherit}
button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{
  outline:2px solid var(--focus);outline-offset:2px}
.app{display:grid;grid-template-columns:var(--sidebar-w) 1fr;grid-template-rows:var(--topbar-h) 1fr;height:100vh;min-height:100vh}
.app.collapsed{grid-template-columns:var(--sidebar-collapsed) 1fr}
.topbar{grid-column:1/-1;display:flex;align-items:center;gap:.75rem;padding:0 .9rem;border-bottom:1px solid var(--border);background:var(--bg-elev);min-width:0}
.brand{display:flex;align-items:baseline;gap:.45rem;flex:0 0 auto}
.brand-name{font-weight:700;letter-spacing:.02em;font-size:.98rem}
.brand-ver{color:var(--muted);font-size:.78rem}
.project-chip{display:flex;flex-direction:column;min-width:0;max-width:280px;padding:.25rem .55rem;border:1px solid var(--border);border-radius:8px;background:var(--bg-soft)}
.project-chip strong{font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.project-chip span{font-size:.7rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.topbar-spacer{flex:1}
.topbar-actions{display:flex;align-items:center;gap:.4rem;flex:0 0 auto}
.btn{appearance:none;border:1px solid var(--border);background:var(--bg-soft);color:var(--fg);border-radius:8px;padding:.35rem .65rem;font-size:.8rem;cursor:pointer}
.btn:hover{border-color:#35506a}
.btn-accent{background:var(--accent);border-color:var(--accent-2);color:#041018;font-weight:650}
.btn-ghost{background:transparent}
.kbd{font-family:var(--mono);font-size:.7rem;color:var(--muted);border:1px solid var(--border);border-radius:5px;padding:.05rem .3rem}
.sidebar{border-right:1px solid var(--border);background:var(--bg-elev);overflow:auto;padding:.6rem .45rem .9rem;display:flex;flex-direction:column;gap:.35rem}
.side-toggle{align-self:flex-end;margin:.15rem .2rem .4rem}
.nav-group{margin:.35rem 0 .15rem}
.nav-group-label{font-size:.65rem;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);padding:.2rem .55rem;font-weight:650}
.nav-link{display:flex;align-items:center;gap:.55rem;padding:.42rem .55rem;border-radius:8px;color:var(--muted);font-size:.84rem;text-decoration:none;border:1px solid transparent}
.nav-link:hover{background:var(--bg-soft);color:var(--fg);text-decoration:none}
.nav-link.active{background:#1a2838;color:var(--fg);border-color:#2b425a}
.nav-ico{width:1.1rem;text-align:center;opacity:.85;flex:0 0 auto}
.app.collapsed .nav-group-label,.app.collapsed .nav-text,.app.collapsed .project-chip span,.app.collapsed .brand-ver{display:none}
.app.collapsed .nav-link{justify-content:center;padding:.5rem}
.app.collapsed .project-chip{max-width:100%;padding:.35rem}
.main{overflow:auto;min-width:0;background:var(--bg)}
.content{padding:1rem 1.15rem 2rem;max-width:1180px;margin:0 auto}
.page-header{margin:0 0 1rem}
.page-header h1{margin:0;font-size:1.35rem;font-weight:700}
.page-desc{margin:.35rem 0 0;color:var(--muted);font-size:.9rem;max-width:70ch}
.meta-row{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.55rem}
.badge{display:inline-flex;align-items:center;gap:.25rem;padding:.14rem .48rem;border-radius:999px;border:1px solid var(--border);font-size:.72rem;color:var(--muted);background:var(--bg-soft)}
.badge.ok{color:var(--ok);border-color:#2a5a44}.badge.attention{color:var(--warn);border-color:#5a4a22}
.badge.warning,.badge.critical{color:var(--crit);border-color:#6a3030}.badge.unknown{color:var(--unk)}
.badge.truth{text-transform:uppercase;letter-spacing:.04em;font-size:.68rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:.7rem}
.card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:.85rem .9rem;min-width:0;display:flex;flex-direction:column;gap:.35rem}
.card h3{margin:0;font-size:.88rem}.card p{margin:0;font-size:.8rem;color:var(--muted)}
.card .actions{margin-top:auto;padding-top:.35rem}
.section{margin:1rem 0;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:1rem}
.section h2{margin:0 0 .65rem;font-size:1rem}
.section h3{margin:.8rem 0 .4rem;font-size:.9rem}
.empty,.error,.loading{padding:1.05rem 1.1rem;border:1px dashed var(--border);border-radius:var(--radius);color:var(--muted);background:var(--bg-soft)}
.empty strong,.error strong,.loading strong{display:block;color:var(--fg);font-size:.92rem;margin-bottom:.35rem}
.empty p,.error p,.loading p{margin:.3rem 0 0;font-size:.84rem}
.error{border-style:solid;border-color:#6a3030;color:#f0b4b4;background:#1a1214}
.ask-banner{margin:0 0 .85rem;padding:.65rem .8rem;border:1px solid #2b425a;border-radius:var(--radius);background:#121a24;color:var(--muted);font-size:.82rem}
.ask-banner strong{color:var(--fg)}
.scope-note{margin:.5rem 0 0;font-size:.8rem;color:var(--faint)}
.filter-input{width:100%;text-align:left;margin-bottom:.5rem}
.section-plain{margin:1rem 0}
.section-plain h2{margin:0 0 .65rem;font-size:1rem}
.status-dot{width:.55rem;height:.55rem;border-radius:50%;background:var(--ok);display:inline-block;margin-right:.35rem;vertical-align:middle}
.status-dot.warn{background:var(--warn)}.status-dot.off{background:var(--unk)}
.topbar-status{font-size:.72rem;color:var(--muted);white-space:nowrap}
.uncertainty{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.55rem;margin:.65rem 0}
.uncertainty .card h3{font-size:.78rem;text-transform:uppercase;letter-spacing:.04em;color:var(--faint)}
@media (max-width:1280px){
  .content{max-width:100%}
}
@media (max-width:1024px){
  .project-chip{max-width:200px}
}
@media (max-width:768px){
  .topbar{gap:.45rem;padding:0 .55rem}
  .topbar-status,.brand-ver{display:none}
  .btn .kbd{display:none}
  .content{padding:.75rem .7rem 1.5rem}
}
@media (max-width:390px){
  .project-chip{max-width:36vw}
  .brand-name{font-size:.9rem}
}
.skeleton{height:.85rem;border-radius:6px;background:linear-gradient(90deg,#15202b,#1c2835,#15202b);background-size:200% 100%;animation:sk 1.2s infinite}
@keyframes sk{0%{background-position:200% 0}100%{background-position:-200% 0}}
.table-wrap{overflow:auto;border:1px solid var(--border);border-radius:8px}
table,.table-wrap table{width:100%;border-collapse:collapse;font-size:.8rem}
table.data{width:100%;border-collapse:collapse;font-size:.8rem}
table th,table td,table.data th,table.data td{padding:.45rem .55rem;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
table.data th{color:var(--muted);font-weight:600;background:var(--bg-soft);position:sticky;top:0}
table.data tr:hover td{background:#182230}
.mono,.code{font-family:var(--mono);font-size:.78rem}
.tech details{margin-top:.75rem}
.tech summary{cursor:pointer;color:var(--accent);font-size:.85rem}
.pre{white-space:pre-wrap;word-break:break-word;font-family:var(--mono);font-size:.75rem;color:#d5dde6;margin:0;max-height:420px;overflow:auto;background:var(--bg-soft);border:1px solid var(--border);border-radius:8px;padding:.65rem}
.chips{display:flex;flex-wrap:wrap;gap:.3rem}
.path-sec{font-size:.75rem;color:var(--faint);word-break:break-all;margin:.25rem 0 0}
.chat-layout{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(240px,1fr);gap:.85rem}
.chat-log{min-height:280px;max-height:52vh;overflow:auto;border:1px solid var(--border);border-radius:8px;padding:.75rem;background:var(--bg-soft)}
.chat-msg{margin:0 0 .75rem;padding:.55rem .65rem;border-radius:8px;border:1px solid var(--border);background:var(--panel)}
.chat-msg.user{border-color:#2b425a}
.composer{display:flex;flex-direction:column;gap:.45rem;margin-top:.55rem}
.composer textarea{width:100%;min-height:72px;resize:vertical;background:#0d1520;color:var(--fg);border:1px solid var(--border);border-radius:8px;padding:.55rem}
.graph-legend{display:flex;flex-wrap:wrap;gap:.4rem;margin:.5rem 0}
.graph-canvas{width:100%;height:320px;border:1px solid var(--border);border-radius:8px;background:#0d1520;overflow:hidden}
.palette{position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;align-items:flex-start;justify-content:center;padding:12vh 1rem;z-index:50}
.palette.open{display:flex}
.palette-box{width:min(640px,100%);background:var(--bg-elev);border:1px solid var(--border);border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.45)}
.palette-box input{width:100%;border:0;border-bottom:1px solid var(--border);background:transparent;color:var(--fg);padding:.85rem 1rem;font-size:1rem}
.palette-list{max-height:50vh;overflow:auto}
.palette-item{display:flex;justify-content:space-between;gap:1rem;padding:.65rem 1rem;cursor:pointer;border:0;background:transparent;color:var(--fg);width:100%;text-align:left}
.palette-item:hover,.palette-item.active{background:var(--bg-soft)}
.palette-item small{color:var(--muted)}
.drawer-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;z-index:40}
.drawer-backdrop.open{display:block}
.mobile-nav{display:none}
.safety-row{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center}
@media (max-width:980px){
  .app,.app.collapsed{grid-template-columns:1fr}
  .sidebar{position:fixed;inset:var(--topbar-h) auto 0 0;width:min(280px,86vw);z-index:45;transform:translateX(-105%);transition:transform .18s ease;box-shadow:8px 0 30px rgba(0,0,0,.35)}
  .sidebar.open{transform:translateX(0)}
  .mobile-nav{display:inline-flex}
  .chat-layout{grid-template-columns:1fr}
}
@media (max-width:640px){
  .content{padding:.85rem}.page-header h1{font-size:1.15rem}.grid{grid-template-columns:1fr}
  .project-chip{max-width:42vw}
}
`.trim();
