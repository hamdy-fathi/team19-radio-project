(function () {
  'use strict';
  const S = window.SITE;
  const body = document.body;
  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs, text) => {
    const n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach((k) => n.setAttribute(k, attrs[k]));
    if (text != null) n.textContent = text;
    return n;
  };
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs) => { const n = document.createElementNS(SVGNS, tag); Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, attrs[k])); return n; };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  let viewer = null;
  const nudgeViewer = () => requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));

  /* ---------- bindings ---------- */
  const teamLine = S.members && S.members.length ? S.team + ' · ' + S.members.join(' · ') : S.team;
  document.querySelectorAll('[data-bind="team"]').forEach((n) => { n.textContent = teamLine.toUpperCase(); });
  document.querySelectorAll('[data-bind="course"]').forEach((n) => { n.textContent = S.course.toUpperCase(); });
  document.querySelectorAll('[data-bind="L"]').forEach((n) => { n.textContent = S.predicted.L_uH; });

  /* ---------- layout switch (A shell / B sheet / C split) ---------- */
  const LAYOUTS = ['shell', 'sheet', 'split'];
  const layoutBtns = Array.from(document.querySelectorAll('[data-layout-btn]'));
  function setLayout(name) {
    if (LAYOUTS.indexOf(name) < 0) name = 'split';
    body.dataset.layout = name;
    layoutBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layoutBtn === name)));
    /* the sheet always shows the 3D and the schematic, so its tab area starts on readings */
    if (name === 'sheet' && (curSection === 'build' || curSection === 'schematic')) setSection('readings');
    else setSection(curSection);
    nudgeViewer();
  }
  layoutBtns.forEach((b) => b.addEventListener('click', () => setLayout(b.dataset.layoutBtn)));

  /* ---------- sections (what the main panel shows) ---------- */
  const navBtns = Array.from(document.querySelectorAll('.nav-btn'));
  let curSection = store.get('bp-section', 'build');
  function setSection(sec) {
    curSection = sec;
    body.dataset.section = sec;
    store.set('bp-section', sec);
    navBtns.forEach((b) => b.setAttribute('aria-current', String(b.dataset.sec === sec)));
    if (sec === 'build') nudgeViewer();
  }
  navBtns.forEach((b) => b.addEventListener('click', () => setSection(b.dataset.sec)));

  /* ---------- milestones (#m1 / #m2 / #m3) ---------- */
  const MS = {
    m1: { title: 'Tuner & envelope detector', status: 'SHEET 1 OF 3 · REV M1 · SIGNED OFF' },
    m2: { title: 'Two-stage RF amplifier', status: 'SHEET 2 OF 3 · REV M2 · PLANNED' },
    m3: { title: 'Audio stage', status: 'SHEET 3 OF 3 · RESERVED' }
  };
  const msTabs = Array.from(document.querySelectorAll('.ms-tab'));
  function route() {
    const id = (location.hash || '#m1').slice(1);
    const ms = MS[id] ? id : 'm1';
    body.dataset.ms = ms;
    $('msTitle').textContent = MS[ms].title;
    $('msStatus').textContent = MS[ms].status;
    msTabs.forEach((t) => { if (t.dataset.ms === ms) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
    if (ms === 'm1') nudgeViewer();
  }
  window.addEventListener('hashchange', route);

  /* ---------- callouts: schematic balloons + chips + 3D tags ---------- */
  const BALLOONS = { A: [78, 130], B: [240, 125], C: [360, 160], D: [458, 44], E: [670, 380] };
  const chips = {}, balloons = {};
  S.parts.forEach((p) => {
    const xy = BALLOONS[p.key];
    if (xy) {
      const g = svg('g', { class: 'bal' });
      g.appendChild(svg('circle', { cx: xy[0], cy: xy[1], r: 18 }));
      const t = svg('text', { x: xy[0] - 5, y: xy[1] + 6 }); t.textContent = p.key; g.appendChild(t);
      g.addEventListener('click', () => selectPart(p.key, 'schematic'));
      $('balloons').appendChild(g); balloons[p.key] = g;
    }
    const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', title: p.name, 'aria-label': p.key + ', ' + p.name }, p.key);
    b.addEventListener('click', () => selectPart(p.key, 'chip'));
    $('partBtns').appendChild(b); chips[p.key] = b;
  });
  const PART_STEP = { A: 3, B: 0, C: 1, D: 2, E: 2 };
  let curStep = Math.min(store.get('bp-step', 0), S.steps.length - 1);
  function selectPart(key, source) {
    const p = S.parts.find((x) => x.key === key);
    if (!p) return;
    $('pKey').textContent = p.key; $('pName').textContent = p.name;
    $('pSpec').textContent = p.spec; $('pRole').textContent = p.role; $('pReading').textContent = p.reading;
    Object.keys(chips).forEach((k) => chips[k].setAttribute('aria-pressed', String(k === key)));
    Object.keys(balloons).forEach((k) => balloons[k].classList.toggle('on', k === key));
    if (viewer) {
      if (source !== '3d' && source !== 'init' && PART_STEP[key] > curStep) { stopReplay(); setStep(PART_STEP[key]); }
      viewer.select(key, false);
    }
  }

  /* ---------- steps + 3D ---------- */
  $('vStepTotal').textContent = String(S.steps.length).padStart(2, '0');
  $('stepList').style.setProperty('--steps', S.steps.length);
  const stepBtns = S.steps.map((st, i) => {
    const li = el('li');
    const b = el('button', { type: 'button', class: 'step-btn', title: st.title });
    b.appendChild(el('b', null, String(i + 1).padStart(2, '0')));
    b.appendChild(document.createTextNode(st.short));
    b.addEventListener('click', () => { stopReplay(); setStep(i); });
    li.appendChild(b); $('stepList').appendChild(li);
    return b;
  });
  function setStep(i, restart) {
    curStep = Math.max(0, Math.min(S.steps.length - 1, i));
    store.set('bp-step', curStep);
    const st = S.steps[curStep];
    stepBtns.forEach((b, k) => {
      b.classList.toggle('done', k < curStep);
      if (k === curStep) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    const no = String(curStep + 1).padStart(2, '0');
    $('vStepNo').textContent = no; $('vStepTitle').textContent = st.title;
    $('sNum').textContent = no; $('sTitle').textContent = st.title; $('sText').textContent = st.text; $('sNote').textContent = st.note;
    const code = $('sCode');
    code.hidden = !st.code; code.textContent = st.code || '';
    const ph = S.photos[st.photo];
    $('sImg').src = ph.src; $('sImg').alt = ph.alt; $('sCap').textContent = ph.cap;
    $('prevStep').disabled = curStep === 0;
    $('nextStep').disabled = curStep === S.steps.length - 1;
    if (viewer) viewer.setStep(curStep, !!restart);
  }
  $('prevStep').addEventListener('click', () => { stopReplay(); setStep(curStep - 1); });
  $('nextStep').addEventListener('click', () => { stopReplay(); setStep(curStep + 1); });

  const host = $('v3d');
  try {
    viewer = window.Viewer3D && window.Viewer3D.create(host, { coil: S.coil, onSelect: (k) => selectPart(k, '3d') });
  } catch (e) { viewer = null; }
  if (!viewer) {
    host.querySelector('canvas').hidden = true;
    host.querySelector('.v3d-fallback').hidden = false;
    host.querySelector('.v3d-tools').hidden = true;
    $('replay').hidden = true;
  } else {
    $('explode').addEventListener('change', (e) => viewer.setExploded(e.target.checked));
    $('resetView').addEventListener('click', () => viewer.reset());
  }

  /* ---------- replay ---------- */
  const replayBtn = $('replay'), replayBar = $('replayBar');
  let replayTimer = 0, replaying = false;
  function stopReplay() {
    if (!replaying) return;
    replaying = false;
    clearTimeout(replayTimer);
    replayBtn.textContent = '▶ Replay';
    replayBtn.setAttribute('aria-pressed', 'false');
    replayBar.style.width = '0';
  }
  function replayStep(i) {
    setStep(i, i === 0);
    replayBar.style.width = ((i + 1) / S.steps.length * 100) + '%';
    const hold = (viewer ? viewer.revealTime() : 0) + 1700;
    replayTimer = setTimeout(() => {
      if (!replaying) return;
      if (i < S.steps.length - 1) replayStep(i + 1); else stopReplay();
    }, hold);
  }
  replayBtn.addEventListener('click', () => {
    if (replaying) { stopReplay(); return; }
    replaying = true;
    replayBtn.textContent = '■ Stop';
    replayBtn.setAttribute('aria-pressed', 'true');
    const ex = $('explode');
    if (ex.checked) { ex.checked = false; if (viewer) viewer.setExploded(false); }
    replayStep(0);
  });

  /* ---------- readings ---------- */
  const P = S.predicted, M = S.measured;
  const err = (p, m) => { const v = 100 * (p - m) / m; return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + ' %'; };
  const L = P.L_uH * 1e-6;
  const fOf = (pF) => 1 / (2 * Math.PI * Math.sqrt(L * (pF + S.stray_pF) * 1e-12)) / 1000;
  const midC = (S.capRange_pF[0] + S.capRange_pF[1]) / 2;
  const fMidPred = fOf(midC);
  const BW = M.fHigh_kHz - M.fLow_kHz, Q = M.Q || M.f0_kHz / BW;
  $('statF0').textContent = M.f0_kHz;
  $('statQ').textContent = Q.toFixed(2);
  $('statBand').textContent = Math.round(M.bandLow_kHz) + '–' + Math.round(M.bandHigh_kHz);
  [
    ['B', 'Inductance L', P.L_uH + ' µH', '—', '—'],
    ['C', 'C for 819 kHz', P.c819_pF + ' pF', '—', '—'],
    ['B+C', 'Band low end', P.bandLow_kHz + ' kHz', M.bandLow_kHz + ' kHz', err(P.bandLow_kHz, M.bandLow_kHz)],
    ['B+C', 'Band high end', (P.bandHigh_kHz / 1000).toFixed(3) + ' MHz', (M.bandHigh_kHz / 1000).toFixed(3) + ' MHz', err(P.bandHigh_kHz, M.bandHigh_kHz)],
    ['TP1', 'f₀ at half travel', '≈ ' + fMidPred.toFixed(0) + ' kHz (' + midC + ' + ' + S.stray_pF + ' pF)', M.f0_kHz + ' kHz', err(fMidPred, M.f0_kHz)],
    ['TP1', 'f_low / f_high at 0.7 × peak', '—', M.fLow_kHz + ' / ' + M.fHigh_kHz + ' kHz', '—'],
    ['TP1', 'Q = f₀ / BW', '—', Q.toFixed(2) + ' (BW ' + BW.toFixed(1) + ' kHz)', '—'],
    ['E', 'Detector RC', P.rc_us + ' µs', S.detector.R_kOhm + ' kΩ × ' + S.detector.C_nF + ' nF', '—']
  ].forEach((r) => {
    const tr = el('tr');
    r.forEach((c, i) => { const td = el('td', null, c); if (i === 4 && c !== '—') td.className = 'err'; tr.appendChild(td); });
    $('schedule').appendChild(tr);
  });

  /* ---------- tuning calculator ---------- */
  const lo = 300, hi = 2200;
  const pct = (f) => Math.max(0, Math.min(100, (f - lo) / (hi - lo) * 100));
  const cap = $('cap');
  cap.min = S.capRange_pF[0]; cap.max = S.capRange_pF[1];
  $('band').style.left = pct(M.bandLow_kHz) + '%';
  $('band').style.width = (pct(M.bandHigh_kHz) - pct(M.bandLow_kHz)) + '%';
  function tune() {
    const c = Number(cap.value), f = fOf(c);
    $('capVal').textContent = c; $('fVal').textContent = f.toFixed(1);
    $('needle').style.left = pct(f) + '%';
    const inBand = f >= M.bandLow_kHz && f <= M.bandHigh_kHz;
    const n = $('tuneNote');
    n.classList.toggle('in', inBand);
    n.textContent = inBand ? 'Inside the measured band. Only a narrow slice of the dial reaches here.'
      : (f < M.bandLow_kHz ? 'Below the measured lower stop. The real tank never tuned this low.' : 'Above the measured upper stop. The real tank never tuned this high.');
  }
  cap.addEventListener('input', tune);

  /* ---------- detector chart ---------- */
  const chart = $('detChart');
  const X = (v) => 50 + v / 800 * 450, Y = (v) => 260 - v / 32 * 240;
  chart.appendChild(svg('path', { class: 'dim', d: 'M50 200 H 500 M50 140 H 500 M50 80 H 500 M162.5 20 V 260 M275 20 V 260 M387.5 20 V 260' }));
  chart.appendChild(svg('path', { class: 'w', d: 'M50 20 V 260 H 500' }));
  const pts = S.detectorPoints.slice().sort((a, b) => a.tp1 - b.tp1);
  chart.appendChild(svg('path', { class: 'w', d: 'M' + pts.map((p) => X(p.tp1).toFixed(1) + ' ' + Y(p.tp3).toFixed(1)).join(' L ') }));
  const t1 = svg('text', { class: 'lbl', x: 250, y: 292 }); t1.textContent = 'TP1 peak, mV'; chart.appendChild(t1);
  const t2 = svg('text', { class: 'lbl', x: 56, y: 16 }); t2.textContent = 'TP3 DC, mV'; chart.appendChild(t2);
  const dots = [], rowBtns = [];
  pts.forEach((p, i) => {
    const c = svg('circle', { class: 'pt', cx: X(p.tp1).toFixed(1), cy: Y(p.tp3).toFixed(1), r: 7 });
    c.addEventListener('click', () => pickPt(i));
    chart.appendChild(c); dots.push(c);
    const b = el('button', { type: 'button', class: 'det-btn', 'aria-pressed': 'false' }, p.source + ' V');
    b.addEventListener('click', () => pickPt(i));
    $('detRows').appendChild(b); rowBtns.push(b);
  });
  function pickPt(i) {
    const p = pts[i], e = p.tp3 / p.tp1 * 100;
    dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.setAttribute('r', k === i ? 10 : 7); });
    rowBtns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    $('detNote').textContent = 'TP1 ' + p.tp1 + ' mV → TP3 ' + p.tp3 + ' mV, η = ' + e.toFixed(0) + ' %. ' +
      (e >= 60 ? 'Near-linear: most of the peak reaches TP3.' : (e >= 45 ? 'Knee: the diode drop is a visible share.' : 'Below the knee: the diode drop swallows most of it.'));
  }

  /* ---------- issues ---------- */
  S.problems.forEach((p, i) => {
    const tr = el('tr');
    [String(i + 1).padStart(2, '0'), p.issue, p.cause, p.fix].forEach((v) => tr.appendChild(el('td', null, v)));
    $('issues').appendChild(tr);
  });

  /* ---------- gallery ---------- */
  const photoKeys = Object.keys(S.photos);
  const thumbBtns = photoKeys.map((k, i) => {
    const ph = S.photos[k];
    const b = el('button', { type: 'button', class: 'thumb', 'aria-pressed': 'false', 'aria-label': 'Show ' + ph.cap });
    b.appendChild(el('img', { src: ph.src, alt: '', loading: 'lazy' }));
    b.addEventListener('click', () => showPhoto(i));
    $('thumbs').appendChild(b);
    return b;
  });
  function showPhoto(i) {
    const ph = S.photos[photoKeys[i]];
    $('galImg').src = ph.src; $('galImg').alt = ph.alt; $('galCap').textContent = ph.cap;
    thumbBtns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
  }

  /* ---------- M2 checklist (this browser only) ---------- */
  let done = store.get('bp-m2-done', []);
  $('doneTotal').textContent = S.m2Checklist.length;
  S.m2Checklist.forEach((t, i) => {
    const lab = el('label');
    const cb = el('input', { type: 'checkbox' });
    cb.checked = done.indexOf(i) >= 0;
    cb.addEventListener('change', () => {
      done = cb.checked ? done.concat([i]) : done.filter((x) => x !== i);
      store.set('bp-m2-done', done); progress();
    });
    lab.appendChild(cb); lab.appendChild(el('span', null, t));
    $('checklist').appendChild(lab);
  });
  function progress() {
    $('doneCount').textContent = done.length;
    $('doneBar').style.width = (done.length / S.m2Checklist.length * 100) + '%';
  }

  /* ---------- start ---------- */
  const urlLayout = new URLSearchParams(location.search).get('layout');
  route();
  /* C · split is the site layout; ?layout=shell or ?layout=sheet still previews the others */
  setLayout(urlLayout || 'split');
  setStep(curStep);
  selectPart('B', 'init');
  tune();
  pickPt(2);
  showPhoto(0);
  progress();
})();
