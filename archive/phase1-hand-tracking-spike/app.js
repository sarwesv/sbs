// Phase 1 prototype: prove out camera-based hand tracking as a control
// input, in isolation from the flight sim. The camera feed is read and
// processed entirely in this browser tab and never rendered or sent
// anywhere — only the two derived control axes (throttle, stick) are
// shown, as numbers/bars.
//
// Convention (arbitrary, meant to be tuned once tested on a real device):
//   - left hand height in frame  -> throttle (0 bottom .. 1 top)
//   - right hand x position      -> stick roll  (-1 .. 1)
//   - right hand y position      -> stick pitch (-1 .. 1, up = nose up)
//
// Handedness from the model assumes a mirrored/selfie camera. Our camera
// is the rear (world-facing) camera with hands held up in front of it, so
// which label ends up meaning "left" vs "right" in practice is untested —
// hence the on-screen flip toggle rather than a hardcoded guess.

import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs";

const WASM_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const statusEl = document.getElementById("status");
const videoEl = document.getElementById("camera-feed");
const flipToggle = document.getElementById("flip-toggle");
const handsDetectedEl = document.getElementById("hands-detected");
const fpsEl = document.getElementById("fps");

const throttleBar = document.getElementById("throttle-bar");
const throttleValue = document.getElementById("throttle-value");
const rollBar = document.getElementById("roll-bar");
const rollValue = document.getElementById("roll-value");
const pitchBar = document.getElementById("pitch-bar");
const pitchValue = document.getElementById("pitch-value");

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setVerticalBar(barEl, valueEl, value01, label) {
  barEl.style.height = `${clamp(value01, 0, 1) * 100}%`;
  valueEl.textContent = label;
}

function setHorizontalBar(barEl, valueEl, valueNeg1To1, label) {
  const pct = clamp(valueNeg1To1, -1, 1) * 50; // -50..50
  if (pct >= 0) {
    barEl.style.left = "50%";
    barEl.style.width = `${pct}%`;
  } else {
    barEl.style.left = `${50 + pct}%`;
    barEl.style.width = `${-pct}%`;
  }
  valueEl.textContent = label;
}

async function startCamera() {
  const attempts = [
    { video: { facingMode: { exact: "environment" } } },
    { video: { facingMode: "environment" } },
    { video: true }, // last resort: whatever camera exists (useful for desktop dev testing)
  ];

  let lastError;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function main() {
  statusEl.textContent = "Loading hand-tracking model…";

  const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
  const handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
  });

  statusEl.textContent = "Requesting camera…";

  let stream;
  try {
    stream = await startCamera();
  } catch (error) {
    statusEl.textContent = `Camera unavailable: ${error.name || error.message}`;
    return;
  }

  videoEl.srcObject = stream;
  await videoEl.play();
  statusEl.style.display = "none";

  let lastVideoTime = -1;
  let frameCount = 0;
  let lastFpsSampleTime = performance.now();

  function renderLoop() {
    if (videoEl.readyState >= 2 && videoEl.currentTime !== lastVideoTime) {
      lastVideoTime = videoEl.currentTime;
      const result = handLandmarker.detectForVideo(videoEl, performance.now());
      handleResult(result);
    }

    frameCount++;
    const now = performance.now();
    const elapsed = now - lastFpsSampleTime;
    if (elapsed >= 500) {
      fpsEl.textContent = `${((frameCount * 1000) / elapsed).toFixed(0)} fps`;
      frameCount = 0;
      lastFpsSampleTime = now;
    }

    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);
}

function handleResult(result) {
  const hands = result.landmarks || [];
  handsDetectedEl.textContent = `${hands.length} hand${hands.length === 1 ? "" : "s"}`;

  let throttleHandIndex = -1;
  let stickHandIndex = -1;

  for (let i = 0; i < hands.length; i++) {
    const label = result.handedness[i]?.[0]?.categoryName; // "Left" or "Right"
    const isLeft = flipToggle.checked ? label === "Right" : label === "Left";
    if (isLeft && throttleHandIndex === -1) {
      throttleHandIndex = i;
    } else if (!isLeft && stickHandIndex === -1) {
      stickHandIndex = i;
    }
  }

  if (throttleHandIndex !== -1) {
    const wrist = hands[throttleHandIndex][0];
    const throttle = clamp(1 - wrist.y, 0, 1);
    setVerticalBar(throttleBar, throttleValue, throttle, throttle.toFixed(2));
  } else {
    throttleValue.textContent = "--";
    throttleBar.style.height = "0%";
  }

  if (stickHandIndex !== -1) {
    const wrist = hands[stickHandIndex][0];
    const roll = clamp((wrist.x - 0.5) * 2, -1, 1);
    const pitch = clamp((0.5 - wrist.y) * 2, -1, 1);
    setHorizontalBar(rollBar, rollValue, roll, roll.toFixed(2));
    setVerticalBar(pitchBar, pitchValue, (pitch + 1) / 2, pitch.toFixed(2));
  } else {
    rollValue.textContent = "--";
    pitchValue.textContent = "--";
    rollBar.style.width = "0%";
    pitchBar.style.height = "0%";
  }
}

main();
