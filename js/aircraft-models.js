// Aircraft models with different flight characteristics
// Based on real-world performance data

export const AIRCRAFT_MODELS = {
  cessna172: {
    name: "Cessna 172",
    maxThrust: 75000, // N (75 kN, ~110 hp)
    mass: 1100, // kg
    wingArea: 16.2, // m²
    stallAngleRad: 0.209, // ~12°
    maxLiftCoefficient: 1.4,
    dragCoefficient: 0.027,
    dragCoefficientAtStall: 0.05,
    maxRollRate: Math.PI / 2, // rad/s
    maxPitchRate: Math.PI / 2,
    maxYawRate: Math.PI / 3,
    description: "Light aircraft - slow, stable, good for learning"
  },
  f16: {
    name: "F-16 Fighting Falcon",
    maxThrust: 108000, // N (108 kN)
    mass: 8750, // kg
    wingArea: 27.87, // m²
    stallAngleRad: 0.279, // ~16°
    maxLiftCoefficient: 1.6,
    dragCoefficient: 0.015,
    dragCoefficientAtStall: 0.04,
    maxRollRate: Math.PI * 2.5, // rad/s (fast rolls)
    maxPitchRate: Math.PI * 1.8,
    maxYawRate: Math.PI * 1.5,
    description: "Fighter jet - fast, agile, challenging"
  },
  airbus380: {
    name: "Airbus A380",
    maxThrust: 340000, // N (4x Rolls-Royce Trent 900)
    mass: 575000, // kg
    wingArea: 845, // m²
    stallAngleRad: 0.209, // ~12°
    maxLiftCoefficient: 1.5,
    dragCoefficient: 0.022,
    dragCoefficientAtStall: 0.045,
    maxRollRate: Math.PI / 4, // rad/s (slow rolls)
    maxPitchRate: Math.PI / 6,
    maxYawRate: Math.PI / 8,
    description: "Large airliner - slow, heavy, requires planning"
  },
  x15: {
    name: "North American X-15",
    maxThrust: 310000, // N (310 kN rocket)
    mass: 6600, // kg
    wingArea: 18.6, // m²
    stallAngleRad: 0.244, // ~14°
    maxLiftCoefficient: 1.3,
    dragCoefficient: 0.02,
    dragCoefficientAtStall: 0.04,
    maxRollRate: Math.PI * 3, // rad/s
    maxPitchRate: Math.PI * 2,
    maxYawRate: Math.PI * 1.2,
    description: "Hypersonic rocket plane - extreme performance"
  },
  erj145: {
    name: "Embraer ERJ-145",
    maxThrust: 86000, // N (2x Allison AE3007A)
    mass: 37500, // kg
    wingArea: 51.18, // m²
    stallAngleRad: 0.244, // ~14°
    maxLiftCoefficient: 1.6,
    dragCoefficient: 0.018,
    dragCoefficientAtStall: 0.043,
    maxRollRate: Math.PI / 3,
    maxPitchRate: Math.PI / 4,
    maxYawRate: Math.PI / 5,
    description: "Regional jet - nimble and efficient"
  }
};

export const DEFAULT_AIRCRAFT = "cessna172";
