// 初版原理图与 PCB 的 three.js 展示：原理图为矢量线段（可无限缩放、可搜网络名），PCB 为 KiCad 导出的 GLB。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const DATA = window.HW_DATA || './data/';
const stage = document.getElementById('stage');
const info = document.getElementById('info');
const tools = document.getElementById('tools');
const hitsBox = document.getElementById('hits');
const loading = document.getElementById('loading');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
stage.appendChild(renderer.domElement);

const summary = await (await fetch(`${DATA}summary.json`)).json();
const cache = {};
let cur = null;

function size() { return { w: innerWidth, h: innerHeight }; }
const narrow = () => innerWidth <= 760;
addEventListener('resize', () => cur && cur.resize());

// ---------------- 原理图 ----------------
async function makeSch(board) {
  const meta = await (await fetch(`${DATA}${board}_sch.json`)).json();
  const buf = new Float32Array(await (await fetch(`${DATA}${board}_sch.bin`)).arrayBuffer());
  const [, , W, H] = meta.viewBox;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1a1d22');
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ color: '#f5f4ef' }));
  paper.position.set(W / 2, -H / 2, -1);
  scene.add(paper);
  for (const f of meta.fills) {
    const pts = [];
    for (let i = 0; i < f.count; i += 2) pts.push(new THREE.Vector2(buf[f.offset + i], -buf[f.offset + i + 1]));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts)), new THREE.MeshBasicMaterial({ color: f.color }));
    m.position.z = -0.5;
    scene.add(m);
  }
  for (const l of meta.layers) {
    const arr = new Float32Array((l.count / 2) * 3);
    for (let i = 0, j = 0; i < l.count; i += 2, j += 3) { arr[j] = buf[l.offset + i]; arr[j + 1] = -buf[l.offset + i + 1]; arr[j + 2] = 0; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: l.color })));
  }
  const marks = new THREE.Group();
  scene.add(marks);
  const { w, h } = size();
  const cam = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, -100, 100);
  const fit = () => {
    const { w, h } = size();
    const z = narrow() ? Math.min((w - 16) / W, (h * 0.5) / H) * 0.95 : Math.min((w - 380) / W, (h - 120) / H) * 0.95;
    const ox = narrow() ? 0 : 180 / z, oy = narrow() ? -(h * 0.12) / z : 0;
    cam.zoom = z; cam.position.set(W / 2 + ox, -H / 2 - oy, 10); ctr.target.set(W / 2 + ox, -H / 2 - oy, 0); cam.updateProjectionMatrix(); ctr.update();
  };
  const ctr = new MapControls(cam, renderer.domElement);
  ctr.enableRotate = false; ctr.screenSpacePanning = true; ctr.zoomToCursor = true; ctr.maxZoom = 400; ctr.minZoom = 0.05;
  ctr.enabled = false;
  const v = {
    scene, cam, ctr,
    resize() { const { w, h } = size(); cam.left = -w / 2; cam.right = w / 2; cam.top = h / 2; cam.bottom = -h / 2; cam.updateProjectionMatrix(); renderer.setSize(w, h); },
    fit,
    search(q) {
      marks.clear(); hitsBox.innerHTML = '';
      if (!q) { hitsBox.style.display = 'none'; return; }
      const ql = q.toLowerCase();
      const hits = meta.texts.filter(t => t[2].toLowerCase().includes(ql)).slice(0, 300);
      for (const t of hits) {
        const r = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.9, 32), new THREE.MeshBasicMaterial({ color: '#ff7a1a' }));
        r.position.set(t[0], -t[1], 1); marks.add(r);
        const d = document.createElement('div'); d.textContent = `${t[2]}  ·  (${t[0].toFixed(0)}, ${t[1].toFixed(0)})`;
        d.onclick = () => { cam.zoom = 14; ctr.target.set(t[0], -t[1], 0); cam.position.set(t[0], -t[1], 10); cam.updateProjectionMatrix(); ctr.update(); };
        hitsBox.appendChild(d);
      }
      hitsBox.style.display = hits.length ? 'block' : 'none';
      if (!hits.length) hitsBox.style.display = 'none';
    },
    tools() {
      tools.innerHTML = '';
      const inp = document.createElement('input'); inp.placeholder = '搜网络 / 位号，如 BLE_UART_TX、U1'; inp.oninput = () => v.search(inp.value.trim());
      const b1 = document.createElement('button'); b1.textContent = '全图'; b1.onclick = fit;
      const b2 = document.createElement('button'); b2.textContent = '放大到 1:1'; b2.onclick = () => { cam.zoom = 3.78; cam.updateProjectionMatrix(); };
      tools.append(inp, b1, b2);
      const tip = document.createElement('button'); tip.textContent = '滚轮缩放 · 拖动平移'; tip.disabled = true; tools.append(tip);
    },
  };
  fit();
  return v;
}

