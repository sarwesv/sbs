# SBS Flight Simulator

A mobile-web VR flight simulator for cardboard-style headsets: hand-tracking
throttle/stick via phone camera, stereo rendering, head tracking, real-world
terrain and imagery (Cesium ion), and multiple selectable aircraft.

Runs entirely client-side as a static site — open `index.html` (or serve the
repo root) on a phone browser, tap "Start Flying", and drop the phone into a
cardboard viewer.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo's Settings → Pages, set the source to the `main` branch, root
   folder.
3. Once the `*.github.io` URL is live, go to the
   [Cesium ion access tokens page](https://ion.cesium.com/tokens) and
   restrict the token in `js/config.js` to that URL — it's a public,
   client-visible token embedded in a static site, so scoping by referrer is
   the only protection available for it.

## Layout

- `index.html`, `style.css`, `js/` — the current simulator.
- `archive/` — earlier standalone prototypes (a stereo-Cesium performance
  spike and a hand-tracking input spike) kept for reference; not part of the
  deployed app.

## Controls

Keyboard fallback: W/S throttle, arrow keys pitch/roll, A/D yaw, R to reset
after a crash. Drag the screen to look around if device orientation isn't
available.
