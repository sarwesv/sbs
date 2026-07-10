// Realistic flight simulator HUD with analog gauges
// Professional styling matching real aircraft instruments

export class RealisticHUD {
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
      vsi: 0
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

    // Clear canvas
    this.ctx.fillStyle = "rgba(0, 0, 0, 0)";
    this.ctx.fillRect(0, 0, w, h);

    // Draw top HUD bar
    this._drawTopHUD(w, h);

    // Draw bottom instrument panel
    this._drawBottomPanel(w, h);
  }

  _drawTopHUD(w, h) {
    const y = 30;
    const padding = 40;

    // Top bar background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.ctx.fillRect(0, 0, w, 60);

    // Draw readouts
    this.ctx.font = "bold 16px monospace";
    this.ctx.fillStyle = "#e0e0e0";
    this.ctx.textAlign = "center";

    // Speed (left)
    this.ctx.fillText(`${Math.round(this.telemetry.airspeed)} KTS`, padding, y);

    // Heading (center-left)
    this.ctx.fillText(`HDG ${Math.round(this.telemetry.heading)}°`, padding + 150, y);

    // Altitude (center)
    this.ctx.fillText(`ALT ${Math.round(this.telemetry.altitude)}m`, w / 2, y);

    // VSI (center-right)
    const vsiValue = (this.telemetry.pitch * 100).toFixed(0);
    this.ctx.fillText(`VS ${vsiValue}`, w - padding - 150, y);

    // Status (right)
    this.ctx.fillStyle = "#4a9eff";
    this.ctx.fillText("NAV", w - padding, y);
  }

  _drawBottomPanel(w, h) {
    const panelHeight = 140;
    const panelY = h - panelHeight;

    // Panel background
    this.ctx.fillStyle = "rgba(20, 20, 20, 0.8)";
    this.ctx.fillRect(0, panelY, w, panelHeight);

    // Border
    this.ctx.strokeStyle = "#444";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, panelY, w, panelHeight);

    // Draw gauges
    const gaugeSpacing = w / 6;
    const gaugeY = panelY + 70;

    // Compass
    this._drawCompass(gaugeSpacing * 0.7, gaugeY, 50);

    // Altitude gauge
    this._drawAltitudeGauge(gaugeSpacing * 1.7, gaugeY, 50);

    // Speed gauge
    this._drawSpeedGauge(gaugeSpacing * 2.7, gaugeY, 50);

    // Heading display
    this._drawHeadingDisplay(gaugeSpacing * 3.7, gaugeY, 50);

    // VSI gauge
    this._drawVSIGauge(gaugeSpacing * 4.7, gaugeY, 50);

    // Bank/Pitch display
    this._drawBankDisplay(gaugeSpacing * 5.7, gaugeY, 50);
  }

  _drawCompass(x, y, size) {
    // Dial background
    this.ctx.fillStyle = "#2a2a2a";
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();

    // Compass ring
    this.ctx.strokeStyle = "#666";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.stroke();

    // Cardinal directions
    this.ctx.font = "bold 12px monospace";
    this.ctx.fillStyle = "#fff";
    this.ctx.textAlign = "center";
    this.ctx.fillText("N", x, y - size + 15);
    this.ctx.fillText("S", x, y + size - 5);
    this.ctx.fillStyle = "#aaa";
    this.ctx.fillText("E", x + size - 10, y + 5);
    this.ctx.fillText("W", x - size + 10, y + 5);

    // Heading pointer
    this.ctx.strokeStyle = "#4a9eff";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x, y - size + 5);
    this.ctx.stroke();

    // Label
    this.ctx.font = "bold 10px monospace";
    this.ctx.fillStyle = "#4a9eff";
    this.ctx.fillText("HDG", x, y + size + 12);
  }

  _drawAltitudeGauge(x, y, size) {
    this.ctx.fillStyle = "#2a2a2a";
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = "#666";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.stroke();

    // Needle
    const altAngle = (this.telemetry.altitude / 5000) * Math.PI * 2;
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x + Math.cos(altAngle - Math.PI / 2) * (size - 8), y + Math.sin(altAngle - Math.PI / 2) * (size - 8));
    this.ctx.stroke();

    this.ctx.font = "bold 10px monospace";
    this.ctx.fillStyle = "#4a9eff";
    this.ctx.textAlign = "center";
    this.ctx.fillText("ALT", x, y + size + 12);
  }

  _drawSpeedGauge(x, y, size) {
    this.ctx.fillStyle = "#2a2a2a";
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = "#666";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.stroke();

    // Needle
    const speedAngle = (this.telemetry.airspeed / 200) * Math.PI * 2;
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x + Math.cos(speedAngle - Math.PI / 2) * (size - 8), y + Math.sin(speedAngle - Math.PI / 2) * (size - 8));
    this.ctx.stroke();

    this.ctx.font = "bold 10px monospace";
    this.ctx.fillStyle = "#4a9eff";
    this.ctx.textAlign = "center";
    this.ctx.fillText("SPD", x, y + size + 12);
  }

  _drawHeadingDisplay(x, y, size) {
    // Box display
    this.ctx.fillStyle = "#1a1a1a";
    this.ctx.fillRect(x - 25, y - 15, 50, 30);

    this.ctx.strokeStyle = "#666";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - 25, y - 15, 50, 30);

    this.ctx.font = "bold 14px monospace";
    this.ctx.fillStyle = "#4a9eff";
    this.ctx.textAlign = "center";
    this.ctx.fillText(Math.round(this.telemetry.heading).toString().padStart(3, "0"), x, y + 5);

    this.ctx.font = "bold 10px monospace";
    this.ctx.fillStyle = "#a0a0a0";
    this.ctx.fillText("HDG", x, y + 20);
  }

  _drawVSIGauge(x, y, size) {
    this.ctx.fillStyle = "#2a2a2a";
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = "#666";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.stroke();

    // Vertical line (neutral)
    this.ctx.strokeStyle = "#444";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - size + 5);
    this.ctx.lineTo(x, y + size - 5);
    this.ctx.stroke();

    // VSI needle (vertical speed)
    const vsiNeedle = this.telemetry.pitch * 20; // -20 to +20 pixels
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x, y + vsiNeedle);
    this.ctx.stroke();

    this.ctx.font = "bold 10px monospace";
    this.ctx.fillStyle = "#4a9eff";
    this.ctx.textAlign = "center";
    this.ctx.fillText("VSI", x, y + size + 12);
  }

  _drawBankDisplay(x, y, size) {
    // Box display
    this.ctx.fillStyle = "#1a1a1a";
    this.ctx.fillRect(x - 25, y - 15, 50, 30);

    this.ctx.strokeStyle = "#666";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - 25, y - 15, 50, 30);

    this.ctx.font = "bold 14px monospace";
    this.ctx.fillStyle = "#4a9eff";
    this.ctx.textAlign = "center";
    const bankDeg = (this.telemetry.roll * 180 / Math.PI).toFixed(1);
    this.ctx.fillText(bankDeg + "°", x, y + 5);

    this.ctx.font = "bold 10px monospace";
    this.ctx.fillStyle = "#a0a0a0";
    this.ctx.fillText("BANK", x, y + 20);
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
