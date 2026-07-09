// Realistic flight physics with proper aerodynamic modeling
// Implements GeoFS-like flight dynamics without external physics engine

import * as THREE from "three";

const GRAVITY = 9.81;
const AIR_DENSITY = 1.225;
const SAFE_LANDING_SINK_RATE = 3;
const SAFE_LANDING_MAX_TILT_RAD = THREE.MathUtils.degToRad(10);

export class FlightPhysicsConfig {
  constructor({
    mass = 1200,
    wingArea = 16,
    maxThrust = 75000,
    stallAngleRad = THREE.MathUtils.degToRad(14),
    maxLiftCoefficient = 1.5,
    dragParasitic = 0.025,
    dragInduced = 0.05,
    wingSpan = 11,
    maxControlDeflection = THREE.MathUtils.degToRad(25),
  } = {}) {
    Object.assign(this, {
      mass,
      wingArea,
      maxThrust,
      stallAngleRad,
      maxLiftCoefficient,
      dragParasitic,
      dragInduced,
      wingSpan,
      maxControlDeflection,
    });
  }
}

export class RealisticAircraft {
  constructor(config, spawnPosition, spawnHeadingRad = 0) {
    this.config = config;
    this.position = spawnPosition.clone();
    this.velocity = new THREE.Vector3();
    this.orientation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, spawnHeadingRad, 0, "YXZ")
    );
    this.angularVelocity = new THREE.Vector3();

    this.onGround = true;
    this.crashed = false;

    // Control inputs
    this.controls = { throttle: 0, pitch: 0, roll: 0, yaw: 0 };

    // Flight state
    this.angleOfAttack = 0;
    this.sideslip = 0;
    this.gs = 1; // G-force
  }

  get forward() {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.orientation);
  }

  get right() {
    return new THREE.Vector3(1, 0, 0).applyQuaternion(this.orientation);
  }

  get up() {
    return new THREE.Vector3(0, 1, 0).applyQuaternion(this.orientation);
  }

  reset(spawnPosition, spawnHeadingRad = 0) {
    this.position.copy(spawnPosition);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.orientation.setFromEuler(new THREE.Euler(0, spawnHeadingRad, 0, "YXZ"));
    this.onGround = true;
    this.crashed = false;
  }

  updatePhysics(dt, controls, groundHeight) {
    if (this.crashed) return;

    this.controls = controls;
    const speed = this.velocity.length();
    const forward = this.forward;
    const right = this.right;
    const up = this.up;

    // Calculate angle of attack and sideslip
    const localVel = this.velocity.clone().applyQuaternion(this.orientation.clone().invert());
    this.angleOfAttack = Math.atan2(-localVel.y, -localVel.z);
    this.sideslip = Math.asin(Math.max(-1, Math.min(1, localVel.x / (speed || 1))));

    const qBar = 0.5 * AIR_DENSITY * speed * speed; // Dynamic pressure

    // Lift and drag coefficients
    const cl = this.getLiftCoefficient(this.angleOfAttack);
    const cd = this.getDragCoefficient(cl);

    // Aerodynamic forces
    const liftMag = qBar * this.config.wingArea * cl;
    const dragMag = qBar * this.config.wingArea * cd;

    // Lift direction (perpendicular to velocity, in pitch plane)
    let liftDir = up.clone().projectOnPlane(this.velocity);
    if (liftDir.lengthSq() < 1e-6) liftDir = up.clone();
    liftDir.normalize();

    const liftForce = liftDir.multiplyScalar(liftMag);
    const dragForce = this.velocity.clone().normalize().multiplyScalar(-dragMag);
    const thrustForce = forward.multiplyScalar(controls.throttle * this.config.maxThrust);
    const gravityForce = new THREE.Vector3(0, -this.config.mass * GRAVITY, 0);

    // Total force and acceleration
    const totalForce = new THREE.Vector3()
      .add(liftForce)
      .add(dragForce)
      .add(thrustForce)
      .add(gravityForce);

    const acceleration = totalForce.divideScalar(this.config.mass);
    this.gs = acceleration.length() / GRAVITY;

    // Update velocity
    this.velocity.addScaledVector(acceleration, dt);
    this.position.addScaledVector(this.velocity, dt);

    // Rotation based on control inputs and aerodynamic coupling
    this.updateOrientation(dt, speed, qBar);

    // Ground contact
    this.handleGroundContact(groundHeight, dt);
  }

  updateOrientation(dt, speed, qBar) {
    const speedFactor = Math.max(0.1, speed / 50); // Control authority increases with speed

    // Pitch from elevator
    const pitchRate = this.controls.pitch * this.config.maxControlDeflection * speedFactor;

    // Roll from aileron
    const rollRate = -this.controls.roll * this.config.maxControlDeflection * speedFactor * 1.5;

    // Yaw from rudder + coordinated turn
    let yawRate = this.controls.yaw * this.config.maxControlDeflection * speedFactor * 0.5;

    // Add coordinated turn (bank induces yaw)
    const euler = new THREE.Euler().setFromQuaternion(this.orientation, "YXZ");
    const bank = euler.z;
    yawRate += Math.sin(bank) * speedFactor * 0.2;

    // Apply rotations
    const deltaRot = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(pitchRate * dt, yawRate * dt, rollRate * dt, "YXZ")
    );
    this.orientation.multiply(deltaRot).normalize();
  }

  getLiftCoefficient(aoa) {
    const stall = this.config.stallAngleRad;
    const clamped = THREE.MathUtils.clamp(aoa, -Math.PI / 2, Math.PI / 2);

    // Linear region
    if (Math.abs(clamped) <= stall) {
      return (clamped / stall) * this.config.maxLiftCoefficient;
    }

    // Stall region
    const overshoot = Math.abs(clamped) - stall;
    const stallGradient = Math.PI / 2 - stall;
    const falloff = Math.max(0, 1 - (overshoot / stallGradient) * 1.5);
    return Math.sign(clamped) * this.config.maxLiftCoefficient * falloff;
  }

  getDragCoefficient(cl) {
    return this.config.dragParasitic + this.config.dragInduced * cl * cl;
  }

  handleGroundContact(groundHeight, dt) {
    const heightAbove = this.position.y - groundHeight;

    if (heightAbove > 0) {
      this.onGround = false;
      return;
    }

    const wasAirborne = !this.onGround;
    this.position.y = groundHeight;

    if (wasAirborne) {
      const euler = new THREE.Euler().setFromQuaternion(this.orientation, "YXZ");
      const tilt = Math.max(Math.abs(euler.x), Math.abs(euler.z));
      const sinkRate = -this.velocity.y;

      if (sinkRate > SAFE_LANDING_SINK_RATE || tilt > SAFE_LANDING_MAX_TILT_RAD) {
        this.crashed = true;
        this.velocity.set(0, 0, 0);
        return;
      }
    }

    this.onGround = true;
    this.velocity.y = Math.max(this.velocity.y, 0);

    // Ground friction
    const groundSpeed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
    if (groundSpeed > 0.1) {
      const decel = Math.min(groundSpeed, 2 * dt);
      const scale = (groundSpeed - decel) / groundSpeed;
      this.velocity.x *= scale;
      this.velocity.z *= scale;
    }
  }
}
