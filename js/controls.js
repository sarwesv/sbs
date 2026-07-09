// Keyboard control input: exposes { throttle, pitch, roll, yaw }
//
// Keys:
// - 0-9: throttle (0% to 100%)
// - Arrow Up/Down: pitch
// - Arrow Left/Right: roll
// - A/D: yaw
// - R: reset after crash

const PITCH_KEYS = { up: "ArrowUp", down: "ArrowDown" };
const ROLL_KEYS = { left: "ArrowLeft", right: "ArrowRight" };
const YAW_KEYS = { left: "KeyA", right: "KeyD" };
const RESET_KEY = "KeyR";

export class KeyboardControls {
  constructor() {
    this.pressed = new Set();
    this.throttle = 0; // Start at 0 - no movement until user increases throttle
    this.resetRequested = false;

    window.addEventListener("keydown", (event) => {
      this.pressed.add(event.code);

      // Direct throttle control from 0-9 keys
      const keyNum = parseInt(event.key);
      if (!isNaN(keyNum) && keyNum >= 0 && keyNum <= 9) {
        this.throttle = keyNum / 10;
      }
    });

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
    const pitch =
      (this.pressed.has(PITCH_KEYS.up) ? 1 : 0) - (this.pressed.has(PITCH_KEYS.down) ? 1 : 0);
    const roll =
      (this.pressed.has(ROLL_KEYS.right) ? 1 : 0) - (this.pressed.has(ROLL_KEYS.left) ? 1 : 0);
    const yaw =
      (this.pressed.has(YAW_KEYS.right) ? 1 : 0) - (this.pressed.has(YAW_KEYS.left) ? 1 : 0);

    return { throttle: this.throttle, pitch, roll, yaw };
  }
}
