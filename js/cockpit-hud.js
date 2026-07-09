// Realistic F-16 style HUD: artificial horizon, speed tape, altitude tape, heading tape
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

    // Draw instruments (F-16 style HUD layout)
    this._drawSpeedTape(60, centerY);
    this._drawAltitudeTape(w - 60, centerY);
    this._drawArtificialHorizon(centerX, centerY);
    this._drawHeadingTape(centerX, h - 80);
    this._drawVSI(w - 120, centerY - 180);
  }

  _drawArtificialHorizon(x, y) {
    const size = 120;
    const pitch = this.telemetry.pitch;
    const roll = this.telemetry.roll;

    this.ctx.save();

    // Clip to circle to prevent content from showing outside
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.clip();

    this.ctx.translate(x, y);
    this.ctx.rotate(roll);

    // Sky (transparent blue area)
    this.ctx.fillStyle = "rgba(135, 206, 235, 0.15)";
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size, 0, Math.PI * 2);
    this.ctx.fill();

    // Horizon line
    this.ctx.strokeStyle = "#0f0";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(-size * 1.5, -pitch * 30);
    this.ctx.lineTo(size * 1.5, -pitch * 30);
    this.ctx.stroke();

    // Pitch ladder - constrained within circle
    this.ctx.strokeStyle = "#0f0";
    this.ctx.lineWidth = 1;
    this.ctx.font = "bold 11px monospace";
    this.ctx.fillStyle = "#0f0";
    this.ctx.textAlign = "center";

    for (let i = -30; i <= 30; i += 5) {
      if (i === 0) continue;
      const y_offset = -pitch * 30 + i * 6;

      const mark_width = i % 10 === 0 ? 50 : 30;
      this.ctx.beginPath();
      this.ctx.moveTo(-mark_width / 2, y_offset);
      this.ctx.lineTo(mark_width / 2, y_offset);
      this.ctx.stroke();

      if (i % 10 === 0 && i !== 0) {
        // Only draw numbers if they fit within circle bounds
        if (Math.abs(y_offset) < size - 20) {
          this.ctx.fillText(i, -60, y_offset + 4);
          this.ctx.fillText(i, 60, y_offset + 4);
        }
      }
    }

    // Center reference point
    this.ctx.strokeStyle = "#0f0";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();

    // Subtle circular frame
    this.ctx.strokeStyle = "rgba(0, 255, 0, 0.4)";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.stroke();

    // Roll reference marks (subtle, only major marks)
    this.ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
    this.ctx.lineWidth = 1;
    for (let angle = 0; angle < 360; angle += 30) {
      const rad = (angle * Math.PI) / 180;
      const fromX = x + Math.cos(rad) * (size + 3);
      const fromY = y + Math.sin(rad) * (size + 3);
      const toX = x + Math.cos(rad) * (size + 10);
      const toY = y + Math.sin(rad) * (size + 10);
      this.ctx.beginPath();
      this.ctx.moveTo(fromX, fromY);
      this.ctx.lineTo(toX, toY);
      this.ctx.stroke();
    }

    // Roll pointer (subtle)
    this.ctx.fillStyle = "rgba(0, 255, 0, 0.7)";
    const rollRad = (this.telemetry.roll * 180) / Math.PI;
    const pointerX = x + Math.sin(rollRad) * (size + 12);
    const pointerY = y - Math.cos(rollRad) * (size + 12);
    this.ctx.beginPath();
    this.ctx.moveTo(pointerX - 4, pointerY - 2);
    this.ctx.lineTo(pointerX + 4, pointerY - 2);
    this.ctx.lineTo(pointerX, pointerY + 4);
    this.ctx.closePath();
    this.ctx.fill();
  }

  _drawSpeedTape(x, y) {
    const tapeHeight = 250;
    const tapeWidth = 50;
    const speed = this.telemetry.airspeed;

    // Tape background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.strokeStyle = "#0f0";
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(x - tapeWidth / 2, y - tapeHeight / 2, tapeWidth, tapeHeight);
    this.ctx.strokeRect(x - tapeWidth / 2, y - tapeHeight / 2, tapeWidth, tapeHeight);

    // Draw speed markings
    this.ctx.strokeStyle = "#0f0";
    this.ctx.fillStyle = "#0f0";
    this.ctx.font = "bold 12px monospace";
    this.ctx.textAlign = "right";
    this.ctx.lineWidth = 2;

    for (let i = 0; i <= 300; i += 10) {
      const offset = ((i - speed) / 10) * 8;
      if (Math.abs(offset) > tapeHeight / 2 + 10) continue;

      const mark_width = i % 20 === 0 ? 12 : 6;
      this.ctx.beginPath();
      this.ctx.moveTo(x + tapeWidth / 2 - mark_width, y + offset);
      this.ctx.lineTo(x + tapeWidth / 2, y + offset);
      this.ctx.stroke();

      if (i % 20 === 0) {
        this.ctx.fillText(i, x - 8, y + offset + 4);
      }
    }

    // Center pointer (highlighted box)
    this.ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
    this.ctx.strokeStyle = "#0f0";
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(x - tapeWidth / 2, y - 10, tapeWidth, 20);
    this.ctx.strokeRect(x - tapeWidth / 2, y - 10, tapeWidth, 20);

    // Center arrow
    this.ctx.fillStyle = "#0f0";
    this.ctx.beginPath();
    this.ctx.moveTo(x - tapeWidth / 2 - 12, y - 6);
    this.ctx.lineTo(x - tapeWidth / 2 - 12, y + 6);
    this.ctx.lineTo(x - tapeWidth / 2 - 4, y);
    this.ctx.closePath();
    this.ctx.fill();

    // Label
    this.ctx.font = "bold 13px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText("KT", x, y + tapeHeight / 2 + 25);
  }

  _drawAltitudeTape(x, y) {
    const tapeHeight = 250;
    const tapeWidth = 50;
    const altitude = this.telemetry.altitude;

    // Tape background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.strokeStyle = "#0f0";
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(x - tapeWidth / 2, y - tapeHeight / 2, tapeWidth, tapeHeight);
    this.ctx.strokeRect(x - tapeWidth / 2, y - tapeHeight / 2, tapeWidth, tapeHeight);

    // Draw altitude markings
    this.ctx.strokeStyle = "#0f0";
    this.ctx.fillStyle = "#0f0";
    this.ctx.font = "bold 12px monospace";
    this.ctx.textAlign = "left";
    this.ctx.lineWidth = 2;

    for (let i = 0; i <= 5000; i += 100) {
      const offset = ((i - altitude) / 100) * 8;
      if (Math.abs(offset) > tapeHeight / 2 + 10) continue;

      const mark_width = i % 500 === 0 ? 12 : 6;
      this.ctx.beginPath();
      this.ctx.moveTo(x - tapeWidth / 2, y + offset);
      this.ctx.lineTo(x - tapeWidth / 2 + mark_width, y + offset);
      this.ctx.stroke();

      if (i % 500 === 0) {
        this.ctx.fillText((i / 100).toFixed(0), x + 8, y + offset + 4);
      }
    }

    // Center pointer (highlighted box)
    this.ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
    this.ctx.strokeStyle = "#0f0";
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(x - tapeWidth / 2, y - 10, tapeWidth, 20);
    this.ctx.strokeRect(x - tapeWidth / 2, y - 10, tapeWidth, 20);

    // Center arrow
    this.ctx.fillStyle = "#0f0";
    this.ctx.beginPath();
    this.ctx.moveTo(x + tapeWidth / 2 + 12, y - 6);
    this.ctx.lineTo(x + tapeWidth / 2 + 12, y + 6);
    this.ctx.lineTo(x + tapeWidth / 2 + 4, y);
    this.ctx.closePath();
    this.ctx.fill();

    // Label
    this.ctx.font = "bold 13px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText("FT", x, y + tapeHeight / 2 + 25);
  }

  _drawHeadingTape(x, y) {
    const tapeWidth = 280;
    const tapeHeight = 40;
    const heading = this.telemetry.heading;

    // Tape background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.strokeStyle = "#0f0";
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(x - tapeWidth / 2, y - tapeHeight / 2, tapeWidth, tapeHeight);
    this.ctx.strokeRect(x - tapeWidth / 2, y - tapeHeight / 2, tapeWidth, tapeHeight);

    // Draw heading markings
    this.ctx.strokeStyle = "#0f0";
    this.ctx.fillStyle = "#0f0";
    this.ctx.font = "bold 11px monospace";
    this.ctx.textAlign = "center";
    this.ctx.lineWidth = 2;

    for (let i = 0; i < 360; i += 10) {
      const offset = ((i - heading + 180) % 360 - 180) * (tapeWidth / 360);
      if (Math.abs(offset) > tapeWidth / 2) continue;

      const mark_height = i % 30 === 0 ? 14 : 7;
      this.ctx.beginPath();
      this.ctx.moveTo(x + offset, y - tapeHeight / 2);
      this.ctx.lineTo(x + offset, y - tapeHeight / 2 + mark_height);
      this.ctx.stroke();

      if (i % 30 === 0) {
        const dir = i === 0 ? "N" : i === 90 ? "E" : i === 180 ? "S" : i === 270 ? "W" : (i / 10).toFixed(0);
        this.ctx.fillText(dir, x + offset, y + tapeHeight / 2 - 5);
      }
    }

    // Center pointer
    this.ctx.fillStyle = "#0f0";
    this.ctx.beginPath();
    this.ctx.moveTo(x - 6, y - tapeHeight / 2 - 8);
    this.ctx.lineTo(x + 6, y - tapeHeight / 2 - 8);
    this.ctx.lineTo(x, y - tapeHeight / 2);
    this.ctx.closePath();
    this.ctx.fill();

    // Current heading display
    this.ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
    this.ctx.strokeStyle = "#0f0";
    this.ctx.fillRect(x - 30, y - 8, 60, 16);
    this.ctx.strokeRect(x - 30, y - 8, 60, 16);
    this.ctx.font = "bold 13px monospace";
    this.ctx.fillStyle = "#0f0";
    this.ctx.fillText((heading.toFixed(0)).padStart(3, "0"), x, y + 4);
  }

  _drawVSI(x, y) {
    // Vertical Speed Indicator (Rate of climb)
    const size = 50;

    // Dial background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = "#0f0";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.stroke();

    // Scale marks (up/down)
    this.ctx.strokeStyle = "#0f0";
    this.ctx.lineWidth = 1;
    for (let i = -8; i <= 8; i++) {
      if (i === 0) continue;
      const angle = (i / 8) * Math.PI * 0.8 - Math.PI * 0.4;
      const fromR = size - 12;
      const toR = size - 6;
      const fromX = x + Math.cos(angle) * fromR;
      const fromY = y + Math.sin(angle) * fromR;
      const toX = x + Math.cos(angle) * toR;
      const toY = y + Math.sin(angle) * toR;
      this.ctx.beginPath();
      this.ctx.moveTo(fromX, fromY);
      this.ctx.lineTo(toX, toY);
      this.ctx.stroke();
    }

    // Center reference
    this.ctx.fillStyle = "#0f0";
    this.ctx.beginPath();
    this.ctx.arc(x, y, 4, 0, Math.PI * 2);
    this.ctx.fill();

    // Label
    this.ctx.font = "bold 11px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText("VSI", x, y + size + 15);
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
