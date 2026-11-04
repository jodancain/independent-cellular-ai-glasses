// 生成可公网发布的静态站：仓库文档转网页 + 动态架构图。
// 输出 dist-site/（扁平目录、不含子目录，避免出现目录列表）。
import { marked } from "marked";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";

const REPO = "../..";
const OUT = "dist-site";
const GH = "https://github.com/jodancain/independent-cellular-ai-glasses/blob/main";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);

const docs = readdirSync(`${REPO}/docs`).filter((f) => f.endsWith(".md"));
const titleOf = (md) => (md.match(/^#\s+(.+)$/m)?.[1] ?? "文档").trim();
const NAV = [
  ["index.html", "首页"],
  ["architecture-motion.html", "动态架构图"],
  ["system-architecture.html", "架构图"],
  ["technical-roadmap.html", "技术路线"],
  ["design-requirements.html", "设计开发要求"],
  ["streaming-direction.html", "方案"],
  ["validation-plan.html", "验证计划"],
  ["sources.html", "来源"],
];

// 与 GitHub 一致的标题锚点：小写、去标点、空格转连字符
const slug = (t) =>
  t.toLowerCase().trim().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-");

// 把仓库内链接改成站内页面；站内没有的（tools/、CONTRIBUTING 等）指向 GitHub
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
  return `${GH}/${repoPath}${h}`;
};

const css = `*{box-sizing:border-box}body{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#1f2937;background:#f1f5f9;line-height:1.7}
header{position:sticky;top:0;z-index:5;background:#0b1222;color:#e2e8f0;padding:10px 20px;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center}
header b{margin-right:10px}header a{color:#93c5fd;text-decoration:none;font-size:14px}header a.on{color:#fff;border-bottom:2px solid #38bdf8}
main{max-width:1100px;margin:0 auto;padding:24px 24px 80px;background:#fff;min-height:100vh}
h1{font-size:28px;line-height:1.3}h2{margin-top:2em;border-bottom:1px solid #e5e7eb;padding-bottom:4px}h3{margin-top:1.6em}
table{border-collapse:collapse;display:block;overflow-x:auto;margin:12px 0;font-size:14px}th,td{border:1px solid #d1d5db;padding:6px 10px;vertical-align:top}th{background:#f1f5f9}
blockquote{margin:12px 0;padding:6px 16px;border-left:4px solid #38bdf8;background:#f0f9ff;color:#334155}
code{background:#f1f5f9;padding:1px 4px;border-radius:4px;font-size:.92em}pre{background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;overflow:auto}pre code{background:none;color:inherit}
pre.mermaid{background:#fff;color:#111;border:1px solid #e5e7eb;text-align:center}a{color:#0369a1}
footer{color:#94a3b8;font-size:12px;margin-top:40px}`;
writeFileSync(`${OUT}/style.css`, css);
copyFileSync("node_modules/mermaid/dist/mermaid.min.js", `${OUT}/mermaid.min.js`);

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

const page = (file, title, body, hasMermaid) => `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · 独立蜂窝 AI 眼镜</title><link rel="stylesheet" href="style.css"></head><body>
<header><b>独立蜂窝 AI 眼镜</b>${NAV.map(([h, t]) => `<a href="${h}"${h === file ? ' class="on"' : ""}>${t}</a>`).join("")}<a href="https://github.com/jodancain/independent-cellular-ai-glasses">GitHub</a></header>
<main>${body}<footer>由公开仓库自动生成 · 型号均为候选，数值为设计目标，未经实测</footer></main>
${hasMermaid ? `<script src="mermaid.min.js"></script><script>mermaid.initialize({startOnLoad:true,securityLevel:"strict"});</script>` : ""}</body></html>`;

const render = (md, fromRoot) => {
  let mer = false;
  const r = new marked.Renderer();
  r.code = ({ text, lang }) => {
    if (lang === "mermaid") {
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
  return { html: marked.parse(md, { renderer: r, gfm: true }), mer };
};

for (const f of docs) {
  const md = readFileSync(`${REPO}/docs/${f}`, "utf8");
  const out = f.replace(/\.md$/, ".html");
  const { html, mer } = render(md, false);
  writeFileSync(`${OUT}/${out}`, page(out, titleOf(md), html, mer));
}
const readme = readFileSync(`${REPO}/README.md`, "utf8");
const intro = `<blockquote><b>动态架构图</b>：<a href="architecture-motion.html">9 张图的信号流动动画</a>，连线上的光点按信号方向流动。</blockquote>`;
const { html } = render(readme, true);
writeFileSync(`${OUT}/index.html`, page("index.html", titleOf(readme), intro + html, false));
copyFileSync("dist/system-architecture-motion.html", `${OUT}/architecture-motion.html`);
console.log(readdirSync(OUT).join(" "));
