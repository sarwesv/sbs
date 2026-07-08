// Phase 0 spike: render one real-world location as two side-by-side Cesium
// viewports (stereo pair) to find out whether a phone can handle rendering
// the scene twice at once before we build anything else on top of it.
//
// Left viewport is the one you actually control (drag to look around).
// Right viewport just mirrors the left camera every frame, offset sideways
// by an eye-separation distance, so the pair reads as stereo through a
// cardboard-style viewer.

async function buildViewerOptions() {
  const options = {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    creditContainer: document.createElement("div"), // required by Viewer, kept off-screen
  };

  if (CONFIG.ionToken) {
    Cesium.Ion.defaultAccessToken = CONFIG.ionToken;
    options.terrain = Cesium.Terrain.fromWorldTerrain();
    options.baseLayer = Cesium.ImageryLayer.fromProviderAsync(
      Cesium.IonImageryProvider.fromAssetId(2) // Bing Maps Aerial
    );
  } else {
    // No ion token yet: use CesiumJS's bundled offline imagery so the
    // rendering-performance question can still be answered today.
    options.baseLayer = Cesium.ImageryLayer.fromProviderAsync(
      Cesium.TileMapServiceImageryProvider.fromUrl(
        Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")
      )
    );
  }

  return options;
}

function syncRightCameraToLeft(leftViewer, rightViewer) {
  const leftCamera = leftViewer.camera;
  const rightOffset = Cesium.Cartesian3.multiplyByScalar(
    leftCamera.right,
    CONFIG.eyeSeparationMeters,
    new Cesium.Cartesian3()
  );
  const rightPosition = Cesium.Cartesian3.add(
    leftCamera.positionWC,
    rightOffset,
    new Cesium.Cartesian3()
  );

  rightViewer.camera.setView({
    destination: rightPosition,
    orientation: {
      heading: leftCamera.heading,
      pitch: leftCamera.pitch,
      roll: leftCamera.roll,
    },
  });
}

function startFpsCounter() {
  const fpsLabel = document.getElementById("fps");
  let frameCount = 0;
  let lastSampleTime = performance.now();

  function tick() {
    frameCount++;
    const now = performance.now();
    const elapsed = now - lastSampleTime;
    if (elapsed >= 500) {
      const fps = (frameCount * 1000) / elapsed;
      fpsLabel.textContent = `${fps.toFixed(0)} fps`;
      frameCount = 0;
      lastSampleTime = now;
    }
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

async function init() {
  const options = await buildViewerOptions();

  const leftViewer = new Cesium.Viewer("left", options);
  const rightViewer = new Cesium.Viewer("right", { ...options });

  // The right viewport never takes direct input; it only ever mirrors
  // whatever the left camera is doing, offset sideways for parallax.
  rightViewer.scene.screenSpaceCameraController.enableInputs = false;

  const { longitude, latitude, height, heading, pitch } = CONFIG.location;
  const initialView = {
    destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
    orientation: {
      heading: Cesium.Math.toRadians(heading),
      pitch: Cesium.Math.toRadians(pitch),
      roll: 0,
    },
  };
  leftViewer.camera.setView(initialView);
  rightViewer.camera.setView(initialView);

  leftViewer.scene.postRender.addEventListener(() => {
    syncRightCameraToLeft(leftViewer, rightViewer);
  });

  startFpsCounter();
}

init();
