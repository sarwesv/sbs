// Produces a "head look" quaternion — where the pilot's head/phone is
// pointed, independent of which way the aircraft is flying. Two sources:
// device orientation (real gyro, used in the headset) or drag-to-look
// (fallback for desktop dev testing / devices or browsers without
// orientation support, or when the user declines the permission prompt).
//
// Device orientation is calibrated relative to whatever direction the
// phone was pointed at when tracking started (or last recentered) — the
// aircraft's virtual world has no relationship to real-world compass
// heading, so only the delta from a reference orientation matters.

import * as THREE from "three";

export class LookControls {
  constructor(domElement) {
    this.domElement = domElement;
    this.headQuaternion = new THREE.Quaternion();
    this.mode = "none"; // "orientation" | "drag" | "none"

    this._referenceOrientation = null;
    this._dragYaw = 0;
    this._dragPitch = 0;
    this._dragging = false;
    this._lastPointer = { x: 0, y: 0 };

    this._bindDragFallback();
  }

  static async isOrientationPermissionNeeded() {
    return (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    );
  }

  async enableDeviceOrientation() {
    if (await LookControls.isOrientationPermissionNeeded()) {
      const result = await DeviceOrientationEvent.requestPermission();
      if (result !== "granted") {
        return false;
      }
    }
    window.addEventListener("deviceorientation", this._handleOrientation);
    this.mode = "orientation";
    return true;
  }

  recenter() {
    this._referenceOrientation = null;
    this._dragYaw = 0;
    this._dragPitch = 0;
  }

  _handleOrientation = (event) => {
    if (event.alpha === null) {
      return;
    }
    const alpha = THREE.MathUtils.degToRad(event.alpha);
    const beta = THREE.MathUtils.degToRad(event.beta || 0);
    const gamma = THREE.MathUtils.degToRad(event.gamma || 0);
    const current = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(beta, alpha, -gamma, "YXZ")
    );

    if (!this._referenceOrientation) {
      this._referenceOrientation = current.clone();
    }

    this.headQuaternion.copy(this._referenceOrientation).invert().multiply(current);
  };

  _bindDragFallback() {
    this.domElement.addEventListener("pointerdown", (event) => {
      if (this.mode === "orientation") return;
      this.mode = "drag";
      this._dragging = true;
      this._lastPointer = { x: event.clientX, y: event.clientY };
    });
    window.addEventListener("pointermove", (event) => {
      if (!this._dragging) return;
      const dx = event.clientX - this._lastPointer.x;
      const dy = event.clientY - this._lastPointer.y;
      this._lastPointer = { x: event.clientX, y: event.clientY };
      this._dragYaw -= dx * 0.005;
      this._dragPitch = THREE.MathUtils.clamp(this._dragPitch - dy * 0.005, -Math.PI / 2, Math.PI / 2);
      this.headQuaternion.setFromEuler(new THREE.Euler(this._dragPitch, this._dragYaw, 0, "YXZ"));
    });
    window.addEventListener("pointerup", () => {
      this._dragging = false;
    });
  }
}
