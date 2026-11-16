/* All site content lives here. Edit text and numbers in this file only.
   Numbers are plain numbers (no quotes). Units live in separate fields. */
window.SITE = {
  team: 'Team 19',
  members: ['Hamdy Ahmed', 'Mohamed Abdelrazek', 'David Amir'],
  course: 'ELEG103 · SBME · Fall 2026',

  /* Coil + tank values used by the calculator and the 3D model */
  coil: { turns: 75, diameterMm: 60, windingMm: 29, wireMm: 0.3, loopTurns: 5 },
  predicted: { L_uH: 249.43, c819_pF: 151.4, bandLow_kHz: 602.24, bandHigh_kHz: 2253, rc_us: 49.5 },
  capRange_pF: [20, 280],
  measured: { bandLow_kHz: 965.5, bandHigh_kHz: 1119, f0_kHz: 1065, fLow_kHz: 956.3, fHigh_kHz: 1194 },
  detector: { R_kOhm: 15, C_nF: 3.3, diode: '1N60P' },

  /* Table 6: source (V), TP1 peak (mV), TP3 DC (mV) */
  detectorPoints: [
    { source: 0.05, tp1: 44.53, tp3: 11.72 },
    { source: 0.0996, tp1: 109.4, tp3: 60.55 },
    { source: 0.203, tp1: 250, tp3: 158.2 },
    { source: 0.304, tp1: 382.8, tp3: 257.8 },
    { source: 0.5, tp1: 656.3, tp3: 430.1 },
    { source: 1.035, tp1: 1348, tp3: 851.9 }
  ],

  photos: {
    setup: { src: 'assets/photos/setup.jpg', alt: 'Copper coil on a white PVC pipe between two breadboards, with the tuning capacitor and oscilloscope probes.', cap: 'FIG. 1 · Full bench, coil at centre.' },
    scope: { src: 'assets/photos/lower-limit.png', alt: 'Oscilloscope screen showing a sine wave, 942.1 kHz and 1.836 V peak to peak.', cap: 'FIG. 2 · 942.1 kHz, 1.836 Vpp near the lower stop.' }
  },

  /* Schematic callouts. key = letter shown on the schematic and in 3D. */
  parts: [
    { key: 'A', name: 'Test loop', spec: '5 turns on the same Ø60 mm pipe · driven by the function generator',
      role: 'Stands in for a broadcast station. Its field couples into the 75-turn coil by mutual inductance (M), so the tank can be tested without an antenna.',
      reading: 'TP1 peak is about 1.2–1.3× the source amplitude above 0.2 V, falling to 0.9× at 50 mV.' },
    { key: 'B', name: 'Tank coil', spec: '75 T · 0.3 mm enamelled Cu · Ø60 mm · 29 mm winding · L(pred) = 249.43 µH',
      role: 'With the capacitor, sets the resonant frequency f₀ = 1/(2π√LC). About 14.1 m of wire.',
      reading: 'L was never measured directly. At half travel the measured 1065 kHz implies either less L or less C than assumed. With 249.43 µH it needs ≈ 89.5 pF.' },
    { key: 'C', name: 'Tuning capacitor', spec: '20–280 pF air-variable · AM section across the coil',
      role: 'Turning the shaft changes C and moves the resonant peak across the band.',
      reading: 'The measured band of 965.5–1119 kHz means the tank saw only a 1.34 : 1 capacitance change, not 14 : 1. Check the section wiring and the shaft travel.' },
    { key: 'D', name: 'Detector diode', spec: '1N60P germanium · band toward TP3',
      role: 'Conducts only near positive peaks, charging the RC so that TP3 follows the envelope.',
      reading: 'Efficiency TP3/TP1 falls from 63–67 % to 26 % at 44.5 mV. The forward drop matters most for weak stations.' },
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
    { short: 'Probe and record', title: 'Probe TP1 and TP3, record', photo: 'scope',
      text: 'TP1 goes to the scope (×10 probe and ×10 channel), TP3 to the multimeter. f₀ = 1065 kHz at half travel, stops at 965.5 kHz and 1.119 MHz.',
      note: 'Scope near the lower stop: 942.1 kHz, 1.836 Vpp, about 2.4 % below the recorded 965.5 kHz.' }
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
