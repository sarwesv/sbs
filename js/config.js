// Cesium ion access token for real-world terrain (Phase 4). Restrict this
// token by URL/referrer in the ion dashboard once it's live on GitHub Pages —
// client-side tokens on a static site can't be kept secret, only scoped.
// Leave ionToken empty to fall back to the flat placeholder ground used in
// Phases 2-3, same pattern as the Phase 0 spike's offline fallback.
const CONFIG = {
  ionToken:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3NmE4NDFlZC1hNTNmLTQzNWItYTk2MC0zNWVmZDNmMjI2NWMiLCJpZCI6NDU0MDIxLCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODM1Mjg5NzB9.2BqBD8ZIsFSMfZSH4RoTfOdpweVHvht60HPvKqDCzdY",
  // SFO runway 28L threshold — real, near-sea-level, so the flight model's
  // flat y=0 ground plane roughly matches the real terrain's elevation here.
  location: {
    latitudeDeg: 37.6188,
    longitudeDeg: -122.3754,
    heightMeters: 4,
  },
};

export default CONFIG;
