import * as THREE from "three";
import { RealisticAircraft, FlightPhysicsConfig } from "./flight-physics.js";
import { KeyboardControls } from "./controls.js";
import { LookControls } from "./look-controls.js";
import { createTerrain } from "./terrain.js";
import { RealisticHUD } from "./realistic-hud.js";
import { Autopilot } from "./autopilot.js";
import { AIRCRAFT_MODELS, DEFAULT_AIRCRAFT } from "./aircraft-models.js";
import { FLYING_LOCATIONS, DEFAULT_LOCATION } from "./locations.js";
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

// Location management
let currentLocation = DEFAULT_LOCATION;
let terrainLocation = FLYING_LOCATIONS[DEFAULT_LOCATION];

function switchLocation(locationKey) {
  if (!FLYING_LOCATIONS[locationKey]) return;
  currentLocation = locationKey;
  terrainLocation = FLYING_LOCATIONS[locationKey];

  // Update spawn position
  SPAWN_POSITION.set(0, 0, 0);
  aircraft.reset(SPAWN_POSITION, SPAWN_HEADING);

  // Reload terrain at new location
  if (tiles) {
    scene.remove(tiles.group);
    tiles = null;
  }

  if (CONFIG.ionToken) {
    tiles = createTerrain({
      ionToken: CONFIG.ionToken,
      latitudeDeg: terrainLocation.latitude,
      longitudeDeg: terrainLocation.longitude,
      heightMeters: terrainLocation.height,
      renderer,
    });
    scene.add(tiles.group);
  }

  console.log("Switched to location:", FLYING_LOCATIONS[locationKey].name);
}

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
    latitudeDeg: terrainLocation.latitude,
    longitudeDeg: terrainLocation.longitude,
    heightMeters: terrainLocation.height,
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
aircraftMesh.visible = true; // visible in external views
scene.add(aircraftMesh);

// Aircraft configuration and selection
let currentAircraftModel = DEFAULT_AIRCRAFT;
let config = new FlightPhysicsConfig();
Object.assign(config, AIRCRAFT_MODELS[currentAircraftModel]);
let aircraft = new RealisticAircraft(config, SPAWN_POSITION, SPAWN_HEADING);

function switchAircraft(modelKey) {
  if (!AIRCRAFT_MODELS[modelKey]) return;
  currentAircraftModel = modelKey;
  config = new FlightPhysicsConfig();
  Object.assign(config, AIRCRAFT_MODELS[modelKey]);
  aircraft = new RealisticAircraft(config, SPAWN_POSITION, SPAWN_HEADING);
  aircraftMesh.position.copy(aircraft.position);
  aircraftMesh.quaternion.copy(aircraft.orientation);
  console.log("Switched to:", AIRCRAFT_MODELS[modelKey].name);
}

const keyboardControls = new KeyboardControls();
let activeControls = keyboardControls;

const lookControls = new LookControls(renderer.domElement);

// Autopilot system
const autopilot = new Autopilot();

// Realistic HUD with analog instruments
const sceneContainer = document.getElementById("scene-container");
const cockpitHUD = new RealisticHUD(sceneContainer, window.innerWidth, window.innerHeight);

// Camera view modes
const CAMERA_MODES = {
  topdown: { name: "Top-Down", offset: new THREE.Vector3(0, 30, 35) },
  chase: { name: "Chase Cam", offset: new THREE.Vector3(0, 5, 15) },
  follow: { name: "Follow Cam", offset: new THREE.Vector3(0, 8, 25) },
  cockpit: { name: "Cockpit", offset: new THREE.Vector3(0, 1.1, -1.5) },
  external: { name: "External", offset: new THREE.Vector3(0, 3, 8) },
  fixed: { name: "Fixed", offset: new THREE.Vector3(0, 2, 5) }
};

let currentCameraMode = "topdown";

function updateCameraMode() {
  const mode = CAMERA_MODES[currentCameraMode];
  const offset = mode.offset.clone().applyQuaternion(aircraft.orientation);
  camera.position.copy(aircraft.position).add(offset);
  camera.quaternion.copy(aircraft.orientation);
}

