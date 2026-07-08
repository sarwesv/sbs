import * as THREE from "three";
import { Aircraft, AircraftConfig } from "./physics.js";
import { KeyboardControls } from "./controls.js";
import { LookControls } from "./look-controls.js";
import { createTerrain } from "./terrain.js";
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
const stereoCamera = new THREE.StereoCamera();
stereoCamera.eyeSep = EYE_SEPARATION_METERS;

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

window.addEventListener("resize", updateCameraAspect);
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

const config = new AircraftConfig();
const aircraft = new Aircraft(config, SPAWN_POSITION, SPAWN_HEADING);

const keyboardControls = new KeyboardControls();
let activeControls = keyboardControls;

const lookControls = new LookControls(renderer.domElement);

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
  if (!stereoEnabled) {
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.setScissorTest(false);
    renderer.render(scene, camera);
    return;
  }

  stereoCamera.update(camera);
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setScissorTest(true);

  renderer.setViewport(0, 0, width / 2, height);
  renderer.setScissor(0, 0, width / 2, height);
  renderer.render(scene, stereoCamera.cameraL);

  renderer.setViewport(width / 2, 0, width / 2, height);
  renderer.setScissor(width / 2, 0, width / 2, height);
  renderer.render(scene, stereoCamera.cameraR);
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
  updateHud(controlsState);

  if (tiles) {
    tiles.setCamera(camera);
    tiles.setResolutionFromRenderer(camera, renderer);
    camera.updateMatrixWorld();
    tiles.update();
  }

  renderFrame();
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

// Tutorial / start flow
const TUTORIAL_SEEN_KEY = "sbs_tutorial_seen";
const tutorialOverlay = document.getElementById("tutorial-overlay");
const startButton = document.getElementById("start-flying-button");
const recenterButton = document.getElementById("recenter-button");
const reopenTutorialButton = document.getElementById("reopen-tutorial-button");

if (localStorage.getItem(TUTORIAL_SEEN_KEY)) {
  document.getElementById("tutorial-body").classList.add("tutorial-body-returning");
}

async function startFlying() {
  startButton.disabled = true;

  // Device orientation permission (iOS 13+)
  const orientationGranted = await lookControls.enableDeviceOrientation();
  if (!orientationGranted) {
    // Fallback to drag-to-look
  }

  localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
  tutorialOverlay.classList.add("hidden");
  stereoEnabled = true;
  updateCameraAspect();
  flightStarted = true;
  lastFrameTime = performance.now();
}

startButton.addEventListener("click", startFlying);
recenterButton.addEventListener("click", () => lookControls.recenter());
reopenTutorialButton.addEventListener("click", () => {
  tutorialOverlay.classList.remove("hidden");
  startButton.disabled = false;
});