// ---------------- PCB 3D ----------------
const loader = new GLTFLoader();
function lights(scene) {
  scene.add(new THREE.HemisphereLight('#ffffff', '#2a2f38', 1.4));
  const d = new THREE.DirectionalLight('#ffffff', 2.4); d.position.set(2, 3, 4); scene.add(d);
  const d2 = new THREE.DirectionalLight('#ffffff', 1.0); d2.position.set(-3, -2, -4); scene.add(d2);
}
function loadGLB(url) { return new Promise((res, rej) => loader.load(url, g => res(g.scene), undefined, rej)); }

async function makePcb(board) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d1015');
  lights(scene);
  const obj = await loadGLB(`${DATA}${board}.glb`);
  const box = new THREE.Box3().setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  obj.position.sub(c);
  const pivot = new THREE.Group(); pivot.add(obj); scene.add(pivot);
  const R = Math.max(s.x, s.y, s.z);
  const grid = new THREE.GridHelper(R * 3, 30, '#2b3038', '#1c2027');
  // 让板面朝上：找最薄的轴
  const thin = s.x < s.y && s.x < s.z ? 'x' : s.y < s.z ? 'y' : 'z';
  if (thin === 'z') pivot.rotation.x = -Math.PI / 2;
  if (thin === 'x') pivot.rotation.z = Math.PI / 2;
  grid.position.y = -R * 0.08; scene.add(grid);
  const cam = new THREE.PerspectiveCamera(35, 1, R / 100, R * 50);
  const ctr = new OrbitControls(cam, renderer.domElement);
  ctr.enableDamping = true; ctr.enabled = false;
  const view = (dir) => { const d = R * (narrow() ? 3.4 : 1.9); cam.position.set(dir[0] * d, dir[1] * d, dir[2] * d); ctr.target.set(0, 0, 0); ctr.update(); };
  view([0.35, 0.8, 0.75]);
  return {
    scene, cam, ctr,
    resize() { const { w, h } = size(); cam.aspect = w / h; cam.setViewOffset(w, h, narrow() ? 0 : 175, narrow() ? h * 0.14 : 0, w, h); cam.updateProjectionMatrix(); renderer.setSize(w, h); },
    tick() { ctr.update(); },
    tools() {
      tools.innerHTML = '';
      for (const [t, d] of [['斜视', [0.35, 0.8, 0.75]], ['顶面', [0, 1, 0.001]], ['底面', [0, -1, 0.001]], ['侧面', [1, 0.05, 0]]]) {
        const b = document.createElement('button'); b.textContent = t; b.onclick = () => view(d); tools.append(b);
      }
      const tip = document.createElement('button'); tip.textContent = '左键旋转 · 右键平移 · 滚轮缩放'; tip.disabled = true; tools.append(tip);
    },
    mm: s, thin, obj,
  };
}

