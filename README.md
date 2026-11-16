# Team 19 · Medium-Wave AM Receiver

Build log for our AM radio, made for **ELEG103 Analog and Digital Electronics**, SBME Department, Fall 2026.

**Team 19:** Hamdy Ahmed · Mohamed Abdelrazek · David Amir

The site is laid out as a blueprint drawing set, one sheet per milestone:

| Sheet | Milestone | Status |
|---|---|---|
| 1 | **M1 · Tuner & envelope detector:** hand-wound coil, tuning capacitor, diode detector | Signed off |
| 2 | **M2 · Two-stage RF amplifier:** two 2N3904 stages, 1N4148 detector, six-turn link | Planned |
| 3 | **M3 · Audio stage** | Not started |

## What's on the page

- **Interactive 3D assembly.** Our own WebGL model, drawn as a blueprint wireframe. Each build step adds its parts. **Replay** builds the whole radio step by step, and **Exploded** pulls the parts apart.
- **Schematic with callouts A–E.** Clicking a letter on the schematic, on the 3D model or in the callout panel shows that part's role and what its reading tells us.
- **Readings.** Predicted against measured values, with the percentage error worked out automatically.
- **Analysis.** A tuning-range calculator you can drag, the selectivity (Q) curve, a clickable detector-transfer chart, and the detector time constant.
- **Issue log and photographs.**

## Run it

No install and no build step. Open `index.html` in a browser.

To serve it over HTTP instead (some browsers limit `file://` pages), use either:

```sh
npx serve .
# or, with Python 3
py -3 -m http.server 8000
```

then open the address it prints.

## Publish on GitHub Pages

1. Push this folder to the root of a GitHub repository.
2. Go to **Settings → Pages → Deploy from a branch → main → / (root)**.
3. Open the URL GitHub shows. Direct links such as `…/#m2` open a specific sheet.

## Files

```text
index.html            page structure (M1, M2, M3 sheets)
css/blueprint.css     blueprint look and the split-screen layout
js/data.js            ALL content: team, readings, steps, callouts, photos, M2 checklist
js/viewer3d.js        3D assembly model (procedural geometry, plain WebGL)
js/app.js             connects schematic, 3D, steps, calculator, charts and gallery
assets/photos/        bench and oscilloscope photos, LAB3 figure
assets/docs/          LAB2, LAB3 and the variable-capacitor pinout
```

## Editing

Almost everything is edited in **`js/data.js`**:

- `predicted`, `measured` and `detectorPoints` feed the readings table, the calculator and the detector chart.
- `coil` (diameter, winding width, turns) also sizes the 3D model.
- `steps` lists the build steps. Each one matches a build state in the 3D model (`from` / `until` on each part in `js/viewer3d.js`).
- `parts` holds the callout text, and `problems` the issue log.

The written analysis notes in `index.html` (Notes 1–4) quote specific numbers. Update them by hand if the readings change.

After editing CSS or JS, raise the `?v=` number on the `<link>` and `<script>` tags in `index.html` so browsers load the new files.

## Layout

The desktop page fits one screen. The 3D model is fixed on the left, with tabs on the right (Build, Schematic, Readings, Analysis, Issues, Photos). Below 1100 px wide or 600 px tall, the page stacks into one scrolling column for phones and tablets.

Two alternative layouts are kept for comparison: add `?layout=shell` or `?layout=sheet` to the URL.

## 3D controls

Drag to rotate, scroll to zoom, click a lettered tag to select that part. With the model focused: arrow keys rotate, + / − zoom, Home resets. Browsers without WebGL show a bench photo instead. With reduced motion turned on, parts appear without animation.

## Before final submission

- [ ] Replace the readings in `js/data.js` with **our** measured Table 4–6 values, and update Notes 1–4 to match.
- [ ] Replace the photos in `assets/photos/` with our own bench photos, ideally one per build step.
- [ ] Check the coil dimensions in `coil` against our actual coil.
- [ ] Add our M2 results once the amplifier is built.
