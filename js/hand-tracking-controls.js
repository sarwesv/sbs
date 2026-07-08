// Real control input: camera-based hand tracking, extracted from the
// Phase 1 prototype (hand-tracking-test/) into a reusable module with the
// same { throttle, pitch, roll, yaw } shape KeyboardControls produces.
// The camera feed is processed entirely in-browser and never rendered or
// sent anywhere.
//
// Yaw isn't derived from hand tracking yet (two-axis stick + one-axis
// throttle only) — it stays 0 here; KeyboardControls' A/D remains the only
// yaw source until that's designed.

import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs";

const WASM_BASE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class HandTrackingControls {
  constructor({ flipHandedness = false } = {}) {
    this.flipHandedness = flipHandedness;
    this.throttle = 0.3;
    this.roll = 0;
    this.pitch = 0;
    this.handsDetected = 0;
    this.ready = false;
    this.error = null;

    this._video = document.createElement("video");
    this._video.playsInline = true;
    this._video.muted = true;
    this._video.style.position = "fixed";
    this._video.style.top = "0";
    this._video.style.left = "0";
    this._video.style.width = "2px";
    this._video.style.height = "2px";
    this._video.style.opacity = "0";
    this._video.style.pointerEvents = "none";
    document.body.appendChild(this._video);
  }

  async init() {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
    this._handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 2,
    });

    const stream = await this._startCamera();
    this._video.srcObject = stream;
    await this._video.play();

    this.ready = true;
    this._lastVideoTime = -1;
    requestAnimationFrame(() => this._detectLoop());
  }

  async _startCamera() {
    const attempts = [
      { video: { facingMode: { exact: "environment" } } },
      { video: { facingMode: "environment" } },
      { video: true },
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

  _detectLoop() {
    if (this._video.readyState >= 2 && this._video.currentTime !== this._lastVideoTime) {
      this._lastVideoTime = this._video.currentTime;
      const result = this._handLandmarker.detectForVideo(this._video, performance.now());
      this._applyResult(result);
    }
    requestAnimationFrame(() => this._detectLoop());
  }

  _applyResult(result) {
    const hands = result.landmarks || [];
    this.handsDetected = hands.length;

    let throttleHandIndex = -1;
    let stickHandIndex = -1;

    for (let i = 0; i < hands.length; i++) {
      const label = result.handedness[i]?.[0]?.categoryName;
      const isThrottleHand = this.flipHandedness ? label === "Right" : label === "Left";
      if (isThrottleHand && throttleHandIndex === -1) {
        throttleHandIndex = i;
      } else if (!isThrottleHand && stickHandIndex === -1) {
        stickHandIndex = i;
      }
    }

    if (throttleHandIndex !== -1) {
      const wrist = hands[throttleHandIndex][0];
      this.throttle = clamp(1 - wrist.y, 0, 1);
    }

    if (stickHandIndex !== -1) {
      const wrist = hands[stickHandIndex][0];
      this.roll = clamp((wrist.x - 0.5) * 2, -1, 1);
      this.pitch = clamp((0.5 - wrist.y) * 2, -1, 1);
    } else {
      this.roll = 0;
      this.pitch = 0;
    }
  }

  getState(_dt) {
    return { throttle: this.throttle, pitch: this.pitch, roll: this.roll, yaw: 0 };
  }
}
