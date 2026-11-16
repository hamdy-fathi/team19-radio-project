/* Blueprint 3D viewer: original procedural geometry, plain WebGL, no libraries.
   Parts are drawn as hidden-line wireframes: an opaque fill in the paper colour
   first (so back edges disappear), then white edges on top.
   Units are millimetres. Y is up. */
(function () {
  'use strict';

  /* ---------- small vector / matrix helpers (column-major 4×4) ---------- */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const scl = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lerp = (a, b, t) => a + (b - a) * t;

  function perspective(fovy, aspect, n, f) {
    const t = 1 / Math.tan(fovy / 2);
    return [t / aspect, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0];
  }
  function lookAt(eye, center, up) {
    const z = norm(sub(eye, center));
    const x = norm(cross(up, z));
    const y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1];
  }
  function mul(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  }
  function project(m, p) {
    const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
    const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
    const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
    return { x: x / w, y: y / w, w: w };
  }

  /* ---------- geometry builder ---------- */
  function Geo() { this.tris = []; this.lines = []; }
  Geo.prototype.tri = function (a, b, c) { this.tris.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); };
  Geo.prototype.quad = function (a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); };
  Geo.prototype.line = function (a, b) { this.lines.push(a[0], a[1], a[2], b[0], b[1], b[2]); };
  Geo.prototype.poly = function (pts, closed) {
    for (let i = 0; i < pts.length - 1; i++) this.line(pts[i], pts[i + 1]);
    if (closed) this.line(pts[pts.length - 1], pts[0]);
  };

  function basis(axis) {
    const d = norm(axis);
    const ref = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = norm(cross(d, ref));
    const v = cross(d, u);
    return [u, v];
  }

  /* Cylinder between points a and b. */
  function cylinder(g, a, b, r, o) {
    o = o || {};
    const seg = o.seg || 24, sides = o.sides == null ? 8 : o.sides, rings = o.rings || [0, 1];
    const axis = sub(b, a);
    const uv = basis(axis);
    const ring = (t, rr) => {
      const c = add(a, scl(axis, t));
      const pts = [];
      for (let i = 0; i < seg; i++) {
        const an = (i / seg) * Math.PI * 2;
        pts.push(add(c, add(scl(uv[0], Math.cos(an) * rr), scl(uv[1], Math.sin(an) * rr))));
      }
      return pts;
    };
    const r0 = ring(0, r), r1 = ring(1, r);
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % seg;
      g.quad(r0[i], r0[j], r1[j], r1[i]);
      if (o.caps !== false) { g.tri(add(a, [0, 0, 0]), r0[j], r0[i]); g.tri(b, r1[i], r1[j]); }
    }
    rings.forEach((t) => g.poly(ring(t, r), true));
    for (let k = 0; k < sides; k++) {
      const i = Math.round((k / sides) * seg) % seg;
      g.line(r0[i], r1[i]);
    }
    if (o.inner) g.poly(ring(1, o.inner), true);
  }

  function box(g, c, s) {
    const h = scl(s, 0.5);
    const p = [];
    for (let i = 0; i < 8; i++) p.push([c[0] + (i & 1 ? h[0] : -h[0]), c[1] + (i & 2 ? h[1] : -h[1]), c[2] + (i & 4 ? h[2] : -h[2])]);
    const f = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
    f.forEach((q) => g.quad(p[q[0]], p[q[1]], p[q[2]], p[q[3]]));
    [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]].forEach((e) => g.line(p[e[0]], p[e[1]]));
  }

  function helix(g, r, y0, y1, turns, segPerTurn) {
    const n = Math.max(8, Math.round(turns * segPerTurn));
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const t = i / n, an = t * turns * Math.PI * 2;
      const p = [Math.cos(an) * r, lerp(y0, y1, t), Math.sin(an) * r];
      if (prev) g.line(prev, p);
      prev = p;
    }
  }

  /* A wire that sags/arches between two points. */
  function wire(g, a, b, lift) {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const p = add(a, scl(sub(b, a), t));
      p[1] += Math.sin(t * Math.PI) * lift;
      pts.push(p);
    }
    g.poly(pts);
  }

  function breadboard(g, c) {
    const W = 165, H = 9, D = 55;
    box(g, c, [W, H, D]);
    const top = c[1] + H / 2 + 0.05;
    const x0 = c[0] - W / 2 + 6, x1 = c[0] + W / 2 - 6;
    /* power rails and centre channel */
    [-D / 2 + 4, -D / 2 + 8, D / 2 - 8, D / 2 - 4].forEach((dz) => g.line([x0, top, c[2] + dz], [x1, top, c[2] + dz]));
    g.line([x0, top, c[2] - 1.5], [x1, top, c[2] - 1.5]);
    g.line([x0, top, c[2] + 1.5], [x1, top, c[2] + 1.5]);
    /* hole rows as short dashes */
    for (let x = x0; x <= x1; x += 2.54) {
      for (let k = 0; k < 5; k++) {
        const zA = c[2] - 4 - k * 2.54, zB = c[2] + 4 + k * 2.54;
        g.line([x, top, zA], [x + 0.9, top, zA]);
        g.line([x, top, zB], [x + 0.9, top, zB]);
      }
    }
  }

  /* ---------- scene definition ---------- */
  function buildScene(coil) {
    const R = coil.diameterMm / 2, parts = [];
    const P = (id, opts, fn) => { const g = new Geo(); fn(g); parts.push(Object.assign({ id: id, geo: g }, opts)); };
    const BB = [-150, 4.5, 20], BB2 = [150, 4.5, 30];
    const top = 9.05;

    P('pipe', { from: 0, center: [0, 45, 0], label: 'PVC former' }, (g) => {
      cylinder(g, [0, 0, 0], [0, 90, 0], R, { seg: 48, sides: 12, rings: [0, 1], caps: false, inner: R - 2 });
      cylinder(g, [0, 0, 0], [0, 90, 0], R - 2, { seg: 48, sides: 0, rings: [0], caps: false });
    });
    const coilY0 = 40, coilY1 = 40 + coil.windingMm;
    P('coil', { key: 'B', from: 0, center: [0, (coilY0 + coilY1) / 2, R], explode: [0, 50, 0] }, (g) => {
      /* chord midpoints sit at r·cos(π/20) ≈ 0.988 r, so keep the occluder well inside the wire */
      helix(g, R + 1.2, coilY0, coilY1, coil.turns, 20);
      cylinder(g, [0, coilY0, 0], [0, coilY1, 0], R + 0.2, { seg: 48, sides: 0, rings: [0, 1], caps: false });
    });
    P('bbA', { from: 1, center: BB, label: 'Tuner board' }, (g) => breadboard(g, BB));
    const capC = [-200, top + 9, 20];
    P('cap', { key: 'C', from: 1, center: capC, explode: [0, 45, 0] }, (g) => {
      box(g, capC, [26, 18, 26]);
      cylinder(g, [capC[0], capC[1] + 9, capC[2]], [capC[0], capC[1] + 17, capC[2]], 3, { seg: 16, sides: 4 });
      cylinder(g, [capC[0], capC[1] + 17, capC[2]], [capC[0], capC[1] + 23, capC[2]], 8, { seg: 28, sides: 12 });
      [-6, 0, 6].forEach((dx) => g.line([capC[0] + dx, top, capC[2] + 13], [capC[0] + dx, capC[1] - 9, capC[2] + 13]));
    });
    P('coilLeads', { from: 1, wire: true }, (g) => {
      wire(g, [-R * 0.7, coilY1, R * 0.7], [capC[0] + 6, top, capC[2] + 16], 30);
      wire(g, [-R * 0.8, coilY0, R * 0.6], [-100, top, 30], 8);
    });
    const dA = [-152, top + 3, 20], dB = [-142, top + 3, 20];
    P('diode', { key: 'D', from: 2, center: [-147, top + 3, 20], explode: [0, 35, 0] }, (g) => {
      cylinder(g, dA, dB, 1.8, { seg: 14, sides: 4 });
      cylinder(g, [-144.2, top + 3, 20], [-143.2, top + 3, 20], 1.95, { seg: 14, sides: 0 });
      g.poly([dA, [-156, top + 3, 20], [-156, top, 20]]);
      g.poly([dB, [-138, top + 3, 20], [-138, top, 20]]);
    });
    P('rc', { key: 'E', from: 2, center: [-118, top + 4, 22], explode: [0, 50, 0] }, (g) => {
      cylinder(g, [-124, top + 3, 10], [-114, top + 3, 10], 1.6, { seg: 14, sides: 4 });
      [-121, -118.5, -116].forEach((x) => cylinder(g, [x, top + 3, 10], [x + 0.8, top + 3, 10], 1.75, { seg: 14, sides: 0 }));
      g.poly([[-124, top + 3, 10], [-127, top + 3, 10], [-127, top, 10]]);
      g.poly([[-114, top + 3, 10], [-110, top + 3, 10], [-110, top, 10]]);
      cylinder(g, [-118, top + 7, 33], [-116, top + 7, 33], 4.5, { seg: 22, sides: 0 });
      g.poly([[-118, top + 3, 33], [-118, top, 31]]);
      g.poly([[-116, top + 3, 33], [-116, top, 35]]);
    });
    P('jumpers', { from: 2, wire: true }, (g) => {
      wire(g, [capC[0] + 13, top, capC[2]], [-156, top, 20], 6);
      wire(g, [-138, top, 20], [-127, top, 10], 4);
      wire(g, [-110, top, 10], [-100, top, -2], 4);
    });
    const loopY0 = 12, loopY1 = 12 + coil.loopTurns * 1.2;
    P('loop', { key: 'A', from: 3, center: [0, (loopY0 + loopY1) / 2, R], explode: [0, -28, 0] }, (g) => {
      helix(g, R + 0.6, loopY0, loopY1, coil.loopTurns, 32);
    });
    const genC = [210, 35, -30];
    P('gen', { from: 3, center: genC, label: 'Function generator', explode: [60, 0, -40] }, (g) => {
      box(g, genC, [120, 70, 90]);
      const fz = genC[2] + 45.05;
      g.poly([[160, 45, fz], [205, 45, fz], [205, 62, fz], [160, 62, fz]], true);
      cylinder(g, [232, 50, fz], [232, 50, fz + 6], 8, { seg: 24, sides: 6 });
      cylinder(g, [252, 50, fz], [252, 50, fz + 4], 5, { seg: 20, sides: 4 });
      cylinder(g, [170, 18, fz], [170, 18, fz + 7], 3.5, { seg: 16, sides: 4 });
      for (let i = 0; i < 4; i++) box(g, [195 + i * 12, 18, fz + 1], [8, 5, 2]);
    });
    P('loopGen', { from: 3, wire: true }, (g) => {
      wire(g, [R * 0.9, loopY0, R * 0.4], [170, 18, 22], 4);
      wire(g, [R * 0.9, loopY1, R * 0.3], [168, 22, 22], 14);
    });
    P('probes', { from: 4, center: [-110, 40, 110], label: 'Scope probes', explode: [0, 30, 40] }, (g) => {
      const probe = (tip, back) => {
        const dir = norm(sub(back, tip));
        const a = add(tip, scl(dir, 12)), b = add(tip, scl(dir, 70));
        g.line(tip, a);
        cylinder(g, a, add(a, scl(dir, 8)), 2.5, { seg: 16, sides: 4 });
        cylinder(g, add(a, scl(dir, 8)), b, 4.5, { seg: 20, sides: 6, rings: [0, 0.5, 1] });
        wire(g, b, add(b, [40, -10, 80]), -10);
      };
      probe([-152, top + 3, 22], [-95, 50, 120]);
      probe([-138, top + 3, 22], [-60, 55, 112]);
    });
    return parts;
  }

  /* ---------- GL setup ---------- */
  const VS = 'attribute vec3 p;uniform mat4 m;uniform vec3 o;varying float w;void main(){vec4 c=m*vec4(p+o,1.0);w=c.w;gl_Position=c;}';
  const FS = 'precision mediump float;uniform vec4 col;uniform vec2 fade;varying float w;void main(){float f=clamp((w-fade.x)/fade.y,0.0,1.0);gl_FragColor=vec4(col.rgb,col.a*(1.0-0.6*f));}';

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const hex = (h, a) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255, a];

  /* Camera framing per step: [target, distance] */
  const FRAMES = [
    [[0, 50, 0], 230], [[-90, 30, 15], 360], [[-110, 20, 15], 300],
    [[20, 30, 0], 480], [[-40, 30, 40], 460]
  ];

  function create(host, opts) {
    opts = opts || {};
    const canvas = host.querySelector('canvas');
    const labelsEl = host.querySelector('.v3d-labels');
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
    if (!gl) return null;

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const loc = { p: gl.getAttribLocation(prog, 'p'), m: gl.getUniformLocation(prog, 'm'), o: gl.getUniformLocation(prog, 'o'), col: gl.getUniformLocation(prog, 'col'), fade: gl.getUniformLocation(prog, 'fade') };
    gl.enableVertexAttribArray(loc.p);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const parts = buildScene(opts.coil || { diameterMm: 60, windingMm: 29, turns: 75, loopTurns: 5 });
    parts.forEach((pt) => {
      const mk = (arr) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); return b; };
      pt.triBuf = pt.geo.tris.length ? mk(pt.geo.tris) : null; pt.triN = pt.geo.tris.length / 3;
      pt.lineBuf = mk(pt.geo.lines); pt.lineN = pt.geo.lines.length / 3;
      pt.geo = null;
      pt.revStart = 0; pt.revDur = 0; pt.rev = 1;
      if (pt.key) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'v3d-tag'; b.textContent = pt.key;
        b.setAttribute('aria-label', 'Select callout ' + pt.key);
        b.addEventListener('click', (e) => { e.stopPropagation(); api.select(pt.key, true); });
        labelsEl.appendChild(b); pt.tag = b;
      }
    });

    const C = { paper: hex('#1a4793', 1), line: hex('#ffffff', 0.92), fresh: hex('#9fe3ff', 1), sel: hex('#ffd34d', 1), wire: hex('#d5e4fb', 0.8) };
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const st = { step: 0, sel: null, yaw: -0.55, pitch: 0.42, dist: FRAMES[0][1], target: FRAMES[0][0].slice(), explode: 0, explodeTo: 0, anim: null, mvp: null };
    let raf = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      draw();
    }
    function visible(pt) { return st.step >= pt.from && (pt.until == null || st.step < pt.until); }

    function draw() {
      raf = 0;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const cp = Math.cos(st.pitch);
      const eye = add(st.target, [Math.sin(st.yaw) * cp * st.dist, Math.sin(st.pitch) * st.dist, Math.cos(st.yaw) * cp * st.dist]);
      const proj = perspective(0.62, canvas.width / canvas.height, 5, 4000);
      st.mvp = mul(proj, lookAt(eye, st.target, [0, 1, 0]));
      gl.uniformMatrix4fv(loc.m, false, new Float32Array(st.mvp));
      gl.uniform2f(loc.fade, st.dist - 120, 320);
      const ex = st.explode;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      const now = performance.now();
      let revealing = false;

      parts.forEach((pt) => {
        /* draw-in progress: lines are stored in build order, so a partial
           count "draws" the part (the coil winds turn by turn) */
        if (pt.rev < 1) {
          pt.rev = Math.max(0, Math.min(1, (now - pt.revStart) / pt.revDur));
          if (pt.rev < 1) revealing = true;
        }
        const vis = visible(pt) && !(pt.wire && ex > 0.05) && pt.rev > 0;
        if (pt.tag) pt.tag.hidden = !vis || pt.rev < 0.7;
        if (!vis) return;
        const off = pt.explode ? scl(pt.explode, ex) : [0, 0, 0];
        gl.uniform3f(loc.o, off[0], off[1], off[2]);
        if (pt.triBuf && pt.rev >= 1) {
          gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 2);
          gl.uniform4fv(loc.col, C.paper);
          gl.bindBuffer(gl.ARRAY_BUFFER, pt.triBuf);
          gl.vertexAttribPointer(loc.p, 3, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.TRIANGLES, 0, pt.triN);
          gl.disable(gl.POLYGON_OFFSET_FILL);
        }
        const col = pt.key && pt.key === st.sel ? C.sel : (pt.from === st.step && st.step > 0 ? C.fresh : (pt.wire ? C.wire : C.line));
        gl.uniform4fv(loc.col, col);
        gl.bindBuffer(gl.ARRAY_BUFFER, pt.lineBuf);
        gl.vertexAttribPointer(loc.p, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, pt.rev >= 1 ? pt.lineN : Math.floor((pt.lineN * pt.rev) / 2) * 2);

        if (pt.tag && !pt.tag.hidden) {
          const s = project(st.mvp, add(pt.center, off));
          const lift = 26;
          pt.tag.style.transform = 'translate(' + ((s.x * 0.5 + 0.5) * W - 16).toFixed(1) + 'px,' + ((-s.y * 0.5 + 0.5) * H - 16 - lift).toFixed(1) + 'px)';
          pt.tag.classList.toggle('on', pt.key === st.sel);
          if (s.w <= 0) pt.tag.hidden = true;
        }
      });
      if (revealing) request();
    }
    function request() { if (!raf) raf = requestAnimationFrame(draw); }

    function animateTo(target, dist) {
      if (reduce) { st.target = target.slice(); st.dist = dist; st.explode = st.explodeTo; request(); return; }
      const from = { t: st.target.slice(), d: st.dist, e: st.explode };
      const t0 = performance.now(), D = 650;
      if (st.anim) cancelAnimationFrame(st.anim);
      const tick = (now) => {
        let k = Math.min(1, (now - t0) / D);
        k = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        st.target = [lerp(from.t[0], target[0], k), lerp(from.t[1], target[1], k), lerp(from.t[2], target[2], k)];
        st.dist = lerp(from.d, dist, k);
        st.explode = lerp(from.e, st.explodeTo, k);
        draw();
        st.anim = k < 1 ? requestAnimationFrame(tick) : null;
      };
      st.anim = requestAnimationFrame(tick);
    }

    /* ---------- interaction ---------- */
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: false }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      drag.x = e.clientX; drag.y = e.clientY;
      st.yaw -= dx * 0.008;
      st.pitch = Math.max(-0.2, Math.min(1.45, st.pitch + dy * 0.006));
      request();
    });
    canvas.addEventListener('pointerup', (e) => {
      if (drag && !drag.moved) pick(e);
      drag = null;
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      st.dist = Math.max(80, Math.min(1200, st.dist * (1 + Math.sign(e.deltaY) * 0.1)));
      request();
    }, { passive: false });
    canvas.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowLeft') st.yaw += 0.1;
      else if (k === 'ArrowRight') st.yaw -= 0.1;
      else if (k === 'ArrowUp') st.pitch = Math.min(1.45, st.pitch + 0.08);
      else if (k === 'ArrowDown') st.pitch = Math.max(-0.2, st.pitch - 0.08);
      else if (k === '+' || k === '=') st.dist = Math.max(80, st.dist * 0.9);
      else if (k === '-' || k === '_') st.dist = Math.min(1200, st.dist * 1.1);
      else if (k === 'Home') { api.reset(); e.preventDefault(); return; }
      else return;
      e.preventDefault(); request();
    });
    function pick(e) {
      const r = canvas.getBoundingClientRect();
      let best = null, bestD = 44;
      parts.forEach((pt) => {
        if (!pt.key || !visible(pt)) return;
        const off = pt.explode ? scl(pt.explode, st.explode) : [0, 0, 0];
        const s = project(st.mvp, add(pt.center, off));
        if (s.w <= 0) return;
        const d = Math.hypot((s.x * 0.5 + 0.5) * r.width - (e.clientX - r.left), (-s.y * 0.5 + 0.5) * r.height - (e.clientY - r.top));
        if (d < bestD) { bestD = d; best = pt; }
      });
      if (best) api.select(best.key, true);
    }

    const api = {
      /* restart = true redraws every part of this step from nothing (used by replay);
         otherwise only parts that are new since the previous step are drawn in. */
      setStep(i, restart) {
        const prev = st.step;
        st.step = i;
        if (!reduce) {
          const now = performance.now();
          let k = 0;
          parts.forEach((pt) => {
            const fresh = restart ? pt.from <= i : (pt.from > prev && pt.from <= i);
            if (!fresh || !visible(pt)) return;
            pt.revDur = pt.id === 'coil' ? 1800 : (pt.wire ? 600 : 900);
            pt.revStart = now + 250 + k * 180;
            pt.rev = 0;
            k++;
          });
        }
        const f = FRAMES[Math.min(i, FRAMES.length - 1)];
        animateTo(f[0], f[1]);
        request();
      },
      /* Total time the draw-in for the current step needs, in ms. */
      revealTime() {
        let end = 0;
        parts.forEach((pt) => { if (pt.rev < 1) end = Math.max(end, pt.revStart + pt.revDur); });
        return Math.max(0, end - performance.now());
      },
      select(key, fromUser) {
        st.sel = key; request();
        if (fromUser && opts.onSelect) opts.onSelect(key);
      },
      setExploded(on) { st.explodeTo = on ? 1 : 0; animateTo(st.target, st.dist); },
      reset() {
        st.yaw = -0.55; st.pitch = 0.42;
        const f = FRAMES[Math.min(st.step, FRAMES.length - 1)];
        animateTo(f[0], f[1]);
      },
      isVisible(key) { const pt = parts.find((p) => p.key === key); return !!pt && visible(pt); }
    };

    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    window.addEventListener('resize', resize);
    resize();
    return api;
  }

  window.Viewer3D = { create: create };
})();
