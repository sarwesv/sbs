// Simplified but aerodynamically-motivated flight model: lift/drag derived
// from angle of attack (with a stall falloff), thrust along the nose,
// gravity, integrated per frame. This is the arcade-tier pass called out
// in the project plan — Phase 5 replaces the coefficient curves with
// tuned per-aircraft data, not this integration scheme.
//
// Body-frame convention (matches Three.js camera convention): forward is
// local -Z, up is local +Y, right is local +X.

import * as THREE from "three";

const GRAVITY = 9.81;
const AIR_DENSITY = 1.225;
const SAFE_LANDING_SINK_RATE = 3; // m/s
const SAFE_LANDING_MAX_TILT_RAD = THREE.MathUtils.degToRad(10);
const ROLLING_DECELERATION = 3; // m/s^2, ground friction while landed

export class AircraftConfig {
  constructor({
    mass = 1200, // kg
    wingArea = 16, // m^2
    maxThrust = 12000, // N
    stallAngleRad = THREE.MathUtils.degToRad(16),
    maxLiftCoefficient = 1.4,
    zeroLiftDragCoefficient = 0.03,
    inducedDragFactor = 0.05,
    maxPitchRate = THREE.MathUtils.degToRad(45), // rad/s at full stick
    maxRollRate = THREE.MathUtils.degToRad(120),
    maxYawRate = THREE.MathUtils.degToRad(20),
  } = {}) {
    Object.assign(this, {
      mass,
      wingArea,
      maxThrust,
      stallAngleRad,
      maxLiftCoefficient,
      zeroLiftDragCoefficient,
      inducedDragFactor,
      maxPitchRate,
      maxRollRate,
      maxYawRate,
    });
  }
}

function liftCoefficient(angleOfAttack, config) {
  const stall = config.stallAngleRad;
  const clamped = THREE.MathUtils.clamp(angleOfAttack, -Math.PI / 2, Math.PI / 2);
  if (Math.abs(clamped) <= stall) {
    return (clamped / stall) * config.maxLiftCoefficient;
  }
  const overshoot = Math.abs(clamped) - stall;
  const falloff = Math.max(0, 1 - overshoot / (Math.PI / 2 - stall));
  return Math.sign(clamped) * config.maxLiftCoefficient * falloff * 0.5;
}

function dragCoefficient(cl, config) {
  return config.zeroLiftDragCoefficient + config.inducedDragFactor * cl * cl;
}

