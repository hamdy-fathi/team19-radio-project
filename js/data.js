/* All site content lives here. Edit text and numbers in this file only.
   Numbers are plain numbers (no quotes). Units live in separate fields. */
window.SITE = {
  team: 'Team 19',
  members: ['Hamdy Ahmed', 'Mohamed Abdelrazek', 'David Amir'],
  course: 'ELEG103 · SBME · Fall 2026',

  /* Coil + tank values used by the calculator and the 3D model */
  coil: { turns: 75, diameterMm: 60, windingMm: 29, wireMm: 0.3, loopTurns: 5 },
  predicted: { L_uH: 291.4, c819_pF: 129.5, bandLow_kHz: 557.8, bandHigh_kHz: 2080, rc_us: 49.5 },
  capRange_pF: [20, 280],
  stray_pF: 180, /* breadboard, wiring and probe capacitance across the tank */
  measured: { bandLow_kHz: 393.1, bandHigh_kHz: 600.2, f0_kHz: 504.3, fLow_kHz: 488.1, fHigh_kHz: 538.4, Q: 10.005 },
  detector: { R_kOhm: 15, C_nF: 3.3, diode: '1N60P' },

  /* Table 6: source (V), TP1 peak (mV), TP3 DC (mV) */
  detectorPoints: [
    { source: 0.05, tp1: 14.45, tp3: 0 },
    { source: 0.1, tp1: 29.69, tp3: 1.9 },
    { source: 0.2, tp1: 59.4, tp3: 12.4 },
    { source: 0.3, tp1: 89.1, tp3: 25.8 },
    { source: 0.5, tp1: 148.4, tp3: 62.5 },
    { source: 1, tp1: 296.9, tp3: 168 }
  ],

  photos: {
    setup: { src: 'assets/photos/setup.jpg', alt: 'Copper coil on a white PVC pipe between two breadboards, with the tuning capacitor and oscilloscope probes.', cap: 'FIG. 1 · Full bench, coil at centre.' },
    scope: { src: 'assets/photos/lower-limit.png', alt: 'Oscilloscope screen showing a sine wave, 942.1 kHz and 1.836 V peak to peak.', cap: 'FIG. 2 · Earlier scope capture, 942.1 kHz, 1.836 Vpp, before the final tank readings.' }
  },

  /* Schematic callouts. key = letter shown on the schematic and in 3D. */
  parts: [
    { key: 'A', name: 'Test loop', spec: '5 turns on the same Ø60 mm pipe · driven by the function generator',
      role: 'Stands in for a broadcast station. Its field couples into the 75-turn coil by mutual inductance (M), so the tank can be tested without an antenna.',
      reading: 'TP1 peak is a steady 0.3× the source amplitude (29.7 mV at 0.1 V, 297 mV at 1 V). The five-turn loop couples only part of the generator signal into the tank.' },
    { key: 'B', name: 'Tank coil', spec: '75 T · 0.3 mm enamelled Cu · Ø60 mm · 29 mm winding · L = 291.4 µH',
      role: 'With the capacitor, sets the resonant frequency f₀ = 1/(2π√LC). About 14.1 m of wire.',
      reading: 'With 291.4 µH, 150 pF alone would resonate near 760 kHz. The measured f₀ of 504.3 kHz needs ≈ 342 pF in total, so about 180 pF of stray capacitance (breadboard, wiring, probe) sits across the tank.' },
    { key: 'C', name: 'Tuning capacitor', spec: '20–280 pF air-variable · AM section across the coil',
      role: 'Turning the shaft changes C and moves the resonant peak across the band.',
      reading: 'The measured band of 393.1–600.2 kHz means the tank saw a 2.33 : 1 capacitance change, not 14 : 1. About 180 pF of stray capacitance in parallel squeezes the ratio to (280+180)/(20+180) ≈ 2.3.' },
    { key: 'D', name: 'Detector diode', spec: '1N60P germanium · band toward TP3',
      role: 'Conducts only near positive peaks, charging the RC so that TP3 follows the envelope.',
      reading: 'Efficiency TP3/TP1 rises from 0 % at 14 mV to 57 % at 297 mV. Below about 30 mV the germanium diode barely conducts, so weak stations are lost.' },
    { key: 'E', name: 'RC load', spec: '15 kΩ ∥ 3.3 nF · τ = 49.5 µs',
      role: 'The capacitor holds each peak; the resistor lets it decay so the output can follow a changing envelope.',
      reading: 'τ is 50× one 1 MHz carrier cycle and 4× shorter than a 5 kHz audio cycle, so it sits in the right window. It also loads the tank, which lowers Q.' }
  ],

  /* Assembly steps. The 3D model shows the build state for each step. */
  steps: [
    { short: 'Wind the coil', title: 'Wind the coil', photo: 'setup',
      text: '75 turns of 0.3 mm enamelled copper on a Ø60 mm PVC pipe, about 14.1 m of wire across a 29 mm winding. About 1 cm of enamel scraped off each end.',
      note: 'Wound a few turns at a time and taped them, which kept the winding close.' },
    { short: 'Mount the capacitor', title: 'Mount the tuning capacitor', photo: 'setup',
      text: 'The 20–280 pF capacitor sits on the tuner breadboard, with its AM section wired across the coil.',
      note: 'The pinout guide identified the AM terminals.' },
    { short: 'Build the detector', title: 'Build the detector', photo: 'setup',
      text: '1N60P from TP1 to TP3, band toward TP3. 15 kΩ ∥ 3.3 nF from TP3 to ground: τ = 49.5 µs.',
      note: 'The diode charges C at each peak; R controls how fast it falls.' },
    { short: 'Generator + test loop', title: 'Add the generator and test loop', photo: 'setup',
      text: 'A five-turn loop wound on the same pipe carries the function generator’s signal into the tank by mutual inductance.',
      note: 'Compensate the probe first. A ×1 probe adds about 100 pF across the tank.' },
    { short: 'Probe and record', title: 'Probe TP1 and TP3, record', photo: 'setup',
      text: 'TP1 goes to the scope (×10 probe and ×10 channel), TP3 to the multimeter. f₀ = 504.3 kHz at half travel, stops at 393.1 kHz and 600.2 kHz.',
      note: 'Tank driven by the test loop. Q = 10.005 from the 488.1 and 538.4 kHz half-power points.' }
  ],

  problems: [
    { issue: 'Generator couldn’t reach the band', cause: 'Limited frequency range', fix: 'Switched to a wider-range function generator' },
    { issue: 'Gaps and crossings while winding', cause: 'Hard to keep turns tight', fix: 'A few turns at a time, taped between' },
    { issue: 'Probe shifts resonance', cause: '×1 probe adds ~100 pF', fix: 'Compensated probe, ×10 on probe and channel' },
    { issue: 'Unknown capacitor terminals', cause: 'Several sections and pins', fix: 'Followed the variable-capacitor pinout guide' }
  ],

  m2Checklist: [
    'Predict both bias points by hand; simulate DC and AC (300 kHz–3 MHz) in Qucs-S.',
    'Lay out: IN and pot, Q1, Q2, detector, OUT. Q1 base ≥ 10 rows from Q2 collector.',
    'Protected supply: 3 × AA → 1N5819 → 220 Ω; 10 µF + 100 nF bypass.',
    'Stage 1: 1 kΩ pot → 10 nF → Q1; 2 kΩ load, 100 kΩ feedback.',
    'Stage 2: 10 nF → Q2, same values; collector = TP2.',
    'Detector: 1N4148 TP2 → TP3; 15 kΩ ∥ 3.3 nF; OUT via 1 µF.',
    'Bench test via the 10 kΩ / 10 Ω divider: bias, current, oscillation, gain.',
    'Detection and clipping at 1 MHz, six source amplitudes.',
    'Remove M1’s detector; wind the six-turn link to IN.',
    'Coupled-loop distance test at 0.1 V.'
  ]
};