function updateCockpitCamera() {
  if (currentCameraMode === "cockpit") {
    // Cockpit mode includes head tracking
    const worldPosition = COCKPIT_OFFSET_LOCAL.clone()
      .applyQuaternion(aircraft.orientation)
      .add(aircraft.position);
    camera.position.copy(worldPosition);
    camera.quaternion.copy(aircraft.orientation).multiply(lookControls.headQuaternion);
  } else {
    // Other modes: fixed offset, no head tracking
    updateCameraMode();
  }
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

  const dt = flightStarted ? Math.min(rawDt, 0.05) : 0;
  let controlsState = activeControls.getState(dt);

  // Apply autopilot controls if enabled
  if (autopilot.enabled) {
    const apControls = autopilot.calculateControls(aircraft);
    // Blend autopilot with manual controls (autopilot takes priority)
    controlsState = {
      throttle: apControls.throttle,
      pitch: apControls.pitch,
      roll: apControls.roll,
      yaw: apControls.yaw
    };
  }

  aircraft.updatePhysics(dt, controlsState, GROUND_HEIGHT);

  aircraftMesh.position.copy(aircraft.position);
  aircraftMesh.quaternion.copy(aircraft.orientation);

  // Hide aircraft mesh in cockpit view, show in all other views
  aircraftMesh.visible = currentCameraMode !== "cockpit";

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

  // Lock aircraft and location selection once flight starts
  document.querySelectorAll(".aircraft-btn").forEach(b => b.style.pointerEvents = "none");
  document.querySelectorAll(".location-btn").forEach(b => b.style.pointerEvents = "none");
  const searchInput = document.getElementById("location-search");
  if (searchInput) searchInput.style.pointerEvents = "none";

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
console.log("=== AIRCRAFT SELECTOR ===");
console.log("Container found:", !!aircraftButtonsContainer);
console.log("AIRCRAFT_MODELS available:", !!AIRCRAFT_MODELS, Object.keys(AIRCRAFT_MODELS).length);

if (aircraftButtonsContainer) {
  let buttonCount = 0;
  Object.entries(AIRCRAFT_MODELS).forEach(([key, model]) => {
    const btn = document.createElement("button");
    btn.className = "aircraft-btn" + (key === DEFAULT_AIRCRAFT ? " active" : "");
    btn.textContent = model.name;
    btn.title = model.description;
    btn.style.pointerEvents = "auto";
    btn.style.cursor = "pointer";
    btn.onclick = function(e) {
      console.log("🎯 AIRCRAFT BUTTON CLICK EVENT FIRED:", key);
      if (!flightStarted) {
        console.log("✈️ Switching aircraft to:", model.name);
        switchAircraft(key);
        document.querySelectorAll(".aircraft-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      } else {
        console.log("❌ Cannot switch - flight started");
      }
    };
    aircraftButtonsContainer.appendChild(btn);
    buttonCount++;
    console.log(`✓ Aircraft button created: ${model.name}`);
  });
  console.log("✅ Total aircraft buttons added:", buttonCount);
} else {
  console.error("❌ Aircraft buttons container NOT FOUND");
}

// Location selector UI
const locationListContainer = document.getElementById("location-list");
const locationSearchInput = document.getElementById("location-search");
console.log("=== LOCATION SELECTOR ===");
console.log("List container found:", !!locationListContainer);
console.log("Search input found:", !!locationSearchInput);

function renderLocationList(filter = "") {
  if (!locationListContainer) {
    console.error("Location list container not found!");
    return;
  }
  locationListContainer.innerHTML = "";
  const filtered = Object.entries(FLYING_LOCATIONS).filter(([_, loc]) =>
    loc.name.toLowerCase().includes(filter.toLowerCase()) ||
    loc.description.toLowerCase().includes(filter.toLowerCase())
  );

  console.log("Rendering locations, filtered count:", filtered.length);
  filtered.forEach(([key, location]) => {
    const btn = document.createElement("div");
    btn.className = "location-btn" + (key === currentLocation ? " active" : "");
    btn.style.pointerEvents = "auto";
    btn.style.cursor = "pointer";
    btn.innerHTML = `
      <div class="location-btn-name">${location.name}</div>
      <div class="location-btn-desc">${location.description}</div>
    `;
    btn.addEventListener("click", (e) => {
      console.log("LOCATION BUTTON CLICKED:", key, location.name);
      e.preventDefault();
      e.stopPropagation();
      if (!flightStarted) {
        console.log("Switching location to:", location.name);
        switchLocation(key);
        renderLocationList(locationSearchInput ? locationSearchInput.value : "");
      } else {
        console.log("Cannot switch - flight started");
      }
    });
    locationListContainer.appendChild(btn);
  });
}

if (locationSearchInput && locationListContainer) {
  locationSearchInput.addEventListener("input", (e) => {
    console.log("Location search input:", e.target.value);
    renderLocationList(e.target.value);
  });
  renderLocationList();
  console.log("Location selector initialized");
} else {
  console.error("Location selector NOT initialized - missing elements");
}

// Location collapse toggle
const locationToggle = document.getElementById("location-toggle");
let locationCollapsed = false;
if (locationToggle) {
  locationToggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    locationCollapsed = !locationCollapsed;
    if (locationSearchInput) locationSearchInput.classList.toggle("collapsed");
    if (locationListContainer) locationListContainer.classList.toggle("collapsed");
    locationToggle.textContent = locationCollapsed ? "▶" : "▼";
    console.log("Location selector toggled:", locationCollapsed ? "collapsed" : "expanded");
  });
}

// Camera selector UI
const cameraButtonsContainer = document.getElementById("camera-buttons");
console.log("=== CAMERA SELECTOR ===");
console.log("Camera buttons container found:", !!cameraButtonsContainer);
console.log("CAMERA_MODES available:", !!CAMERA_MODES, Object.keys(CAMERA_MODES).length);

