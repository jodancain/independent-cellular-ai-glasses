# 动态架构图 · 网站 · 宣传片（Remotion）

定稿视觉：暗场黑底、暖白单色信号，西文和数字用 Barlow，中文用思源黑体。框图按芯片手册的画法：直角走线、功能分区、标签压线。信号类型靠线型区分：视频粗实线、数据细实线、姿态长虚线、音频点线、无线点划线。每条线上的光带就是一路信号，每 4 秒一轮；光带到达后，目标芯片的框会亮一下。

| 产物 | 生成方式 |
| --- | --- |
| `dist/system-architecture-motion.html` | 10 张图的 Remotion 播放页，单文件，可直接打开：`node scripts/build-html.mjs` |
| `dist/plan-film.mp4` | 112 秒全流程宣传片，配乐由代码合成：`npx remotion render PlanFilm dist/plan-film.mp4` |
| `dist-site/` | 公网站点（文档转网页 + 实时框图）：`node scripts/build-site.mjs` |

## 数据与代码

- `src/diagrams/index.ts`：10 张图的节点和连线定义。
- `src/diagrams/hw-manual.json`：硬件框图的手工排版。
- `src/diagrams/layouts.json`：其余 9 张图的直角走线排版，由 ELK 生成：
  ```bash
  npx esbuild scripts/elk-all.ts --bundle --platform=node --outfile=/tmp/elk-all.cjs && node /tmp/elk-all.cjs
  ```
- `src/diagram/FlowDiagram.tsx`：Remotion 版框图，用于播放页和视频。
- `web/diagram.js`：网页版框图，用于网站首页和架构图页。两份代码用同一套样式。
- `src/film/`：宣传片的场景，配乐来自 `scripts/make_music.py`（只用 numpy 合成）。

```bash
npm install
npm run dev          # Remotion Studio 预览
```

> Remotion 的许可：个人和 3 人以内团队免费；公司使用需要购买 Remotion 公司许可，详见 <https://www.remotion.dev/license>。
