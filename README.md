# Drift & Drive — 3D Driving Simulator

A browser-based 3D driving simulator built with plain JS + [Three.js](https://threejs.org)
(loaded from a CDN — no build step, no bundler, no npm install required).

## Run it locally
Just serve the folder over HTTP (can't open `index.html` directly via `file://`
because it uses ES modules):

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed localhost URL.

## Controls
| Key | Action |
|---|---|
| ↑ / W | Accelerator |
| ↓ / S | Brake |
| ← → / A D | Steer |
| 1–6 | Shift to gear 1–6 |
| R | Reverse gear |
| 0 / N | Neutral |
| Space | Handbrake |

## File structure
```
index.html        HUD markup, fonts, three.js import map
style.css         HUD / start-screen styling
js/car.js         Physics: engine RPM, torque curve, gears, steering
js/controls.js    Keyboard input + gear-shift key handling
js/environment.js Ground, road, scenery, procedural car mesh
js/audio.js       Synthesized engine sound (Web Audio, no files)
js/main.js        Scene setup, camera, render loop, HUD wiring
```

## Deployment (Vercel)
No config needed — it's a static site.

1. Install the CLI once: `npm i -g vercel`
2. From this folder, run: `vercel`
3. Follow the prompts (link/create a project), then `vercel --prod` to ship it.

Or without the CLI: push this folder to a GitHub repo, go to vercel.com →
**Add New Project** → import the repo → leave build settings blank (no
framework, no build command) → Deploy.
