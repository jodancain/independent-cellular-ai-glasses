// 定稿框图渲染器（网页用）：暗场、暖白单色信号、线型区分类型、直角走线、慢速光束、到达闪光。
// 用法：renderDiagram(hostElement, layoutJson) → 返回 { tick(t) }；由调用方用 requestAnimationFrame 驱动。
(function (global) {
  const NS = "http://www.w3.org/2000/svg";
  const SIGNAL = "#e8e2d4";
  const T = {
    grid: "rgba(242,244,248,.07)", groupFill: "rgba(242,244,248,.02)", groupStroke: "rgba(242,244,248,.1)",
    nodeFill: "#0b0e15", nodeStroke: "rgba(242,244,248,.18)", accentFill: "#12141a", accent: SIGNAL,
    text: "#f2f4f8", sub: "#9aa6bd", base: .6, knock: "#050608",
  };
  const KIND_NAME = { video: "视频 / 画面", data: "数据", control: "控制 / 信令", pose: "姿态 / 传感", audio: "音频", rf: "无线 / 网络", power: "供电 / 电源" };
  const DASH = { pose: "10 6", audio: "1.5 7", rf: "14 5 2 5", control: "6 4", power: "3 5" };
  const WIDTH = { video: 4, data: 2.2 };
  const CYCLE = 4000, TRAVEL = 2800;
  const PHASE = { video: 0, pose: .25, data: .5, rf: .5, audio: .75, control: .25, power: .75 };
  const ease = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const cjk = (ch) => /[⺀-￿]/.test(ch);
  const textW = (s, size) => [...s].reduce((w, ch) => w + (cjk(ch) ? size * 1.02 : size * 0.6), 0);
  const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const roundPath = (pts, r = 8) => {
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1];
      const r1 = Math.min(r, Math.hypot(b.x - a.x, b.y - a.y) / 2, Math.hypot(c.x - b.x, c.y - b.y) / 2);
      const ux = Math.sign(b.x - a.x), uy = Math.sign(b.y - a.y), vx = Math.sign(c.x - b.x), vy = Math.sign(c.y - b.y);
      d += ` L ${b.x - ux * r1} ${b.y - uy * r1} Q ${b.x} ${b.y} ${b.x + vx * r1} ${b.y + vy * r1}`;
    }
    const z = pts[pts.length - 1];
    return d + ` L ${z.x} ${z.y}`;
  };
  let uid = 0;

  function renderDiagram(host, D, opts = {}) {
    const id = `dg${++uid}`;
    const pad = 40, top = opts.hideHeader ? 24 : 84;
    const W = Math.ceil(D.width + pad * 2), H = Math.ceil(D.height + pad + top);
    const svg = mk("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": D.title || "框图" });
    const defs = mk("defs", {}, svg);
    const pat = mk("pattern", { id: `grid-${id}`, width: 16, height: 16, patternUnits: "userSpaceOnUse" }, defs);
    mk("circle", { cx: 1, cy: 1, r: .8, fill: T.grid }, pat);
    const m = mk("marker", { id: `ar-${id}`, viewBox: "0 0 8 8", refX: 7, refY: 4, markerWidth: 4.2, markerHeight: 4.2, orient: "auto-start-reverse" }, defs);
    mk("path", { d: "M0 .5 L7.5 4 L0 7.5 z", fill: SIGNAL }, m);
    const blur = mk("filter", { id: `bm-${id}`, x: "-10%", y: "-10%", width: "120%", height: "120%", filterUnits: "userSpaceOnUse" }, defs);
    mk("feGaussianBlur", { stdDeviation: 4 }, blur);
    mk("rect", { width: W, height: H, fill: `url(#grid-${id})` }, svg);

    if (!opts.hideHeader) {
      const tt = mk("text", { x: pad, y: 50, fill: T.text, "font-size": 22, "font-weight": 500, "letter-spacing": "2", "font-family": "Barlow, Noto Sans SC, sans-serif" }, svg);
      tt.textContent = D.title || "";
      const used = [...new Set(D.edges.map((e) => e.kind))];
      let lx = W - pad;
      [...used].reverse().forEach((k) => {
        const label = KIND_NAME[k] || k;
        lx -= textW(label, 16) + 44 + 14;
        mk("line", { x1: lx - 6, y1: 44, x2: lx + 26, y2: 44, stroke: SIGNAL, "stroke-width": WIDTH[k] || 3, "stroke-linecap": "round", ...(DASH[k] ? { "stroke-dasharray": DASH[k] } : {}) }, svg);
        const t = mk("text", { x: lx + 32, y: 50, fill: T.sub, "font-size": 16, "font-family": "Noto Sans SC, sans-serif" }, svg);
        t.textContent = label;
      });
    }
    const g = mk("g", { transform: `translate(${pad} ${top})` }, svg);
    const gl = mk("g", {}, g), el = mk("g", {}, g), dl = mk("g", {}, g), nl = mk("g", {}, g), ll = mk("g", {}, g);
    (D.groups || []).forEach((gr, i) => {
      mk("rect", { x: gr.x, y: gr.y, width: gr.w, height: gr.h, rx: 12, fill: T.groupFill, stroke: T.groupStroke }, gl);
      const n = mk("text", { x: gr.x + 18, y: gr.y + 30, fill: T.sub, "font-size": 15, "letter-spacing": "1.5", "font-family": "Barlow, sans-serif", "font-weight": 500 }, gl);
      n.textContent = String(i + 1).padStart(2, "0");
      const t = mk("text", { x: gr.x + 48, y: gr.y + 30, fill: T.sub, "font-size": 16, "letter-spacing": "1", "font-family": "Noto Sans SC, sans-serif" }, gl);
      t.textContent = gr.label;
    });
    const edges = D.edges.map((e) => {
      (e.knock || []).forEach(([x1, y1, x2, y2]) => mk("line", { x1, y1, x2, y2, stroke: T.knock, "stroke-width": 10 }, el));
      const d = roundPath(e.pts);
      const p = mk("path", {
        d, fill: "none", stroke: SIGNAL, "stroke-opacity": e.dashed ? .5 : T.base, "stroke-width": WIDTH[e.kind] || 3,
        "stroke-linejoin": "round", "stroke-linecap": "round", "marker-end": `url(#ar-${id})`, ...(e.bidir ? { "marker-start": `url(#ar-${id})` } : {}),
        ...(e.dashed ? { "stroke-dasharray": "6 7" } : DASH[e.kind] ? { "stroke-dasharray": DASH[e.kind] } : {}),
      }, el);
      const len = p.getTotalLength();
      const beam = e.dashed ? null : {
        glow: mk("path", { d, fill: "none", stroke: SIGNAL, "stroke-width": 12, "stroke-linecap": "round", opacity: 0, filter: `url(#bm-${id})` }, dl),
        body: mk("path", { d, fill: "none", stroke: SIGNAL, "stroke-width": 5, "stroke-linecap": "round", opacity: 0 }, dl),
        core: mk("path", { d, fill: "none", stroke: "#ffffff", "stroke-width": 2.4, "stroke-linecap": "round", opacity: 0 }, dl),
      };
      if (e.label) {
        const lines = e.label.split("\n");
        const lw = Math.max(...lines.map((l) => [...l].reduce((w, ch) => w + (cjk(ch) ? 15.5 : 9.2), 0))) + 16;
        const lh = lines.length * 20 + 6;
        mk("rect", { x: e.lx - lw / 2, y: e.ly - lh / 2, width: lw, height: lh, rx: 5, fill: T.knock }, ll);
        lines.forEach((l, j) => {
          const t = mk("text", { x: e.lx, y: e.ly - lh / 2 + 18 + j * 20, fill: SIGNAL, "font-size": 15, "text-anchor": "middle", "font-family": "JetBrains Mono, Menlo, monospace" }, ll);
          t.textContent = l;
        });
      }
      return { len, beam, bidir: !!e.bidir, phase: PHASE[e.kind] || 0, to: e.to, from: e.from };
    });
    const rects = {};
    D.nodes.forEach((n) => {
      const r = (rects[n.id] = mk("rect", { x: n.x, y: n.y, width: n.w, height: n.h, rx: 8, fill: n.accent ? T.accentFill : T.nodeFill, stroke: n.accent ? T.accent : T.nodeStroke, "stroke-width": n.accent ? 1.4 : 1, ...(n.reserved ? { "stroke-dasharray": "4 4", opacity: .6 } : {}) }, nl));
      if (n.accent) mk("rect", { x: n.x + 12, y: n.y, width: 30, height: 2, fill: T.accent }, nl);
      (n.lines || []).forEach((txt, i) => {
        const t = mk("text", { x: n.x + 20, y: n.y + 34 + i * 24 + (i ? 3 : 0), fill: i ? T.sub : T.text, "font-size": i ? 16 : 21, "font-weight": i ? 400 : 500, "font-family": "Noto Sans SC, PingFang SC, sans-serif" }, nl);
        t.textContent = txt;
      });
      void r;
    });
    host.appendChild(svg);
    const flash = {};
    return {
      svg,
      tick(t) {
        edges.forEach((E) => {
          if (!E.beam) return;
          const local = (t + E.phase * CYCLE) % CYCLE;
          const run = local / TRAVEL;
          const L = E.len, bl = Math.min(240, Math.max(80, L * .45));
          const back = E.bidir && Math.floor((t + E.phase * CYCLE) / CYCLE) % 2 === 1;
          const head = ease(Math.min(1, run)) * (L + bl);
          [["glow", bl, .55], ["body", bl * .8, .85], ["core", bl * .4, .95]].forEach(([k, seg, op]) => {
            const pth = E.beam[k];
            const start = back ? L - head : head - seg;
            pth.setAttribute("stroke-dasharray", `${seg} ${L * 4 + seg}`);
            pth.setAttribute("stroke-dashoffset", -start);
            pth.setAttribute("opacity", run <= 1 ? op : 0);
          });
          if (run >= .98 && run < 1.03) flash[back ? E.from : E.to] = t;
        });
        Object.entries(rects).forEach(([nid, r]) => {
          const ft = flash[nid];
          const dt = ft ? t - ft : 1e9;
          const k = dt < 300 ? Math.max(0, dt) / 300 : Math.exp(-(dt - 300) / 650);
          r.style.filter = k > .02 ? `drop-shadow(0 0 ${(10 * k).toFixed(1)}px rgba(232,226,212,${(.8 * k).toFixed(2)}))` : "none";
        });
      },
    };
  }
  global.renderDiagram = renderDiagram;
})(window);
