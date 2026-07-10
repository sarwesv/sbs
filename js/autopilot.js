// Autopilot system for automated flight control
import * as THREE from "three";

export class Autopilot {
  constructor() {
    this.enabled = false;
    this.targetSpeed = 50; // m/s (approximately 97 knots)
    this.targetHeading = 0; // degrees
    this.targetAltitude = 1000; // meters
    this.targetVerticalSpeed = 0; // m/s

    // PID controller gains for smooth control
    this.speedPID = { p: 0.1, i: 0.01, d: 0.05, integral: 0 };
    this.headingPID = { p: 0.15, i: 0.02, d: 0.1, integral: 0 };
    this.altitudePID = { p: 0.08, i: 0.01, d: 0.05, integral: 0 };
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  updateTargetSpeed(delta) {
    this.targetSpeed = Math.max(10, Math.min(150, this.targetSpeed + delta));
    return this.targetSpeed;
  }

  updateTargetHeading(delta) {
    this.targetHeading = (this.targetHeading + delta + 360) % 360;
    return this.targetHeading;
  }

  updateTargetAltitude(delta) {
    this.targetAltitude = Math.max(50, Math.min(10000, this.targetAltitude + delta));
    return this.targetAltitude;
  }

  updateTargetVerticalSpeed(delta) {
    this.targetVerticalSpeed = Math.max(-20, Math.min(20, this.targetVerticalSpeed + delta));
    return this.targetVerticalSpeed;
  }

  // Calculate autopilot control inputs based on current aircraft state
  calculateControls(aircraft) {
    if (!this.enabled) {
      return { throttle: 0, pitch: 0, roll: 0, yaw: 0 };
    }

    const speedMs = aircraft.velocity.length();
    const euler = new THREE.Euler().setFromQuaternion(aircraft.orientation, "YXZ");
    const currentHeading = THREE.MathUtils.radToDeg(euler.y);
    const currentAltitude = aircraft.position.y;
    const verticalSpeed = aircraft.velocity.y;

    // Speed control (throttle)
    const speedError = this.targetSpeed - speedMs;
    this.speedPID.integral = Math.max(-5, Math.min(5, this.speedPID.integral + speedError * 0.016));
    const throttle = Math.max(0, Math.min(1,
      0.5 + speedError * this.speedPID.p +
      this.speedPID.integral * this.speedPID.i
    ));

    // Heading control (yaw and coordinated roll)
    let headingError = this.targetHeading - currentHeading;
    if (headingError > 180) headingError -= 360;
    if (headingError < -180) headingError += 360;

    this.headingPID.integral = Math.max(-1, Math.min(1, this.headingPID.integral + headingError * 0.016));
    const headingControl = headingError * this.headingPID.p +
      this.headingPID.integral * this.headingPID.i;

    // Roll for heading correction (proportional to heading error)
    const roll = Math.max(-0.8, Math.min(0.8, headingControl * 0.5));
    const yaw = Math.max(-0.5, Math.min(0.5, headingControl * 0.3));

    // Altitude control (pitch)
    const altitudeError = this.targetAltitude - currentAltitude;
    const verticalSpeedError = this.targetVerticalSpeed - verticalSpeed;

    this.altitudePID.integral = Math.max(-2, Math.min(2, this.altitudePID.integral + altitudeError * 0.016));
    const pitch = Math.max(-0.8, Math.min(0.8,
      altitudeError * this.altitudePID.p * 0.001 +
      verticalSpeedError * 0.05 +
      this.altitudePID.integral * this.altitudePID.i * 0.0001
    ));

    return {
      throttle,
      pitch,
      roll,
      yaw
    };
  }

  // Get display values for UI (in knots, meters, degrees)
  getDisplayValues() {
    return {
      speed: (this.targetSpeed * 1.94384).toFixed(1), // m/s to knots
      heading: Math.round(this.targetHeading).toString().padStart(3, "0"),
      altitude: Math.round(this.targetAltitude),
      verticalSpeed: this.targetVerticalSpeed.toFixed(0)
    };
  }
}
