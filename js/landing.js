/* Cover sheet (index.html): numbers come from data.js, the model from viewer3d.js. */
(function () {
  'use strict';
  const S = window.SITE;
  const $ = (id) => document.getElementById(id);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs, text) => {
    const n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, attrs[k]));
    if (text != null) n.textContent = text;
    return n;
  };
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const P = S.predicted, M = S.measured;

  /* ---------- bindings ---------- */
  document.querySelectorAll('[data-bind="team"]').forEach((n) => { n.textContent = S.team.toUpperCase(); });
  document.querySelectorAll('[data-bind="course"]').forEach((n) => { n.textContent = S.course.toUpperCase(); });
  $('tbTeam').textContent = (S.team + ' · ' + S.members.join(' · ')).toUpperCase();

  const BW = M.fHigh_kHz - M.fLow_kHz;
  $('hF0').textContent = M.f0_kHz;
  $('hQ').textContent = (M.f0_kHz / BW).toFixed(2);
  $('hTurns').textContent = S.coil.turns + ' T';
  $('hWire').textContent = 'ON Ø' + S.coil.diameterMm + ' MM';
  $('hTau').textContent = P.rc_us;
  $('nF0').textContent = M.f0_kHz;
  $('nBW').textContent = BW.toFixed(1);
  $('nBand').textContent = M.bandLow_kHz + '–' + M.bandHigh_kHz;
  $('nRatio').textContent = Math.pow(M.bandHigh_kHz / M.bandLow_kHz, 2).toFixed(2);
  $('nTau').textContent = P.rc_us;

  /* M2 checklist progress, as ticked on the build log in this browser */
  let done = [];
  try { done = JSON.parse(localStorage.getItem('bp-m2-done')) || []; } catch (e) { /* storage unavailable */ }
  $('m2Total').textContent = S.m2Checklist.length;
  $('m2Bar').style.width = Math.min(100, done.length / S.m2Checklist.length * 100) + '%';

  /* ---------- 3D model: replays the M1 build on a loop ---------- */
  const host = $('coverV3d');
  let viewer = null, heldUntil = 0;
  /* pause the idle spin while someone is turning the model or reading a tag */
  const hold = () => { heldUntil = performance.now() + 5000; };
  try {
    viewer = window.Viewer3D && window.Viewer3D.create(host, { coil: S.coil, wheel: false, onSelect: showPart });
  } catch (e) { viewer = null; }

  const n = S.steps.length;
  $('cStepTotal').textContent = String(n).padStart(2, '0');
  function showStep(i) {
    $('cStepNo').textContent = String(i + 1).padStart(2, '0');
    $('cStepTitle').textContent = S.steps[i].title;
    $('cBar').style.width = ((i + 1) / n * 100) + '%';
  }
  function showPart(key) {
    const p = S.parts.find((x) => x.key === key);
    if (p) $('cPart').textContent = p.key + ' · ' + p.name.toUpperCase() + ' — ' + p.spec;
    hold();
  }
  $('cPart').textContent = 'Tap a lettered tag to name the part.';

  if (!viewer) {
    host.querySelector('canvas').hidden = true;
    host.querySelector('.v3d-fallback').hidden = false;
    showStep(n - 1);
    $('cPart').textContent = S.photos.setup.cap;
  } else if (reduce) {
    viewer.setStep(n - 1);
    showStep(n - 1);
  } else {
    let step = 0, timer = 0, running = false, spinRaf = 0;
    const tick = () => {
      viewer.setStep(step, step === 0);
      showStep(step);
      const pause = step === n - 1 ? 3600 : 1800;
      timer = setTimeout(() => { step = (step + 1) % n; tick(); }, viewer.revealTime() + pause);
    };
    const spin = () => {
      if (performance.now() > heldUntil) viewer.orbit(-0.0022);
      spinRaf = requestAnimationFrame(spin);
    };
    const start = () => { if (running) return; running = true; tick(); spinRaf = requestAnimationFrame(spin); };
    const stop = () => { running = false; clearTimeout(timer); cancelAnimationFrame(spinRaf); };
    const canvas = host.querySelector('canvas');
    ['pointerdown', 'pointermove', 'keydown'].forEach((ev) => canvas.addEventListener(ev, (e) => {
      if (ev !== 'pointermove' || e.buttons) hold();
    }));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? start() : stop())); }, { threshold: 0.15 }).observe(host);
    } else start();
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  }

  /* ---------- tuning dial ---------- */
  const F0 = 520, F1 = 1620, X0 = 30, X1 = 970, BASE = 100;
  const x = (f) => X0 + (Math.max(F0, Math.min(F1, f)) - F0) / (F1 - F0) * (X1 - X0);
  const dial = $('dialSvg');
  const ticks = [];
  for (let f = F0; f <= F1; f += 10) {
    const h = f % 100 === 0 ? 28 : (f % 50 === 0 ? 18 : 10);
    ticks.push('M' + x(f).toFixed(1) + ' ' + BASE + ' V ' + (BASE - h));
  }
  dial.appendChild(svg('path', { class: 'tk', d: 'M' + X0 + ' ' + BASE + ' H ' + X1 }));
  dial.appendChild(svg('path', { class: 'tk', d: ticks.filter((_, i) => (F0 + i * 10) % 50).join(' ') }));
  dial.appendChild(svg('path', { class: 'tk m', d: ticks.filter((_, i) => (F0 + i * 10) % 50 === 0 && (F0 + i * 10) % 100).join(' ') }));
  dial.appendChild(svg('path', { class: 'tk M', d: ticks.filter((_, i) => (F0 + i * 10) % 100 === 0).join(' ') }));
  for (let f = 600; f <= 1600; f += 100) {
    dial.appendChild(svg('text', { class: 'num' + ((f / 100) % 2 ? ' odd' : ''), x: x(f), y: 134, 'text-anchor': 'middle' }, f));
  }
  /* predicted band runs off the right of the dial (it ends at 2.253 MHz) */
  const pa = x(P.bandLow_kHz);
  dial.appendChild(svg('path', { class: 'band-p', d: 'M' + X1 + ' 30 H ' + pa + ' V ' + BASE }));
  dial.appendChild(svg('path', { class: 'band-p', d: 'M' + (X1 - 10) + ' 24 L ' + X1 + ' 30 L ' + (X1 - 10) + ' 36' }));
  dial.appendChild(svg('text', { class: 'bl b', x: pa + 8, y: 22 }, 'PREDICTED ' + Math.round(P.bandLow_kHz) + '–' + P.bandHigh_kHz + ' kHz →'));
  const ma = x(M.bandLow_kHz), mb = x(M.bandHigh_kHz);
  dial.appendChild(svg('rect', { class: 'band-m', x: ma, y: 44, width: mb - ma, height: BASE - 44 }));
  dial.appendChild(svg('text', { class: 'bl y', x: mb + 8, y: 58 }, 'MEASURED · M1'));
  const fx = x(M.f0_kHz);
  dial.appendChild(svg('path', { class: 'f0', d: 'M' + (fx - 6) + ' 44 L ' + (fx + 6) + ' 44 L ' + fx + ' 54 Z' }));
  const needle = svg('g', {});
  needle.appendChild(svg('line', { class: 'needle-l', x1: 0, y1: 6, x2: 0, y2: 112 }));
  needle.appendChild(svg('circle', { class: 'needle-h', cx: 0, cy: 6, r: 6 }));
  dial.appendChild(needle);

  const input = $('dialInput');
  const L = P.L_uH * 1e-6;
  function tune(f) {
    needle.setAttribute('transform', 'translate(' + x(f).toFixed(1) + ' 0)');
    $('dialF').textContent = Math.round(f);
    const cpF = 1 / (Math.pow(2 * Math.PI * f * 1e3, 2) * L) * 1e12;
    const inRange = cpF >= S.capRange_pF[0] && cpF <= S.capRange_pF[1];
    $('dialC').textContent = 'needs C ≈ ' + cpF.toFixed(1) + ' pF with L = ' + P.L_uH + ' µH' + (inRange ? '' : ' (outside 20–280 pF)');
    const inBand = f >= M.bandLow_kHz && f <= M.bandHigh_kHz;
    const note = $('dialNote');
    note.classList.toggle('in', inBand);
    note.textContent = inBand ? 'Inside the band our tank reached on the bench.'
      : (f < M.bandLow_kHz ? 'Below the measured lower stop (' + M.bandLow_kHz + ' kHz). The tank never tuned this low.'
        : 'Above the measured upper stop (' + M.bandHigh_kHz + ' kHz). The tank never tuned this high.');
  }
  let touched = false;
  input.addEventListener('input', () => { touched = true; tune(Number(input.value)); });
  tune(F0);
  /* first time the dial comes into view, sweep the needle up to f₀ */
  function sweep() {
    if (touched) return;
    if (reduce) { input.value = M.f0_kHz; tune(M.f0_kHz); return; }
    const t0 = performance.now(), D = 2200;
    const step = (now) => {
      if (touched) return;
      const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
      const f = F0 + (M.f0_kHz - F0) * e;
      input.value = Math.round(f); tune(f);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- reveal on scroll ---------- */
  const targets = document.querySelectorAll('.block-title, .stage, .dial, .sheet-card, .bench-photo, .bench-notes, .title-block');
  const stages = Array.from(document.querySelectorAll('.stage'));
  if (!reduce && 'IntersectionObserver' in window) {
    targets.forEach((t) => t.classList.add('reveal'));
    stages.forEach((s, i) => { s.style.transitionDelay = (i * 90) + 'ms'; s.style.setProperty('--wire', 0); });
    document.querySelectorAll('.sheet-card').forEach((c, i) => { c.style.transitionDelay = (i * 90) + 'ms'; });
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        if (e.target.classList.contains('stage')) {
          const i = stages.indexOf(e.target);
          setTimeout(() => e.target.style.setProperty('--wire', 1), 350 + i * 90);
        }
        if (e.target.classList.contains('dial')) sweep();
        /* once in place, drop the reveal styles so the cards' own hover transitions apply */
        setTimeout(() => { e.target.classList.remove('reveal', 'in'); e.target.style.transitionDelay = ''; }, 1400);
        io.unobserve(e.target);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });
    targets.forEach((t) => io.observe(t));
  } else {
    sweep();
  }
})();