if (cameraButtonsContainer) {
  let cameraButtonCount = 0;
  Object.entries(CAMERA_MODES).forEach(([key, mode]) => {
    const btn = document.createElement("button");
    btn.className = "camera-btn" + (key === currentCameraMode ? " active" : "");
    btn.textContent = mode.name;
    btn.style.pointerEvents = "auto";
    btn.style.cursor = "pointer";
    btn.onclick = function(e) {
      console.log("🎥 CAMERA BUTTON CLICK EVENT FIRED:", key);
      currentCameraMode = key;
      document.querySelectorAll(".camera-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      console.log("📹 Switched to camera:", mode.name);
    };
    cameraButtonsContainer.appendChild(btn);
    cameraButtonCount++;
    console.log(`✓ Camera button created: ${mode.name}`);
  });
  console.log("✅ Total camera buttons added:", cameraButtonCount);
} else {
  console.error("❌ Camera buttons container NOT FOUND");
}

// Autopilot UI initialization
const autopilotToggle = document.getElementById("autopilot-toggle");
const apSpeedDisplay = document.getElementById("ap-speed");
const apHeadingDisplay = document.getElementById("ap-heading");
const apAltitudeDisplay = document.getElementById("ap-altitude");
const apVsDisplay = document.getElementById("ap-vs");
const apControls = document.querySelectorAll(".ap-control");

console.log("=== AUTOPILOT UI ===");
console.log("Toggle button found:", !!autopilotToggle);
console.log("Display elements found:", !!apSpeedDisplay, !!apHeadingDisplay, !!apAltitudeDisplay, !!apVsDisplay);

// Update autopilot display values
function updateAutopilotDisplay() {
  const values = autopilot.getDisplayValues();
  if (apSpeedDisplay) apSpeedDisplay.textContent = values.speed;
  if (apHeadingDisplay) apHeadingDisplay.textContent = values.heading;
  if (apAltitudeDisplay) apAltitudeDisplay.textContent = values.altitude;
  if (apVsDisplay) apVsDisplay.textContent = values.verticalSpeed;
}

// Autopilot toggle
if (autopilotToggle) {
  autopilotToggle.addEventListener("click", () => {
    const enabled = autopilot.toggle();
    autopilotToggle.classList.toggle("active", enabled);
    console.log("🤖 Autopilot toggled:", enabled ? "ON" : "OFF");
  });
} else {
  console.error("Autopilot toggle button NOT FOUND");
}

// Autopilot control buttons
if (apControls.length > 0) {
  console.log("Found", apControls.length, "autopilot controls");

  // Speed controls (first control)
  const speedMinus = apControls[0].querySelector(".ap-minus");
  const speedPlus = apControls[0].querySelector(".ap-plus");
  if (speedMinus) {
    speedMinus.addEventListener("click", () => {
      autopilot.updateTargetSpeed(-5);
      updateAutopilotDisplay();
    });
  }
  if (speedPlus) {
    speedPlus.addEventListener("click", () => {
      autopilot.updateTargetSpeed(5);
      updateAutopilotDisplay();
    });
  }

  // Heading controls (second control)
  const headingMinus = apControls[1].querySelector(".ap-minus");
  const headingPlus = apControls[1].querySelector(".ap-plus");
  if (headingMinus) {
    headingMinus.addEventListener("click", () => {
      autopilot.updateTargetHeading(-5);
      updateAutopilotDisplay();
    });
  }
  if (headingPlus) {
    headingPlus.addEventListener("click", () => {
      autopilot.updateTargetHeading(5);
      updateAutopilotDisplay();
    });
  }

  // Altitude controls (third control)
  const altitudeMinus = apControls[2].querySelector(".ap-minus");
  const altitudePlus = apControls[2].querySelector(".ap-plus");
  if (altitudeMinus) {
    altitudeMinus.addEventListener("click", () => {
      autopilot.updateTargetAltitude(-100);
      updateAutopilotDisplay();
    });
  }
  if (altitudePlus) {
    altitudePlus.addEventListener("click", () => {
      autopilot.updateTargetAltitude(100);
      updateAutopilotDisplay();
    });
  }

  // Vertical speed controls (fourth control)
  const vsMinus = apControls[3].querySelector(".ap-minus");
  const vsPlus = apControls[3].querySelector(".ap-plus");
  if (vsMinus) {
    vsMinus.addEventListener("click", () => {
      autopilot.updateTargetVerticalSpeed(-1);
      updateAutopilotDisplay();
    });
  }
  if (vsPlus) {
    vsPlus.addEventListener("click", () => {
      autopilot.updateTargetVerticalSpeed(1);
      updateAutopilotDisplay();
    });
  }

  console.log("✅ Autopilot controls initialized");
} else {
  console.error("No autopilot controls found");
}

// Initialize display with default values
updateAutopilotDisplay();
