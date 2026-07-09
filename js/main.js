import * as THREE from "three";
import { Aircraft, AircraftConfig } from "./physics.js";
import { KeyboardControls } from "./controls.js";
import { LookControls } from "./look-controls.js";
import { createTerrain } from "./terrain.js";
import { CockpitHUD } from "./cockpit-hud.js";
import { AIRCRAFT_MODELS, DEFAULT_AIRCRAFT } from "./aircraft-models.js";
import CONFIG from "./config.js";

// Flight sim: cockpit VR view, real-world terrain, multiple aircraft
const GROUND_HEIGHT = 0;
const SPAWN_POSITION = new THREE.Vector3(0, 0, 0); // Start at runway threshold
const SPAWN_HEADING = 0; // 0° = north
const EYE_SEPARATION_METERS = 0.064;
const COCKPIT_OFFSET_LOCAL = new THREE.Vector3(0, 1.1, -1.5);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 500, 4000);

const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 5000);

// Create left and right cameras for parallel stereo (no convergence)
const cameraL = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight / 2, 0.1, 5000);
const cameraR = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight / 2, 0.1, 5000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("scene-container").appendChild(renderer.domElement);

let stereoEnabled = false;

function updateCameraAspect() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = (stereoEnabled ? width / 2 : width) / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function handleResize() {
  updateCameraAspect();
  cockpitHUD.resize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", handleResize);
updateCameraAspect();

// Lighting
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(300, 400, 200);
scene.add(sun);

// Terrain: real world via Cesium ion, or flat fallback
let tiles = null;
if (!CONFIG.ionToken) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000),
    new THREE.MeshStandardMaterial({ color: 0x3a7d3a })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 1500),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(0, 0.01, 700);
  scene.add(runway);

  for (let i = 0; i < 15; i++) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 20),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.02, i * 100 + 20);
    scene.add(stripe);
  }
} else {
  tiles = createTerrain({
    ionToken: CONFIG.ionToken,
    latitudeDeg: CONFIG.location.latitudeDeg,
    longitudeDeg: CONFIG.location.longitudeDeg,
    heightMeters: CONFIG.location.heightMeters,
    renderer,
  });
  scene.add(tiles.group);
}

// Aircraft
function buildAircraftMesh() {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xd94f4f });
  const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x9a9a9a });

  const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.9, 6, 12), bodyMaterial);
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);

  const wings = new THREE.Mesh(new THREE.BoxGeometry(8, 0.15, 1.4), wingMaterial);
  wings.position.z = 0.3;
  group.add(wings);

  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.8), wingMaterial);
  tailWing.position.z = 2.8;
  group.add(tailWing);

  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 1), wingMaterial);
  tailFin.position.set(0, 0.6, 2.8);
  group.add(tailFin);

  return group;
}

const aircraftMesh = buildAircraftMesh();
aircraftMesh.visible = false; // cockpit view only
scene.add(aircraftMesh);

// Aircraft configuration and selection
let currentAircraftModel = DEFAULT_AIRCRAFT;
let config = new AircraftConfig();
Object.assign(config, AIRCRAFT_MODELS[currentAircraftModel]);
let aircraft = new Aircraft(config, SPAWN_POSITION, SPAWN_HEADING);

function switchAircraft(modelKey) {
  if (!AIRCRAFT_MODELS[modelKey]) return;
  currentAircraftModel = modelKey;
  config = new AircraftConfig();
  Object.assign(config, AIRCRAFT_MODELS[modelKey]);
  aircraft = new Aircraft(config, SPAWN_POSITION, SPAWN_HEADING);
  aircraftMesh.position.copy(aircraft.position);
  aircraftMesh.quaternion.copy(aircraft.orientation);
  console.log("Switched to:", AIRCRAFT_MODELS[modelKey].name);
}

const keyboardControls = new KeyboardControls();
let activeControls = keyboardControls;

const lookControls = new LookControls(renderer.domElement);

// Cockpit HUD with instruments
const sceneContainer = document.getElementById("scene-container");
const cockpitHUD = new CockpitHUD(sceneContainer, window.innerWidth, window.innerHeight);

function updateCockpitCamera() {
  const worldPosition = COCKPIT_OFFSET_LOCAL.clone()
    .applyQuaternion(aircraft.orientation)
    .add(aircraft.position);
  camera.position.copy(worldPosition);
  camera.quaternion.copy(aircraft.orientation).multiply(lookControls.headQuaternion);
}

