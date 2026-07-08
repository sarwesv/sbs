// Keyboard stand-in for the real control input. Exposes the same
// { throttle, pitch, roll, yaw } shape that Phase 1's hand-tracking module
// will eventually produce, so swapping the input source later doesn't
// touch physics.js or main.js.
//
// Keys: Arrow Up/Down = pitch, Arrow Left/Right = roll, A/D = yaw,
// W/S = throttle up/down (ramped, since keyboard has no analog lever).

const PITCH_KEYS = { up: "ArrowUp", down: "ArrowDown" };
const ROLL_KEYS = { left: "ArrowLeft", right: "ArrowRight" };
const YAW_KEYS = { left: "KeyA", right: "KeyD" };
const THROTTLE_KEYS = { up: "KeyW", down: "KeyS" };
const RESET_KEY = "KeyR";

const THROTTLE_RAMP_PER_SECOND = 0.5;

export class KeyboardControls {
  constructor() {
    this.pressed = new Set();
    this.throttle = 0.3;
    this.resetRequested = false;

    window.addEventListener("keydown", (event) => this.pressed.add(event.code));
    window.addEventListener("keyup", (event) => {
      this.pressed.delete(event.code);
      if (event.code === RESET_KEY) {
        this.resetRequested = true;
      }
    });
  }

  consumeResetRequest() {
    const requested = this.resetRequested;
    this.resetRequested = false;
    return requested;
  }

  getState(dt) {
    if (this.pressed.has(THROTTLE_KEYS.up)) {
      this.throttle += THROTTLE_RAMP_PER_SECOND * dt;
    }
    if (this.pressed.has(THROTTLE_KEYS.down)) {
      this.throttle -= THROTTLE_RAMP_PER_SECOND * dt;
    }
    this.throttle = Math.max(0, Math.min(1, this.throttle));

    const pitch =
      (this.pressed.has(PITCH_KEYS.up) ? 1 : 0) - (this.pressed.has(PITCH_KEYS.down) ? 1 : 0);
    const roll =
      (this.pressed.has(ROLL_KEYS.right) ? 1 : 0) - (this.pressed.has(ROLL_KEYS.left) ? 1 : 0);
    const yaw =
      (this.pressed.has(YAW_KEYS.right) ? 1 : 0) - (this.pressed.has(YAW_KEYS.left) ? 1 : 0);

    return { throttle: this.throttle, pitch, roll, yaw };
  }
}
