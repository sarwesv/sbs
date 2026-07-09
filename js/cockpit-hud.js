// Cockpit HUD: artificial horizon, speed tape, altitude tape, heading tape
// Rendered as canvas overlay on top of 3D scene

export class CockpitHUD {
  constructor(containerElement, width, height) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.position = "fixed";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.zIndex = "1";
    containerElement.parentElement.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d");
    this.telemetry = {
      airspeed: 0,
      altitude: 0,
      heading: 0,
      pitch: 0,
      roll: 0,
    };
  }

  updateTelemetry(airspeed, altitude, heading, pitch, roll) {
    this.telemetry.airspeed = airspeed;
    this.telemetry.altitude = altitude;
    this.telemetry.heading = heading;
    this.telemetry.pitch = pitch;
    this.telemetry.roll = roll;
  }

  render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const centerX = w / 2;
    const centerY = h / 2;

    // Clear canvas
    this.ctx.fillStyle = "rgba(0, 0, 0, 0)";
    this.ctx.fillRect(0, 0, w, h);

    // Draw main instrument frame (glass cockpit style)
    this._drawArtificialHorizon(centerX, centerY);
    this._drawSpeedTape(50, centerY);
    this._drawAltitudeTape(w - 50, centerY);
    this._drawHeadingTape(centerX, 60);
    this._drawVSI(w - 120, centerY);
  }

  _drawArtificialHorizon(x, y) {
    const size = 150;
    const pitch = this.telemetry.pitch;
    const roll = this.telemetry.roll;

    // Sky background
    this.ctx.fillStyle = "#87ceeb";
    this.ctx.fillRect(x - size, y - size, size * 2, size * 2);

    // Ground background
    this.ctx.fillStyle = "#8b7355";
    this.ctx.fillRect(x - size, y, size * 2, size);

    // Horizon line (offset by pitch)
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(roll);

    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(-size, -pitch * 20);
    this.ctx.lineTo(size, -pitch * 20);
    this.ctx.stroke();

    // Pitch reference marks
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 1;
    for (let i = -5; i <= 5; i++) {
      if (i === 0) continue;
      const y_offset = -pitch * 20 + i * 20;
      const mark_width = i % 2 === 0 ? 30 : 15;
      this.ctx.beginPath();
      this.ctx.moveTo(-mark_width / 2, y_offset);
      this.ctx.lineTo(mark_width / 2, y_offset);
      this.ctx.stroke();
    }

    // Center dot
    this.ctx.fillStyle = "#fff";
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();

    // Dial frame
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.stroke();

    // Roll indicator (top)
    this.ctx.fillStyle = "#fff";
    this.ctx.save();
    this.ctx.translate(x, y - size - 10);
    this.ctx.rotate(roll);
    this.ctx.fillRect(-3, 0, 6, 8);
    this.ctx.restore();
  }

  _drawSpeedTape(x, y) {
    const tapeHeight = 200;
    const tapeWidth = 40;
    const speed = this.telemetry.airspeed;

    // Tape background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(x - tapeWidth / 2, y - tapeHeight / 2, tapeWidth, tapeHeight);

    // Draw speed markings
    this.ctx.strokeStyle = "#fff";
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "10px monospace";
    this.ctx.textAlign = "right";
    this.ctx.lineWidth = 1;

    for (let i = 0; i <= 200; i += 10) {
      const offset = ((i - speed) / 10) * 10;
      if (Math.abs(offset) > tapeHeight / 2) continue;

      const mark_width = i % 20 === 0 ? 8 : 4;
      this.ctx.beginPath();
      this.ctx.moveTo(x + tapeWidth / 2 - mark_width, y + offset);
      this.ctx.lineTo(x + tapeWidth / 2, y + offset);
      this.ctx.stroke();

      if (i % 20 === 0) {
        this.ctx.fillText(i, x - 5, y + offset + 3);
      }
    }

    // Center pointer
    this.ctx.fillStyle = "#00ff00";
    this.ctx.beginPath();
    this.ctx.moveTo(x - tapeWidth / 2 - 5, y - 5);
    this.ctx.lineTo(x - tapeWidth / 2 - 5, y + 5);
    this.ctx.lineTo(x - tapeWidth / 2 + 5, y);
    this.ctx.closePath();
    this.ctx.fill();

    // Label
    this.ctx.fillStyle = "#0f0";
    this.ctx.font = "bold 11px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText("KT", x, y + tapeHeight / 2 + 15);
  }

  _drawAltitudeTape(x, y) {
    const tapeHeight = 200;
    const tapeWidth = 40;
    const altitude = this.telemetry.altitude;

    // Tape background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(x - tapeWidth / 2, y - tapeHeight / 2, tapeWidth, tapeHeight);

    // Draw altitude markings
    this.ctx.strokeStyle = "#fff";
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "10px monospace";
    this.ctx.textAlign = "left";
    this.ctx.lineWidth = 1;

    for (let i = 0; i <= 3000; i += 100) {
      const offset = ((i - altitude) / 100) * 10;
      if (Math.abs(offset) > tapeHeight / 2) continue;

      const mark_width = i % 500 === 0 ? 8 : 4;
      this.ctx.beginPath();
      this.ctx.moveTo(x - tapeWidth / 2, y + offset);
      this.ctx.lineTo(x - tapeWidth / 2 + mark_width, y + offset);
      this.ctx.stroke();

      if (i % 500 === 0) {
        this.ctx.fillText(i / 100, x + 5, y + offset + 3);
      }
    }

    // Center pointer
    this.ctx.fillStyle = "#00ff00";
    this.ctx.beginPath();
    this.ctx.moveTo(x + tapeWidth / 2 + 5, y - 5);
    this.ctx.lineTo(x + tapeWidth / 2 + 5, y + 5);
    this.ctx.lineTo(x + tapeWidth / 2 - 5, y);
    this.ctx.closePath();
    this.ctx.fill();

    // Label
    this.ctx.fillStyle = "#0f0";
    this.ctx.font = "bold 11px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText("M", x, y + tapeHeight / 2 + 15);
  }

  _drawHeadingTape(x, y) {
    const tapeWidth = 200;
    const tapeHeight = 30;
    const heading = this.telemetry.heading;

    // Tape background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(x - tapeWidth / 2, y - tapeHeight / 2, tapeWidth, tapeHeight);

    // Draw heading markings
    this.ctx.strokeStyle = "#fff";
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "9px monospace";
    this.ctx.textAlign = "center";
    this.ctx.lineWidth = 1;

    for (let i = 0; i < 360; i += 10) {
      const offset = ((i - heading + 180) % 360 - 180) * (tapeWidth / 360);
      if (Math.abs(offset) > tapeWidth / 2) continue;

      const mark_height = i % 30 === 0 ? 10 : 5;
      this.ctx.beginPath();
      this.ctx.moveTo(x + offset, y - tapeHeight / 2);
      this.ctx.lineTo(x + offset, y - tapeHeight / 2 + mark_height);
      this.ctx.stroke();

      if (i % 30 === 0) {
        this.ctx.fillText(i / 10, x + offset, y + tapeHeight / 2 - 2);
      }
    }

    // Center pointer
    this.ctx.fillStyle = "#ff0000";
    this.ctx.beginPath();
    this.ctx.moveTo(x - 5, y + tapeHeight / 2);
    this.ctx.lineTo(x + 5, y + tapeHeight / 2);
    this.ctx.lineTo(x, y + tapeHeight / 2 + 6);
    this.ctx.closePath();
    this.ctx.fill();
  }

  _drawVSI(x, y) {
    // Vertical Speed Indicator
    const size = 30;

    // Dial
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.stroke();

    // Center dot
    this.ctx.fillStyle = "#fff";
    this.ctx.beginPath();
    this.ctx.arc(x, y, 3, 0, Math.PI * 2);
    this.ctx.fill();

    // Label
    this.ctx.fillStyle = "#0f0";
    this.ctx.font = "bold 9px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText("VS", x, y + size + 12);
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