// ---------------- 装进眼镜 ----------------
function label(text, scale = 1) {
  const cv = document.createElement('canvas'); const ctx = cv.getContext('2d');
  ctx.font = '600 44px "PingFang SC","Noto Sans SC",sans-serif';
  const w = Math.ceil(ctx.measureText(text).width) + 40; cv.width = w; cv.height = 72;
  ctx.font = '600 44px "PingFang SC","Noto Sans SC",sans-serif';
  ctx.fillStyle = 'rgba(10,12,16,.82)'; ctx.fillRect(0, 0, w, 72); ctx.fillStyle = '#ece9e1'; ctx.fillText(text, 20, 50);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false }));
  sp.scale.set(w / 72 * 3.6 * scale, 3.6 * scale, 1); sp.renderOrder = 10;
  return sp;
}

async function makeGlasses() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d1015');
  lights(scene);
  // 用毫米作单位。眼镜：前框宽约 140，镜腿长约 145。
  const frameMat = new THREE.MeshStandardMaterial({ color: '#2a2d33', metalness: 0.3, roughness: 0.5 });
  const shellMat = new THREE.MeshStandardMaterial({ color: '#9aa3b2', transparent: true, opacity: 0.16, roughness: 0.2, depthWrite: false });
  const lensMat = new THREE.MeshPhysicalMaterial({ color: '#a8c4ff', transparent: true, opacity: 0.18, roughness: 0.05, transmission: 0.2 });
  const rimShape = (w, h, r) => { const s = new THREE.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return s; };
  for (const sx of [-1, 1]) {
    const outer = rimShape(54, 42, 14); outer.holes.push(rimShape(48, 36, 11));
    const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 4, bevelEnabled: false }), frameMat);
    rim.position.set(sx * 37, 0, 0); scene.add(rim);
    const lens = new THREE.Mesh(new THREE.ShapeGeometry(rimShape(48, 36, 11)), lensMat); lens.position.set(sx * 37, 0, 2); scene.add(lens);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(22, 4, 4), frameMat); bridge.position.set(0, 10, 2); scene.add(bridge);
  // 镜腿外壳（半透明），沿 -z 向后
  const templeLen = 150, templeH = 20, templeT = 7;
  for (const sx of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(templeT, templeH, templeLen), shellMat);
    t.position.set(sx * 67, 4, -templeLen / 2 + 2); scene.add(t);
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(templeT, 10, 8), frameMat); hinge.position.set(sx * 66, 4, 0); scene.add(hinge);
    // 耳后电池（示意）
    const bat = new THREE.Mesh(new THREE.BoxGeometry(5, 12, 34), new THREE.MeshStandardMaterial({ color: '#6b7a8f', roughness: 0.6 }));
    bat.position.set(sx * 67, 2, -125); scene.add(bat);
    const bl = label(sx > 0 ? '右侧电池' : '左侧电池', 0.8); bl.position.set(sx * 67 + sx * 14, 16, -125); scene.add(bl);
  }
  // 右镜腿：MCU 常驻板（真实 GLB）
  const mcu = await loadGLB(`${DATA}mcu_board.glb`);
  const box = new THREE.Box3().setFromObject(mcu); const s = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
  const k = 78 / Math.max(s.x, s.y, s.z); // GLB 单位换算成毫米（板长 78 mm）
  mcu.position.sub(c);
  const holder = new THREE.Group(); holder.add(mcu); holder.scale.setScalar(k);
  const thin = s.x < s.y && s.x < s.z ? 'x' : s.y < s.z ? 'y' : 'z';
  const long = s.x >= s.y && s.x >= s.z ? 'x' : s.y >= s.z ? 'y' : 'z';
  // 先把板面法线转到 x（镜腿厚度方向），再把板长转到 z（镜腿方向）
  const g1 = new THREE.Group(); g1.add(holder);
  if (thin === 'y') g1.rotation.z = Math.PI / 2; else if (thin === 'z') g1.rotation.y = Math.PI / 2;
  const g2 = new THREE.Group(); g2.add(g1);
  g2.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(g2); const s2 = b2.getSize(new THREE.Vector3());
  if (s2.y > s2.z) g2.rotation.x = Math.PI / 2;
  g2.position.set(67, 4, -18 - 39); scene.add(g2);
  const ml = label('MCU 常驻板（STM32N657 + nRF52832 + 麦克风）', 0.9); ml.position.set(67 + 30, 24, -57); scene.add(ml);
  // 左镜腿：主板位置（示意）
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(2, 16, 80), new THREE.MeshStandardMaterial({ color: '#e8c27a', transparent: true, opacity: 0.35 }));
  ghost.position.set(-67, 4, -55); scene.add(ghost);
  const gl = label('主板位置（主 SoC 等芯片级后放这里）', 0.9); gl.position.set(-67 - 32, 24, -55); scene.add(gl);
  // 前框：光机与光波导（示意）
  for (const sx of [-1, 1]) {
    const eng = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 10), new THREE.MeshStandardMaterial({ color: '#4b5563' })); eng.position.set(sx * 60, 12, -4); scene.add(eng);
  }
  const fl = label('光机 + 光波导（M1 定案）', 0.8); fl.position.set(0, 34, 0); scene.add(fl);
  // 桌面载板形态的主板放在旁边
  const main = await loadGLB(`${DATA}main_board.glb`);
  const mb = new THREE.Box3().setFromObject(main); const ms = mb.getSize(new THREE.Vector3()); main.position.sub(mb.getCenter(new THREE.Vector3()));
  const mh = new THREE.Group(); mh.add(main); mh.scale.setScalar(100 / Math.max(ms.x, ms.y, ms.z));
  const mthin = ms.x < ms.y && ms.x < ms.z ? 'x' : ms.y < ms.z ? 'y' : 'z';
  if (mthin === 'z') mh.rotation.x = -Math.PI / 2; if (mthin === 'x') mh.rotation.z = Math.PI / 2;
  mh.position.set(-210, -10, -60); scene.add(mh);
  const mbl = label('主板 · M1 桌面载板形态（100×70 mm）', 0.9); mbl.position.set(-210, 14, -60); scene.add(mbl);
  const cam = new THREE.PerspectiveCamera(35, 1, 1, 5000);
  const ctr = new OrbitControls(cam, renderer.domElement); ctr.enableDamping = true; ctr.enabled = false;
  const view = (p, t = [-75, -5, -60]) => { cam.position.set(...p); ctr.target.set(...t); ctr.update(); };
  view([250, 170, 150], [-60, -5, -70]);
  return {
    scene, cam, ctr,
    resize() { const { w, h } = size(); cam.aspect = w / h; cam.setViewOffset(w, h, narrow() ? 0 : 175, narrow() ? h * 0.14 : 0, w, h); cam.updateProjectionMatrix(); renderer.setSize(w, h); },
    tick() { ctr.update(); },
    tools() {
      tools.innerHTML = '';
      for (const [t, p, tg] of [['斜视', [250, 170, 150], [-60, -5, -70]], ['看右镜腿', [200, 25, -57], [67, 4, -57]], ['俯视', [-70, 420, -59], [-70, 0, -60]], ['正面', [0, 20, 320], [0, 0, 0]]]) {
        const b = document.createElement('button'); b.textContent = t; b.onclick = () => view(p, tg); tools.append(b);
      }
    },
  };
}