const hud = {
  status: document.getElementById("status-value"),
  airspeed: document.getElementById("airspeed-value"),
  altitude: document.getElementById("altitude-value"),
  throttle: document.getElementById("throttle-value"),
  heading: document.getElementById("heading-value"),
  inputMode: document.getElementById("input-mode-value"),
};

function updateHud(controlsState) {
  const speedMs = aircraft.velocity.length();
  hud.airspeed.textContent = `${(speedMs * 1.94384).toFixed(0)} kt`;
  hud.altitude.textContent = `${aircraft.position.y.toFixed(0)} m`;
  hud.throttle.textContent = `${(controlsState.throttle * 100).toFixed(0)}%`;
  hud.inputMode.textContent = "keyboard";

  const euler = new THREE.Euler().setFromQuaternion(aircraft.orientation, "YXZ");
  const headingDeg = THREE.MathUtils.radToDeg(euler.y);
  hud.heading.textContent = `${((headingDeg + 360) % 360).toFixed(0)}°`;

  if (aircraft.crashed) {
    hud.status.textContent = "CRASHED — press R to reset";
  } else if (aircraft.onGround) {
    hud.status.textContent = "ON GROUND";
  } else {
    hud.status.textContent = "AIRBORNE";
  }
}

function renderFrame() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  if (!stereoEnabled) {
    renderer.setViewport(0, 0, width, height);
    renderer.setScissorTest(false);
    renderer.render(scene, camera);
    return;
  }

  console.log("STEREO RENDER:", stereoEnabled, flightStarted);

  // Sync left and right cameras with main camera (parallel projection, no convergence)
  const eyeSepHalf = EYE_SEPARATION_METERS / 2;
  const offset = new THREE.Vector3(eyeSepHalf, 0, 0).applyQuaternion(camera.quaternion);

  cameraL.fov = camera.fov;
  cameraL.position.copy(camera.position).sub(offset);
  cameraL.quaternion.copy(camera.quaternion);
  cameraL.aspect = (width / 2) / height;
  cameraL.near = camera.near;
  cameraL.far = camera.far;
  cameraL.updateProjectionMatrix();

  cameraR.fov = camera.fov;
  cameraR.position.copy(camera.position).add(offset);
  cameraR.quaternion.copy(camera.quaternion);
  cameraR.aspect = (width / 2) / height;
  cameraR.near = camera.near;
  cameraR.far = camera.far;
  cameraR.updateProjectionMatrix();

  renderer.setScissorTest(true);

  // Left eye
  renderer.setViewport(0, 0, width / 2, height);
  renderer.setScissor(0, 0, width / 2, height);
  renderer.render(scene, cameraL);

  // Right eye
  renderer.setViewport(width / 2, 0, width / 2, height);
  renderer.setScissor(width / 2, 0, width / 2, height);
  renderer.render(scene, cameraR);

  renderer.setScissorTest(false);
}

let flightStarted = false;
let lastFrameTime = performance.now();