export class Aircraft {
  constructor(config, spawnPosition, spawnHeadingRad = 0) {
    this.config = config;
    this.position = spawnPosition.clone();
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.orientation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, spawnHeadingRad, 0, "YXZ")
    );
    this.onGround = true;
    this.crashed = false;
  }

  get forward() {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.orientation);
  }

  get up() {
    return new THREE.Vector3(0, 1, 0).applyQuaternion(this.orientation);
  }

  reset(spawnPosition, spawnHeadingRad = 0) {
    this.position.copy(spawnPosition);
    this.velocity.set(0, 0, 0);
    this.orientation.setFromEuler(new THREE.Euler(0, spawnHeadingRad, 0, "YXZ"));
    this.onGround = true;
    this.crashed = false;
  }

  update(dt, controls, groundHeight) {
    if (this.crashed) {
      return;
    }

    const { throttle, pitch, roll, yaw } = controls;
    const speed = this.velocity.length();

    // Realistic turn dynamics: roll and yaw effectiveness depends on airspeed
    // Stall speed roughly at 20 m/s for light aircraft, higher for jets
    const stallSpeed = Math.max(15, 0.05 * this.config.maxThrust / this.config.mass);
    const speedFactor = Math.max(0.2, speed / (stallSpeed * 3)); // Effectiveness peaks at 3x stall speed

    // Get current aircraft attitude (pitch and bank)
    const euler = new THREE.Euler().setFromQuaternion(this.orientation, "YXZ");
    const bankAngle = euler.z; // Roll angle (bank)

    // Coordinated turn: automatically increase pitch during turn to maintain altitude
    // Without this, banking alone causes altitude loss
    let effPitch = pitch;
    if (Math.abs(bankAngle) > 0.1) {
      const bankSeverity = Math.abs(bankAngle) / (Math.PI / 3); // Normalized 0-1
      const needsPitchUp = Math.tan(bankAngle) * (speed * speed / GRAVITY);
      effPitch = pitch + Math.min(0.3, bankSeverity * 0.5); // Auto pitch up in turns
    }

    // Roll rate limited by airspeed - faster = better roll authority
    const rollRate = this.config.maxRollRate * speedFactor;

    // Yaw rate enhanced by coordinated turn (bank angle provides natural yaw)
    const yawBase = this.config.maxYawRate * speedFactor;
    const yawFromBank = Math.sin(bankAngle) * speedFactor * 0.3; // Bank naturally causes yaw

    // Apply rotations with realistic coupling
    const deltaQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        effPitch * this.config.maxPitchRate * dt,
        (yaw * yawBase + yawFromBank) * dt,
        -roll * rollRate * dt,
        "YXZ"
      )
    );
    this.orientation.multiply(deltaQuat).normalize();

    const forward = this.forward;
    const up = this.up;
    const speed = this.velocity.length();
    const velocityDir = speed > 0.01 ? this.velocity.clone().normalize() : forward.clone();

    // Angle of attack: signed angle between the nose and the velocity
    // vector, measured in the aircraft's own pitch plane.
    const localVelocity = velocityDir.clone().applyQuaternion(this.orientation.clone().invert());
    const angleOfAttack = Math.atan2(-localVelocity.y, -localVelocity.z);

    const dynamicPressure = 0.5 * AIR_DENSITY * speed * speed;
    const cl = liftCoefficient(angleOfAttack, this.config);
    const cd = dragCoefficient(cl, this.config);
    const liftMagnitude = dynamicPressure * this.config.wingArea * cl;
    const dragMagnitude = dynamicPressure * this.config.wingArea * cd;

    let liftDir = up.clone().projectOnPlane(velocityDir);
    if (liftDir.lengthSq() < 1e-6) {
      liftDir = up.clone();
    }
    liftDir.normalize();

    const liftForce = liftDir.multiplyScalar(liftMagnitude);
    const dragForce = velocityDir.clone().multiplyScalar(-dragMagnitude);
    const thrustForce = forward.clone().multiplyScalar(throttle * this.config.maxThrust);
    const gravityForce = new THREE.Vector3(0, -this.config.mass * GRAVITY, 0);

    const totalForce = new THREE.Vector3()
      .add(liftForce)
      .add(dragForce)
      .add(thrustForce)
      .add(gravityForce);
    const acceleration = totalForce.divideScalar(this.config.mass);

    this.velocity.addScaledVector(acceleration, dt);
    this.position.addScaledVector(this.velocity, dt);

    this.handleGroundContact(groundHeight, dt);
  }

  handleGroundContact(groundHeight, dt) {
    const heightAboveGround = this.position.y - groundHeight;
    if (heightAboveGround > 0) {
      this.onGround = false;
      return;
    }

    const wasAirborne = !this.onGround;
    this.position.y = groundHeight;

    // Only judge sink-rate/tilt at the moment of touchdown (transitioning
    // from airborne to ground contact). If it was already resting/rolling
    // on the runway, pitching up to rotate for takeoff is normal and must
    // not be treated as a crash just because lift hasn't kicked in yet.
    if (wasAirborne) {
      const euler = new THREE.Euler().setFromQuaternion(this.orientation, "YXZ");
      const tiltRad = Math.max(Math.abs(euler.x), Math.abs(euler.z));
      const sinkRate = -this.velocity.y;
      if (sinkRate > SAFE_LANDING_SINK_RATE || tiltRad > SAFE_LANDING_MAX_TILT_RAD) {
        this.crashed = true;
        this.velocity.set(0, 0, 0);
        return;
      }
    }

    this.onGround = true;
    this.velocity.y = Math.max(this.velocity.y, 0);
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizontalSpeed > 0.01) {
      const decel = Math.min(horizontalSpeed, ROLLING_DECELERATION * dt);
      const scale = (horizontalSpeed - decel) / horizontalSpeed;
      this.velocity.x *= scale;
      this.velocity.z *= scale;
    }
  }
}
