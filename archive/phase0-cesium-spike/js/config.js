// Paste your Cesium ion access token below once you have it.
// Leave it empty for now — the spike falls back to token-free terrain/imagery
// so you can test stereo rendering performance before the real key exists.
const CONFIG = {
  ionToken: "",
  location: {
    // Golden Gate Bridge, San Francisco — arbitrary real-world test point.
    longitude: -122.4783,
    latitude: 37.8199,
    height: 400,
    heading: 0,
    pitch: -20,
  },
  eyeSeparationMeters: 0.065,
};