function animate() {
  const now = performance.now();
  const rawDt = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  if (keyboardControls.consumeResetRequest()) {
    aircraft.reset(SPAWN_POSITION, SPAWN_HEADING);
  }

  const dt = flightStarted ? Math.min(rawDt, 0.1) : 0;
  const controlsState = activeControls.getState(dt);
  aircraft.update(dt, controlsState, GROUND_HEIGHT);

  aircraftMesh.position.copy(aircraft.position);
  aircraftMesh.quaternion.copy(aircraft.orientation);

  updateCockpitCamera();
  camera.updateMatrixWorld(); // Ensure main camera is updated for terrain
  updateHud(controlsState);

  // Calculate pitch and roll for cockpit HUD
  const euler = new THREE.Euler().setFromQuaternion(aircraft.orientation, "YXZ");
  const pitch = euler.x;
  const roll = euler.z;
  const headingDeg = THREE.MathUtils.radToDeg(euler.y);
  const speedMs = aircraft.velocity.length();
  const airspeedKt = speedMs * 1.94384;
  const altitudeM = aircraft.position.y;

  // Update cockpit HUD telemetry
  if (flightStarted && stereoEnabled) {
    cockpitHUD.updateTelemetry(airspeedKt, altitudeM, headingDeg, pitch, roll);
    cockpitHUD.render();
  }

  if (tiles) {
    // Use appropriate camera for terrain LOD based on stereo mode
    const terrainCamera = stereoEnabled ? cameraL : camera;
    tiles.setCamera(terrainCamera);
    tiles.setResolutionFromRenderer(terrainCamera, renderer);
    terrainCamera.updateMatrixWorld();
    tiles.update();
  }

  renderFrame();
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

// Fullscreen on landscape orientation
function handleOrientationChange() {
  const isLandscape = window.matchMedia("(orientation: landscape)").matches;
  const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;

  if (isLandscape && !isFullscreen) {
    // Request fullscreen when landscape
    const elem = document.documentElement;
    const requestFullscreen =
      elem.requestFullscreen ||
      elem.webkitRequestFullscreen ||
      elem.mozRequestFullScreen ||
      elem.msRequestFullscreen;

    if (requestFullscreen) {
      requestFullscreen.call(elem).catch((err) => {
        console.log("Fullscreen request denied:", err);
      });
    }
  } else if (!isLandscape && isFullscreen) {
    // Exit fullscreen when portrait
    const exitFullscreen =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.mozCancelFullScreen ||
      document.msExitFullscreen;

    if (exitFullscreen) {
      exitFullscreen.call(document);
    }
  }
}

window.addEventListener("orientationchange", handleOrientationChange);
window.addEventListener("resize", handleOrientationChange);

// Initial check
setTimeout(handleOrientationChange, 100);

// Tutorial / start flow
const TUTORIAL_SEEN_KEY = "sbs_tutorial_seen";
const tutorialOverlay = document.getElementById("tutorial-overlay");
const startButton = document.getElementById("start-flying-button");
const recenterButton = document.getElementById("recenter-button");
const reopenTutorialButton = document.getElementById("reopen-tutorial-button");

console.log("Tutorial elements found:", { tutorialOverlay, startButton, recenterButton, reopenTutorialButton });

if (localStorage.getItem(TUTORIAL_SEEN_KEY)) {
  const tutorialBody = document.getElementById("tutorial-body");
  if (tutorialBody) tutorialBody.classList.add("tutorial-body-returning");
}

async function startFlying() {
  console.log("START FLYING CLICKED");
  if (startButton) startButton.disabled = true;

  // Device orientation permission (iOS 13+)
  const orientationGranted = await lookControls.enableDeviceOrientation();
  if (!orientationGranted) {
    // Fallback to drag-to-look
  }

  localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
  if (tutorialOverlay) tutorialOverlay.classList.add("hidden");

  // Hide HTML HUD elements when stereo mode enabled (canvas HUD takes over)
  const hud = document.getElementById("hud");
  const controlsHelp = document.getElementById("controls-help");
  if (hud) hud.style.display = "none";
  if (controlsHelp) controlsHelp.style.display = "none";

  flightStarted = true;
  stereoEnabled = true;
  console.log("STEREO ENABLED:", stereoEnabled);
  updateCameraAspect();
  lastFrameTime = performance.now();
}

if (startButton) {
  console.log("Attaching click listener to Start Flying button");
  startButton.addEventListener("click", startFlying);
} else {
  console.error("Start Flying button not found!");
}

if (recenterButton) {
  recenterButton.addEventListener("click", () => lookControls.recenter());
} else {
  console.error("Recenter button not found!");
}

if (reopenTutorialButton) {
  reopenTutorialButton.addEventListener("click", () => {
    if (tutorialOverlay) tutorialOverlay.classList.remove("hidden");
    if (startButton) startButton.disabled = false;
  });
} else {
  console.error("Reopen tutorial button not found!");
}

// Aircraft selector UI
const aircraftButtonsContainer = document.getElementById("aircraft-buttons");
if (aircraftButtonsContainer) {
  Object.entries(AIRCRAFT_MODELS).forEach(([key, model]) => {
    const btn = document.createElement("button");
    btn.className = "aircraft-btn" + (key === DEFAULT_AIRCRAFT ? " active" : "");
    btn.textContent = model.name;
    btn.title = model.description;
    btn.addEventListener("click", () => {
      // Only allow switching when not flying
      if (!flightStarted) {
        switchAircraft(key);
        document.querySelectorAll(".aircraft-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      }
    });
    aircraftButtonsContainer.appendChild(btn);
  });
}
