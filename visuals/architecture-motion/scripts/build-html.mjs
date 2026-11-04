// 把播放器打包成一个可直接双击打开的单文件 HTML
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";

const r = await build({
  entryPoints: ["player/main.tsx"],
  bundle: true,
  minify: true,
  format: "iife",
  write: false,
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  target: "es2020",
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = `
*{box-sizing:border-box}html,body{margin:0;background:#070b16;color:#e2e8f0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
.wrap{max-width:1680px;margin:0 auto;padding:18px 22px}
h1{font-size:22px;margin:0 0 6px}header p{margin:0 0 12px;color:#94a3b8;font-size:13px}
nav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
nav button{background:#0f172a;color:#cbd5e1;border:1px solid #334155;border-radius:999px;padding:6px 14px;font-size:13px;cursor:pointer}
nav button.on{background:#0c2a40;color:#e0f2fe;border-color:#38bdf8;box-shadow:0 0 12px rgba(56,189,248,.35)}
.stage{width:100%;margin:0 auto;border:1px solid #1e293b;border-radius:14px;overflow:hidden}
`;
mkdirSync("dist", { recursive: true });
writeFileSync(
  "dist/system-architecture-motion.html",
  `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>系统架构图 · 动态初版 v0.1</title><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`,
);
console.log("dist/system-architecture-motion.html", Math.round(js.length / 1024), "KB");
