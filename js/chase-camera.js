// Chase camera controller: free-orbit external camera following the aircraft.
// Mouse drag (left button) orbits around the aircraft; scroll wheel adjusts distance.
// Camera stays locked to aircraft position but can be freely rotated around it.

import * as THREE from "three";

export class ChaseCamera {
  constructor(domElement, camera) {
    this.domElement = domElement;
    this.camera = camera;

    // Camera orbit state: angles and distance from aircraft
    this.yaw = 0; // left/right around aircraft (radians)
    this.pitch = -0.3; // up/down (starts slightly above aircraft)
    this.distance = 100; // meters behind/above aircraft

    // Constraints
    this.minDistance = 20;
    this.maxDistance = 500;
    this.minPitch = -Math.PI / 2; // can look straight down
    this.maxPitch = Math.PI / 2; // can look straight up

    // Mouse drag state
    this._dragging = false;
    this._lastPointer = { x: 0, y: 0 };
    this._dragSensitivity = 0.005;

    this._bindControls();
  }

  _bindControls() {
    // Left-click drag to orbit
    this.domElement.addEventListener("pointerdown", (event) => {
      if (event.button === 0) {
        this._dragging = true;
        this._lastPointer = { x: event.clientX, y: event.clientY };
      }
    });

    window.addEventListener("pointermove", (event) => {
      if (!this._dragging) return;
      const dx = event.clientX - this._lastPointer.x;
      const dy = event.clientY - this._lastPointer.y;
      this._lastPointer = { x: event.clientX, y: event.clientY };

      // Yaw is absolute rotation around world up (Y)
      this.yaw -= dx * this._dragSensitivity;
      // Pitch is relative to current view
      this.pitch -= dy * this._dragSensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch, this.minPitch, this.maxPitch);
    });

    window.addEventListener("pointerup", () => {
      this._dragging = false;
    });

    // Scroll to adjust distance
    this.domElement.addEventListener("wheel", (event) => {
      event.preventDefault();
      const scrollDelta = event.deltaY > 0 ? 1.1 : 0.9; // zoom in/out
      this.distance *= scrollDelta;
      this.distance = THREE.MathUtils.clamp(this.distance, this.minDistance, this.maxDistance);
    });
  }

  update(aircraftPosition, aircraftOrientation) {
    // Compute camera position in a sphere around the aircraft.
    // Yaw rotates in world space (around Y axis), pitch tilts the view up/down.
    const sphericalCoords = new THREE.Spherical(
      this.distance,
      Math.PI / 2 - this.pitch, // THREE.Spherical uses polar angle from +Y (so π/2 - pitch)
      this.yaw
    );
    const cameraOffset = new THREE.Vector3().setFromSpherical(sphericalCoords);

    // Position camera relative to aircraft
    this.camera.position.copy(aircraftPosition).add(cameraOffset);

    // Point camera toward the aircraft
    this.camera.lookAt(aircraftPosition);
  }
}
