# SBS Flight Simulator

Mobile web VR flight simulator for cardboard-style headsets.

- **Stereo 3D rendering** — dual-eye view (50% viewport each) for cardboard headsets
- **Head tracking** — device orientation (iOS/Android) + drag-to-look fallback
- **Real-world terrain** — SFO runway (Cesium World Terrain + Bing aerial imagery via Cesium ion)
- **Realistic flight physics** — lift/drag/stall modeling, safe landing detection
- **Runway start** — spawn directly at SFO runway 28L threshold
- **Static site** — runs entirely client-side, deploy to GitHub Pages

## Quick Start

### Local Testing
```bash
python3 -m http.server 4507
# Then open http://localhost:4507 on your phone
# or in a Cardboard viewer app
```

### Controls
- **W/S** — throttle up/down
- **Arrow keys** — pitch/roll
- **A/D** — yaw left/right
- **R** — reset after crash
- **Drag screen** — look around (if head tracking unavailable)
- **Recenter view** button — reset head tracking origin

## Deploy to GitHub Pages

1. Push this repo to GitHub
2. Settings → Pages → Source = `main` branch, root folder
3. Once live at `yourname.github.io/sbs`, restrict the Cesium ion token:
   - Go to https://ion.cesium.com/tokens
   - Find the token in `js/config.js`
   - Add your GitHub Pages domain to the allowed referrers
   - This prevents token abuse from other sites

## Architecture

- `index.html` — VR UI, tutorial overlay
- `style.css` — HUD styling
- `js/main.js` — flight loop, stereo rendering, input handling
- `js/physics.js` — aircraft flight model (mass, thrust, lift/drag curves)
- `js/controls.js` — keyboard input
- `js/look-controls.js` — head tracking & drag-to-look
- `js/hand-tracking-controls.js` — MediaPipe hand tracking (fallback, not used in main flow)
- `js/terrain.js` — Cesium ion terrain/imagery loading via 3D Tiles
- `js/config.js` — location & Cesium token (update for your deployment)
- `archive/` — Phase 0 & 1 prototypes (reference only)
