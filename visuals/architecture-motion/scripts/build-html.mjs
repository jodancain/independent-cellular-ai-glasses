// 把播放器打包成一个可直接双击打开的单文件 HTML（定稿样式：暗场、暖白）
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";

const r = await build({
  entryPoints: ["player/main.tsx"],
  bundle: true,
  minify: true,
  format: "iife",
  write: false,
  jsx: "automatic",
  loader: { ".json": "json" },
  define: { "process.env.NODE_ENV": '"production"' },
  target: "es2020",
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = `
*{box-sizing:border-box}html,body{margin:0;background:#050608;color:#f2f4f8;font-family:"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif}
.wrap{max-width:1680px;margin:0 auto;padding:28px 28px 40px}
.eyebrow{font-family:Barlow,sans-serif;font-weight:500;letter-spacing:.28em;font-size:12px;color:#8f9bb3}
h1{font-size:34px;font-weight:500;margin:8px 0 6px;letter-spacing:.03em}
header p{margin:0 0 18px;color:#8f9bb3;font-size:14px}
nav{display:flex;flex-wrap:wrap;gap:4px 22px;margin-bottom:18px;border-bottom:1px solid rgba(242,244,248,.12)}
nav button{background:none;color:#8f9bb3;border:0;border-bottom:2px solid transparent;padding:8px 0 10px;font:inherit;font-size:14px;cursor:pointer}
nav button.on{color:#f2f4f8;border-bottom-color:#e8e2d4}
nav button:focus-visible{outline:2px solid #e8e2d4;outline-offset:3px}
.stage{width:100%;margin:0 auto;border:1px solid #1b1f29;border-radius:14px;overflow:hidden}
`;
const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500&family=Noto+Sans+SC:wght@400;500&family=JetBrains+Mono&display=swap" rel="stylesheet">`;
mkdirSync("dist", { recursive: true });
writeFileSync(
  "dist/system-architecture-motion.html",
  `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>系统架构图 · Open Signal</title>${fonts}<style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`,
);
console.log("dist/system-architecture-motion.html", Math.round(js.length / 1024), "KB");
