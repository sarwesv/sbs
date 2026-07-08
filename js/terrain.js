// Real-world terrain, pulled straight into the existing Three.js scene via
// 3DTilesRendererJS instead of a second full Cesium engine — Phase 0 found
// running two complete Cesium Viewers side by side (for stereo) too
// expensive even on an M1, so a Three.js-native 3D Tiles renderer avoids
// paying that cost twice.
//
// Cesium World Terrain (ion asset 1) is a quantized-mesh elevation model.
// CesiumIonAuthPlugin auto-registers QuantizedMeshPlugin itself once it
// resolves the asset as "TERRAIN" type — that auto-registration path is
// deprecated (logs a console warning) but is what actually works; manually
// pre-registering QuantizedMeshPlugin here raced CesiumIonAuthPlugin's async
// endpoint resolution and crashed (rootURL wasn't set yet when the manual
// plugin fetched layer.json), so the deprecated default is used deliberately.
// ImageOverlayPlugin drapes Bing Maps Aerial imagery (ion asset 2, same
// choice as the Phase 0 spike) on top. ReorientationPlugin repositions and
// rotates the whole tileset so the given lat/lon/height lands at the local
// scene origin with +Y up, matching how the rest of this app treats +Y.
//
// Note: a "Cannot read properties of null (reading 'length')" TypeError
// still appears in the console from the imagery overlay's manifest parse
// (a code path distinct from the terrain layer.json, which parses fine —
// confirmed both terrain and imagery render correctly despite it). Left
// as-is rather than chased further since it isn't blocking anything visible.
import * as THREE from "three";
import { TilesRenderer } from "3d-tiles-renderer/three";
import {
  CesiumIonAuthPlugin,
  ImageOverlayPlugin,
  CesiumIonOverlay,
  ReorientationPlugin,
} from "3d-tiles-renderer/three/plugins";

export function createTerrain({ ionToken, latitudeDeg, longitudeDeg, heightMeters, renderer }) {
  const tiles = new TilesRenderer();

  tiles.registerPlugin(
    new CesiumIonAuthPlugin({
      apiToken: ionToken,
      assetId: "1",
      autoRefreshToken: true,
    })
  );
  tiles.registerPlugin(
    new ImageOverlayPlugin({
      renderer,
      overlays: [new CesiumIonOverlay({ assetId: "2", apiToken: ionToken })],
    })
  );
  tiles.registerPlugin(
    new ReorientationPlugin({
      lat: THREE.MathUtils.degToRad(latitudeDeg),
      lon: THREE.MathUtils.degToRad(longitudeDeg),
      height: heightMeters,
    })
  );

  return tiles;
}
