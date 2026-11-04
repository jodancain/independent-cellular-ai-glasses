# 系统架构图 · 动态版（Remotion）

把 [系统架构图](../../docs/system-architecture.md) 的 9 张图做成信号流动动画。连线上的流动虚线和光点表示信号方向，颜色表示信号类型（视频、数据、控制、姿态、音频、无线、供电）。每张图 6 秒循环一周，首尾无缝衔接。

- 成品：`dist/system-architecture-motion.html`，单文件，脚本全部内联，下载后用浏览器直接打开，不需要联网。
- 图的数据：`src/diagrams/index.ts`，改节点和连线后重新构建即可，排版由 dagre 自动完成。
- 动画组件：`src/diagram/FlowDiagram.tsx`，全部动画由 `useCurrentFrame()` 驱动，不使用 CSS 动画。

```bash
npm install
npm run dev                      # Remotion Studio 预览
node scripts/build-html.mjs      # 重新生成单文件 HTML
npx remotion render Overview out/overview.mp4   # 可选：导出某张图的视频
```

> Remotion 的许可：个人和 3 人以内团队免费，公司使用需购买 Remotion 公司许可，详见 <https://www.remotion.dev/license>。
