import * as THREE from "three";
import { Aircraft, AircraftConfig } from "./physics.js";
import { KeyboardControls } from "./controls.js";
import { ChaseCamera } from "./chase-camera.js";
import { createTerrain } from "./terrain.js";
import CONFIG from "./config.js";

// Chase-camera desktop flight sim (not VR cockpit view)
const GROUND_HEIGHT = 0;
const SPAWN_POSITION = new THREE.Vector3(0, 0, 40);
const SPAWN_HEADING = 0;

// Inline aircraft definition for simplicity (catalog import was failing)
function buildSimplePlaneMesh() {
  const group = new THREE.Group();
  const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.9, 6, 12), new THREE.MeshStandardMaterial({ color: 0xd94f4f }));
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);
  const wings = new THREE.Mesh(new THREE.BoxGeometry(8, 0.15, 1.4), new THREE.MeshStandardMaterial({ color: 0x9a9a9a }));
  wings.position.z = 0.3;
  group.add(wings);
  return group;
}

const selectedAircraftConfig = new AircraftConfig();
const selectedAircraftName = "Cessna 172";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 500, 4000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("scene-container").appendChild(renderer.domElement);

function updateCameraAspect() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", updateCameraAspect);

// Lighting: cheap two-light setup, good enough until the polish pass.
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(300, 400, 200);
scene.add(sun);

// Flat placeholder ground/runway, used only when no Cesium ion token is
// configured (see config.js) — same offline-fallback pattern as the Phase 0
// spike. With a token, real terrain (below) replaces this entirely.
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

// Aircraft: now visible in chase view (external camera)
const aircraftMesh = buildSimplePlaneMesh();
aircraftMesh.visible = true;
scene.add(aircraftMesh);

const config = selectedAircraftConfig;
const aircraft = new Aircraft(config, SPAWN_POSITION, SPAWN_HEADING);

// Chase camera controller
const chaseCamera = new ChaseCamera(renderer.domElement, camera);

const keyboardControls = new KeyboardControls();
let activeControls = keyboardControls;

const hud = {
  status: document.getElementById("status-value"),
  airspeed: document.getElementById("airspeed-value"),
  altitude: document.getElementById("altitude-value"),
  throttle: document.getElementById("throttle-value"),
  heading: document.getElementById("heading-value"),
  inputMode: document.getElementById("input-mode-value"),
  aircraft: document.getElementById("aircraft-value"),
};

function updateHud(controlsState) {
  const speedMs = aircraft.velocity.length();
  hud.airspeed.textContent = `${(speedMs * 1.94384).toFixed(0)} kt`;
  hud.altitude.textContent = `${aircraft.position.y.toFixed(0)} m`;
  hud.throttle.textContent = `${(controlsState.throttle * 100).toFixed(0)}%`;
  hud.aircraft.textContent = selectedAircraftName;
  hud.inputMode.textContent = "keyboard";

  const euler = new THREE.Euler().setFromQuaternion(aircraft.orientation, "YXZ");
  const headingDeg = THREE.MathUtils.radToDeg(euler.y);
  hud.heading.textContent = `${((headingDeg + 360) % 360).toFixed(0)}°`;

  // Chase view: no crash detection (safe for free-flying)
  if (aircraft.onGround) {
    hud.status.textContent = "ON GROUND";
  } else {
    hud.status.textContent = "AIRBORNE";
  }
}

function renderFrame() {
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissorTest(false);
  renderer.render(scene, camera);
}

let flightStarted = true; // chase view starts flying immediately
let lastFrameTime = performance.now();

function animate() {
  const now = performance.now();
  const rawDt = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  if (keyboardControls.consumeResetRequest()) {
    aircraft.reset(SPAWN_POSITION, SPAWN_HEADING);
  }

  const dt = flightStarted ? Math.min(rawDt, 0.1) : 0; // clamp to avoid huge steps after a tab is backgrounded
  const controlsState = activeControls.getState(dt);
  aircraft.update(dt, controlsState, GROUND_HEIGHT);

  aircraftMesh.position.copy(aircraft.position);
  aircraftMesh.quaternion.copy(aircraft.orientation);

  // Update chase camera to follow aircraft
  chaseCamera.update(aircraft.position, aircraft.orientation);

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

// Start flying immediately in chase view (no VR tutorial)
let flightStarted = true;
let lastFrameTime = performance.now();
requestAnimationFrame(animate);
