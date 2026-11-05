// 生成可公网发布的静态站（定稿样式：暗场、暖白、Barlow + 思源黑体）。
// 仓库文档转网页；架构图页用定稿框图（直角走线 + 光束）替换 Mermaid；首页嵌入实时硬件框图。
// 输出 dist-site/（扁平目录、不含子目录，避免出现目录列表）。
import { marked } from "marked";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";

const REPO = "../..";
const OUT = "dist-site";
const GH = "https://github.com/jodancain/independent-cellular-ai-glasses";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);

const LAYOUTS = JSON.parse(readFileSync("src/diagrams/layouts.json", "utf8"));
const ORDER = ["Overview", "HardwareCompute", "HardwarePower", "DataPaths", "SoftwareStack", "Protocol", "PowerStates", "Calls", "Deploy", "DisplayModes"];
const docs = readdirSync(`${REPO}/docs`).filter((f) => f.endsWith(".md"));
const titleOf = (md) => (md.match(/^#\s+(.+)$/m)?.[1] ?? "文档").trim();
const hasFilm = existsSync("dist/plan-film.mp4");
const hasTech = existsSync("dist/tech-film.mp4");
const HW = `${REPO}/hardware/v0.1`;
const hasHW = existsSync(`${HW}/viewer/app.js`);
const NAV = [
  ["index.html", "首页"],
  ...(hasFilm ? [["film.html", "视频"]] : []),
  ...(hasHW ? [["hardware.html", "硬件"]] : []),
  ["architecture-motion.html", "动态架构图"],
  ["system-architecture.html", "架构图"],
  ["technical-roadmap.html", "技术路线"],
  ["design-requirements.html", "设计开发要求"],
  ["streaming-direction.html", "方案"],
  ["validation-plan.html", "验证计划"],
  ["sources.html", "来源"],
];

const slug = (t) => t.toLowerCase().trim().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-");
const rewrite = (href, fromRoot) => {
  if (!href || /^(https?:|mailto:|#)/.test(href)) return href;
  const [path, hash] = href.split("#");
  const h = hash ? `#${hash}` : "";
  if (/system-architecture-motion\.html$/.test(path)) return `architecture-motion.html${h}`;
  const doc = path.match(/^(?:\.\/)?(?:docs\/)?([\w-]+)\.md$/);
  const isDocsDir = fromRoot ? path.startsWith("docs/") : !path.includes("/") || path.startsWith("./");
  if (doc && isDocsDir && docs.includes(`${doc[1]}.md`)) return `${doc[1]}.html${h}`;
  let repoPath = path.replace(/^\.\//, "");
  if (!fromRoot) repoPath = repoPath.startsWith("../") ? repoPath.slice(3) : `docs/${repoPath}`;
  return `${GH}/blob/main/${repoPath}${h}`;
};

const css = `:root{--bg:#050608;--panel:#0b0e15;--ink:#f2f4f8;--dim:#8f9bb3;--line:rgba(242,244,248,.12);--acc:#e8e2d4;--en:"Barlow","DIN Alternate","Noto Sans SC",sans-serif;--cn:"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif;--mono:"JetBrains Mono",Menlo,monospace;color-scheme:dark}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--cn);line-height:1.75}
a{color:var(--acc);text-underline-offset:3px}
header.top{position:sticky;top:0;z-index:5;background:rgba(5,6,8,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
header.top .in{max-width:1180px;margin:0 auto;padding:0 24px;display:flex;flex-wrap:wrap;align-items:center;gap:0 22px}
header.top b{font-family:var(--en);font-weight:500;letter-spacing:.24em;font-size:13px;margin-right:12px;padding:14px 0}
header.top a{color:var(--dim);text-decoration:none;font-size:14px;padding:14px 0 12px;border-bottom:2px solid transparent}
header.top a:hover{color:var(--ink)}header.top a.on{color:var(--ink);border-bottom-color:var(--acc)}
main{max-width:1180px;margin:0 auto;padding:40px 24px 96px}
h1{font-size:clamp(30px,4vw,44px);font-weight:500;line-height:1.25;letter-spacing:.02em;text-wrap:balance;margin:.2em 0 .6em}
h2{font-size:24px;font-weight:500;margin:2.2em 0 .7em;padding-top:.8em;border-top:1px solid var(--line)}
h3{font-size:18px;font-weight:500;margin:1.8em 0 .5em}
p,li{color:#d6dbe5}strong{color:var(--ink);font-weight:500}
table{border-collapse:collapse;display:block;overflow-x:auto;margin:14px 0;font-size:14px}
th,td{border-bottom:1px solid var(--line);padding:9px 12px;text-align:left;vertical-align:top}th{color:var(--dim);font-weight:400;white-space:nowrap}
blockquote{margin:16px 0;padding:4px 18px;border-left:2px solid var(--acc);color:var(--dim)}
code{font-family:var(--mono);background:var(--panel);padding:1px 5px;border-radius:4px;font-size:.88em}
pre{background:var(--panel);border:1px solid var(--line);padding:14px;border-radius:10px;overflow:auto}pre code{background:none;padding:0}
pre.mermaid{background:var(--bg);text-align:center}
hr{border:0;border-top:1px solid var(--line);margin:32px 0}
.eyebrow{font-family:var(--en);font-weight:500;letter-spacing:.28em;font-size:12px;color:var(--dim);text-transform:uppercase}
.hero h1{font-size:clamp(40px,6vw,72px);margin:.15em 0 .25em}.hero h1 .en{font-family:var(--en);font-weight:400;letter-spacing:.14em;color:var(--acc);display:block;font-size:.62em}
.lede{font-size:18px;max-width:62ch;color:#d6dbe5}
.pillars{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);margin-top:36px}
.pillars div{padding:20px 24px 6px 0}.pillars .n{font-family:var(--en);font-weight:300;font-size:44px;line-height:1;color:var(--acc)}.pillars .k{display:block;font-size:20px;font-weight:500;margin:8px 0 4px}.pillars p{margin:0;color:var(--dim);font-size:14px}
.stages{display:grid;grid-template-columns:repeat(5,1fr);border-top:1px solid var(--line);margin-top:28px}
.stages div{padding:14px 14px 0 0;font-size:13px;color:var(--dim)}.stages b{display:block;font-family:var(--en);font-weight:400;font-size:28px;letter-spacing:.08em;color:var(--ink)}
.live{border:1px solid #1b1f29;border-radius:14px;overflow-x:auto;margin:18px 0 6px}.live svg{display:block;width:100%;height:auto;min-width:900px}
.entries{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid var(--line);margin-top:36px}
.entries a{display:block;padding:18px 20px 18px 0;text-decoration:none;color:var(--ink)}.entries a span{display:block;color:var(--dim);font-size:13px}
.cap{color:var(--dim);font-size:13px}
footer{color:var(--dim);font-size:12px;margin-top:56px;padding-top:18px;border-top:1px solid var(--line)}
@media (max-width:860px){.pillars,.stages,.entries{grid-template-columns:1fr}}
:focus-visible{outline:2px solid var(--acc);outline-offset:3px}`;
writeFileSync(`${OUT}/style.css`, css);
copyFileSync("node_modules/mermaid/dist/mermaid.min.js", `${OUT}/mermaid.min.js`);
copyFileSync("web/diagram.js", `${OUT}/diagram.js`);
writeFileSync(`${OUT}/layouts.js`, `window.LAYOUTS=${JSON.stringify(LAYOUTS)};`);

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const MERMAID_INIT = `mermaid.initialize({startOnLoad:true,securityLevel:"strict",theme:"base",themeVariables:{darkMode:true,background:"#050608",primaryColor:"#0b0e15",primaryTextColor:"#f2f4f8",primaryBorderColor:"#3a3f4b",secondaryColor:"#0b0e15",tertiaryColor:"#0a0c11",lineColor:"#e8e2d4",textColor:"#f2f4f8",clusterBkg:"#0a0c11",clusterBorder:"#2a2f3a",edgeLabelBackground:"#050608",fontFamily:"Noto Sans SC, PingFang SC, sans-serif"}});`;
const LIVE_INIT = `<script src="layouts.js"></script><script src="diagram.js"></script><script>(()=>{const hs=[...document.querySelectorAll("[data-live]")].map(el=>renderDiagram(el,LAYOUTS[el.dataset.live],{hideHeader:el.hasAttribute("data-noheader")}));const rm=matchMedia("(prefers-reduced-motion: reduce)").matches;const loop=t=>{hs.forEach(h=>h.tick(rm?1500:t));if(!rm)requestAnimationFrame(loop)};requestAnimationFrame(loop)})();</script>`;
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500&family=Noto+Sans+SC:wght@400;500&family=JetBrains+Mono&display=swap" rel="stylesheet">`;

const page = (file, title, body, { mermaid = false, live = false } = {}) => `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · Open Signal</title>${FONTS}<link rel="stylesheet" href="style.css"></head><body>
<header class="top"><div class="in"><b>OPEN SIGNAL</b>${NAV.map(([h, t]) => `<a href="${h}"${h === file ? ' class="on"' : ""}>${t}</a>`).join("")}<a href="${GH}">GitHub</a></div></header>
<main>${body}<footer>独立蜂窝 AI 眼镜 · 由公开仓库生成 · 型号均为候选，数值为设计目标，未经实测</footer></main>
${mermaid ? `<script src="mermaid.min.js"></script><script>${MERMAID_INIT}</script>` : ""}${live ? LIVE_INIT : ""}</body></html>`;

const render = (md, fromRoot, { liveMermaid = false } = {}) => {
  let mer = false, liveCount = 0;
  const r = new marked.Renderer();
  r.code = ({ text, lang }) => {
    if (lang === "mermaid") {
      if (liveMermaid && liveCount < ORDER.length) return `<div class="live" data-live="${ORDER[liveCount++]}"></div>`;
      mer = true;
      return `<pre class="mermaid">${esc(text)}</pre>`;
    }
    return `<pre><code>${esc(text)}</code></pre>`;
  };
  r.heading = function ({ tokens, depth, text }) {
    return `<h${depth} id="${slug(text)}">${this.parser.parseInline(tokens)}</h${depth}>`;
  };
  r.link = function ({ href, title, tokens }) {
    const inner = this.parser.parseInline(tokens);
    return `<a href="${esc(rewrite(href, fromRoot))}"${title ? ` title="${esc(title)}"` : ""}>${inner}</a>`;
  };
  return { html: marked.parse(md, { renderer: r, gfm: true }), mer, live: liveCount > 0 };
};

for (const f of docs) {
  const md = readFileSync(`${REPO}/docs/${f}`, "utf8");
  const out = f.replace(/\.md$/, ".html");
  const { html, mer, live } = render(md, false, { liveMermaid: f === "system-architecture.md" });
  writeFileSync(`${OUT}/${out}`, page(out, titleOf(md), html, { mermaid: mer, live }));
}

// 首页
const hero = `<section class="hero">
  <div class="eyebrow">Independent Cellular AI Glasses</div>
  <h1><span class="en">OPEN SIGNAL</span>开放的信号，永远在流动</h1>
  <p class="lede">一副靠网络工作的眼镜，不依赖手机。眼镜和云端 LLM 是脑，眼镜自身算力是小脑，电脑、手机、车机和云主机都是手，蜂窝、Wi-Fi、蓝牙和 USB-C 是脚：你说一句话，脑靠脚走到一只手那里，手渲染好的看板就出现在眼前。断网时，它是一块表；摘下就睡，戴上一秒醒来。</p>
  <div class="pillars">
    <div><span class="n">01</span><span class="k">快科技</span><p>信号先于目光抵达。转头的一瞬，画面已经在那里。</p></div>
    <div><span class="n">02</span><span class="k">潮流</span><p>轻得像一副寻常的眼镜，亮得像一块随身的屏幕。</p></div>
    <div><span class="n">03</span><span class="k">开源</span><p>每一行协议都向所有人敞开。可以用官方的云，也可以亲手搭一朵自己的。</p></div>
  </div>
  <div class="stages">
    <div><b>M0</b>现成硬件验证 · 进行中</div><div><b>M1</b>桌面功能样机</div><div><b>M2</b>完全版样机</div><div><b>M3</b>优化样机</div><div><b>Gen 2</b>第二代</div>
  </div>
</section>
<div class="live" data-live="HardwareCompute"></div>
<p class="cap">眼镜硬件：显示、计算与连接。光带是一路信号，线型代表信号类型。<a href="architecture-motion.html">看全部 10 张架构图</a></p>
<div class="entries">
  ${hasFilm ? `<a href="film.html">视频<span>宣传片「她的进化」· 技术全解 24 章</span></a>` : ""}
  ${hasHW ? `<a href="hardware.html">硬件 · 初版原理图与 PCB<span>three.js 三维查看 · KiCad 工程下载</span></a>` : ""}
  <a href="technical-roadmap.html">技术路线<span>小脑与脚的四颗芯片、MCU A/B 案、M0–M3</span></a>
  <a href="design-requirements.html">设计开发要求<span>194 条可验收要求</span></a>
  <a href="streaming-direction.html">方案<span>串流终端方向 v0.7.6</span></a>
  <a href="validation-plan.html">验证计划<span>6 组现成硬件验证</span></a>
  <a href="sources.html">来源<span>58 条公开资料</span></a>
</div>`;
const readme = readFileSync(`${REPO}/README.md`, "utf8").replace(/^#\s+.+\n/, "");
const { html: readmeHtml } = render(readme, true);
writeFileSync(`${OUT}/index.html`, page("index.html", "独立蜂窝 AI 眼镜", hero + `<h2>仓库说明</h2>` + readmeHtml, { live: true }));
copyFileSync("dist/system-architecture-motion.html", `${OUT}/architecture-motion.html`);
if (hasFilm) {
  copyFileSync("dist/plan-film.mp4", `${OUT}/plan-film.mp4`);
  // 带内容哈希，换片后不被 CDN 旧缓存挡住
  const FILM = `plan-film.mp4?v=${createHash("sha1").update(readFileSync("dist/plan-film.mp4")).digest("hex").slice(0, 8)}`;
  const body = `<div class="eyebrow">Open Signal · Film</div><h1>全流程宣传片</h1><p class="lede">以眼镜 Agent “她”的第一人称讲述：从戴在脸上的手表，进化到有脑、有手、有脚。与传统 AI 眼镜对比看、做、连、手四件事，演示 Agent 替你操作手机、手渲染再投到眼前、六种显示模式和一天的使用。配乐为代码合成的原创音乐。</p>
<video src="${FILM}" controls playsinline preload="metadata" style="width:100%;border-radius:14px;border:1px solid #1b1f29;background:#000"></video>
<p class="cap"><a href="${FILM}" download>下载 MP4</a> · 型号均为候选，数值为设计目标</p>`;
  let tech = "";
  if (hasTech) {
    copyFileSync("dist/tech-film.mp4", `${OUT}/tech-film.mp4`);
    const TECH = `tech-film.mp4?v=${createHash("sha1").update(readFileSync("dist/tech-film.mp4")).digest("hex").slice(0, 8)}`;
    tech = `<h2 id="tech">技术全解（约 8 分 30 秒）</h2><p class="lede">24 章把设计、架构、链路、功耗、协议、验证与路线讲透，每章标出讲的是哪个角色：脑 / 小脑 / 手 / 脚、四颗主芯片与 MCU A/B 案、光波导、五种连接与网络指标、显示通路与延迟预算、软件栈与开放协议、兼容分层、六种显示模式、手机 Agent、通话与虚拟形象、功耗状态与 8 小时预算、重量、云、六道闸门、路线与风险。左侧为动态架构图或示意，右侧逐条要点。</p>
<video src="${TECH}" controls playsinline preload="metadata" style="width:100%;border-radius:14px;border:1px solid #1b1f29;background:#000"></video>
<p class="cap"><a href="${TECH}" download>下载 MP4</a> · 数字均取自方案文档，方案数值为设计目标，未实测</p>`;
  }
  writeFileSync(`${OUT}/film.html`, page("film.html", "视频", body + tech));
}
if (hasHW) {
  // 硬件初版：three.js 查看页（站点为扁平目录，依赖文件改名平铺）
  const V = `${HW}/viewer`, T = `${V}/vendor/three`;
  copyFileSync(`${T}/build/three.module.js`, `${OUT}/three.module.js`);
  copyFileSync(`${T}/build/three.core.js`, `${OUT}/three.core.js`);
  copyFileSync(`${T}/examples/jsm/controls/OrbitControls.js`, `${OUT}/OrbitControls.js`);
  copyFileSync(`${T}/examples/jsm/controls/MapControls.js`, `${OUT}/MapControls.js`);
  copyFileSync(`${T}/examples/jsm/utils/BufferGeometryUtils.js`, `${OUT}/BufferGeometryUtils.js`);
  writeFileSync(`${OUT}/GLTFLoader.js`, readFileSync(`${T}/examples/jsm/loaders/GLTFLoader.js`, "utf8").replace("../utils/BufferGeometryUtils.js", "./BufferGeometryUtils.js"));
  if (existsSync(`${T}/LICENSE`)) copyFileSync(`${T}/LICENSE`, `${OUT}/three-LICENSE.txt`);
  for (const f of readdirSync(`${V}/data`)) copyFileSync(`${V}/data/${f}`, `${OUT}/hw-${f}`);
  copyFileSync(`${V}/app.js`, `${OUT}/hw-app.js`);
  const dl = [];
  for (const [src, name, label] of [
    [`${HW}/exports/mcu_board/mcu_board-schematic.pdf`, "hw-mcu_board-schematic.pdf", "MCU 板原理图 PDF"],
    [`${HW}/exports/main_board/main_board-schematic.pdf`, "hw-main_board-schematic.pdf", "主板原理图 PDF"],
    [`${HW}/exports/kicad-projects-v0.1.zip`, "hw-kicad-projects-v0.1.zip", "KiCad 工程"],
  ]) if (existsSync(src)) { copyFileSync(src, `${OUT}/${name}`); dl.push(`<a href="${name}" download>${label}</a>`); }
  let html = readFileSync(`${V}/index.html`, "utf8")
    .replace(/<script type="importmap">[\s\S]*?<\/script>/, `<script type="importmap">{ "imports": { "three": "./three.module.js", "three/addons/controls/": "./", "three/addons/loaders/": "./" } }</script>`)
    .replace('<script type="module" src="./app.js"></script>', `<script>window.HW_DATA = "./hw-";</script><script type="module" src="./hw-app.js"></script>`)
    .replace("</header>", `</header><div class="dl"><a href="index.html">← 返回网站</a>${dl.join("")}</div>`)
    .replace("</style>", `  .dl { position:fixed; top:58px; right:14px; width:330px; display:flex; gap:14px; flex-wrap:wrap; font-size:12px; z-index:6; } .dl a { color:#8f96a3; text-decoration:none; } .dl a:hover { color:#eceae4; } aside { top:88px !important; } header { padding-right:360px !important; } header nav { flex-wrap:wrap; }\n</style>`);
  writeFileSync(`${OUT}/hardware.html`, html);
}
console.log(readdirSync(OUT).join(" "));