// ---------------- 信息面板 ----------------
function cnt(o) { return Object.entries(o).map(([k, v]) => `${k} ${v}`).join('，') || '无'; }
function panel(key) {
  info.classList.toggle('collapsed', narrow());
  if (key === 'glasses') {
    info.innerHTML = `<h2>装进眼镜</h2>
    <p>右镜腿放 MCU 常驻板（真实器件，可以按现状继续布线）；左镜腿是主板将来的位置。</p>
    <h3>脑、小脑、手、脚长在哪</h3>
    <ul><li><b>脑</b>：云端 LLM + 眼镜端意图入口（跑在主 SoC 与 MCU 唤醒词上），没有单独的芯片。</li>
    <li><b>小脑</b>：左镜腿主板的主 SoC 与显示处理器；右镜腿 MCU 是常醒的那部分小脑。</li>
    <li><b>脚</b>：左边 RedCap、Wi-Fi 7、USB-C；右边 nRF52832 的 BLE 常连。</li>
    <li><b>手</b>：不在眼镜上——手机、电脑、车机、云主机。</li>
    <li><b>器官</b>：前框的光波导 + 光机（视网膜）与摄像头（眼睛）；右镜腿的麦克风（嘴巴）与扬声器（耳朵）。</li></ul>
    <h3>为什么主板还不是镜腿形</h3>
    <ul><li>主 SoC（AR2 Gen 1）引脚与封装要和高通签 NDA 才拿得到，现在只能占位。</li>
    <li>RedCap 用的是模组（原型主选），尺寸放不进镜腿；路线图里芯片级设计在第二代。</li>
    <li>所以主板先按 M1 桌面载板画，接口和网络先定下来。</li></ul>
    <h3>示意部件</h3><ul><li>前框、镜腿外壳、电池、光机为示意几何体，尺寸未定。</li></ul>`;
    return;
  }
  const [mode, b] = key.split(':'); const S = summary[b];
  info.innerHTML = `<h2>${S.title}</h2>
  <div class="kv"><span>层数</span><b>${S.layers} 层</b><span>器件</span><b>${S.parts} 个</b><span>网络</span><b>${S.nets} 个</b><span>占位器件</span><b>${S.placeholders.length} 个</b></div>
  <h3>说明</h3><ul>${S.notes.map(n => `<li>${n}</li>`).join('')}</ul>
  <h3>检查结果</h3>
  <p>ERC：${cnt(S.erc)}</p>
  <p>DRC：${cnt(Object.fromEntries(Object.entries(S.drc).filter(([k]) => k !== 'unconnected_items')))}</p>
  <p class="warn">未布线焊盘 ${S.unconnected} 个（初版只做布局，未布线）</p>
  <h3>按角色（脑 · 小脑 · 手 · 脚 · 器官）</h3><ul>${Object.entries(S.roles).map(([r, ps]) => `<li><b>${r}</b>（${ps.length}）：${ps.filter(p => !/^[RCL]\d/.test(p.ref)).map(p => p.ref).join('、') || '阻容感'}${ps.some(p => /^[RCL]\d/.test(p.ref)) ? ' 等' : ''}</li>`).join('')}</ul>
  ${S.placeholders.length ? `<h3>占位器件（引脚待资料）</h3><ul>${S.placeholders.map(p => `<li><b>${p.ref}</b> ${p.value}</li>`).join('')}</ul>` : ''}
  <h3>主要器件</h3><ul>${S.ics.map(p => `<li><b>${p.ref}</b> ${p.value} <span class="tag">${p.role}</span>${p.note ? `<br><span style="color:#8f96a3">${p.note}</span>` : ''}</li>`).join('')}</ul>`;
}

// ---------------- 切换 ----------------
async function show(key) {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === key));
  hitsBox.style.display = 'none';
  loading.style.display = 'flex';
  if (cur) cur.ctr.enabled = false;
  if (!cache[key]) {
    const [mode, b] = key.split(':');
    cache[key] = mode === 'sch' ? await makeSch(b) : mode === 'pcb' ? await makePcb(b) : await makeGlasses();
  }
  cur = cache[key]; window.__cur = cur; cur.ctr.enabled = true; cur.resize(); cur.tools(); panel(key);
  loading.style.display = 'none';
}
document.querySelectorAll('#tabs button').forEach(b => (b.onclick = () => show(b.dataset.v)));
info.addEventListener('click', (e) => { if (narrow() && e.target.tagName === 'H2') info.classList.toggle('collapsed'); });
renderer.setAnimationLoop(() => { if (cur) { cur.tick && cur.tick(); renderer.render(cur.scene, cur.cam); } });
show(location.hash ? location.hash.slice(1) : 'sch:mcu_board');
window.__show = show;
window.__render = () => { cur.tick && cur.tick(); renderer.render(cur.scene, cur.cam); };
