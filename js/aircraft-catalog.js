// Phase 5: multiple selectable aircraft, each with its own tuned
// AircraftConfig (mass/wing area/thrust/stall/rates — see the coefficient
// model in physics.js) and its own primitive-geometry silhouette, standing
// in for real per-aircraft models until real assets exist. Roughly-realistic
// numbers per type (light GA prop, narrow-body airliner, fighter jet) so the
// three feel distinctly different to fly, not just re-skinned.

import * as THREE from "three";
import { AircraftConfig } from "./physics.js";

function buildLightAircraftMesh() {
  const group = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0xe8e8e8 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xd94f4f });

  // Use ConeGeometry instead of CapsuleGeometry (r0.185 doesn't have CapsuleGeometry)
  const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.55, 4.2, 8), body);
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);

  const nose = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.8, 8), trim);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -2.9;
  group.add(nose);

  // High-mounted wing, characteristic of a Cessna-style GA aircraft.
  const wings = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.12, 1.3), trim);
  wings.position.set(0, 0.6, 0.2);
  group.add(wings);

  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.7), body);
  tailWing.position.z = 2.3;
  group.add(tailWing);

  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.9), trim);
  tailFin.position.set(0, 0.5, 2.3);
  group.add(tailFin);

  return group;
}

function buildAirlinerMesh() {
  const group = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0xf2f2f2 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x2166b8 });
  const engineMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

  // Use elongated cone for fuselage
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.5, 22, 8), body);
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);

  // Swept wings, mounted low.
  const wings = new THREE.Mesh(new THREE.BoxGeometry(34, 0.3, 4), trim);
  wings.position.set(0, -0.6, 2);
  wings.rotation.y = THREE.MathUtils.degToRad(22);
  group.add(wings);

  const engineLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.2, 12), engineMaterial);
  engineLeft.rotation.x = Math.PI / 2;
  engineLeft.position.set(-7.5, -1.8, 3);
  group.add(engineLeft);

  const engineRight = engineLeft.clone();
  engineRight.position.x = 7.5;
  group.add(engineRight);

  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 2.5), trim);
  tailWing.position.z = 10.5;
  group.add(tailWing);

  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 3.5), trim);
  tailFin.position.set(0, 2, 10.5);
  group.add(tailFin);

  return group;
}

function buildFighterMesh() {
  const group = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x5c6570 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x1a1e22 });

  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 8, 10), body);
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);

  // Wide delta wing, swept hard, mounted mid-fuselage.
  const wings = new THREE.Mesh(new THREE.CapsuleGeometry(6.5, 7, 3), trim);
  wings.rotation.x = Math.PI / 2;
  wings.rotation.z = Math.PI / 2;
  wings.scale.set(1, 1, 0.22);
  wings.position.set(0, -0.1, 0.8);
  group.add(wings);

  const tailFinLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 1.6), trim);
  tailFinLeft.position.set(-0.6, 0.6, 3.4);
  tailFinLeft.rotation.z = THREE.MathUtils.degToRad(15);
  group.add(tailFinLeft);

  const tailFinRight = tailFinLeft.clone();
  tailFinRight.position.x = 0.6;
  tailFinRight.rotation.z = -THREE.MathUtils.degToRad(15);
  group.add(tailFinRight);

  return group;
}

export const AIRCRAFT_CATALOG = [
  {
    id: "cessna",
    name: "Cessna 172",
    description: "Light GA trainer. Forgiving, slow, easy to land.",
    cockpitOffsetLocal: new THREE.Vector3(0, 0.75, -0.4),
    buildMesh: buildLightAircraftMesh,
    configOverrides: {
      mass: 1100,
      wingArea: 16,
      maxThrust: 2200,
      stallAngleRad: THREE.MathUtils.degToRad(16),
      maxLiftCoefficient: 1.4,
      zeroLiftDragCoefficient: 0.035,
      inducedDragFactor: 0.05,
      maxPitchRate: THREE.MathUtils.degToRad(30),
      maxRollRate: THREE.MathUtils.degToRad(90),
      maxYawRate: THREE.MathUtils.degToRad(15),
    },
  },
  {
    id: "airliner",
    name: "737-class Airliner",
    description: "Heavy and stable. Slow to respond, punishing to mishandle.",
    cockpitOffsetLocal: new THREE.Vector3(0, 2.4, -11),
    buildMesh: buildAirlinerMesh,
    configOverrides: {
      mass: 70000,
      wingArea: 125,
      maxThrust: 234000,
      stallAngleRad: THREE.MathUtils.degToRad(14),
      maxLiftCoefficient: 1.6,
      zeroLiftDragCoefficient: 0.02,
      inducedDragFactor: 0.04,
      maxPitchRate: THREE.MathUtils.degToRad(8),
      maxRollRate: THREE.MathUtils.degToRad(25),
      maxYawRate: THREE.MathUtils.degToRad(5),
    },
  },
  {
    id: "fighter",
    name: "F-16-class Fighter",
    description: "Fast, twitchy, high-alpha capable. Unforgiving of ham fists.",
    cockpitOffsetLocal: new THREE.Vector3(0, 0.85, -1.2),
    buildMesh: buildFighterMesh,
    configOverrides: {
      mass: 9000,
      wingArea: 27,
      maxThrust: 130000,
      stallAngleRad: THREE.MathUtils.degToRad(20),
      maxLiftCoefficient: 1.8,
      zeroLiftDragCoefficient: 0.02,
      inducedDragFactor: 0.06,
      maxPitchRate: THREE.MathUtils.degToRad(60),
      maxRollRate: THREE.MathUtils.degToRad(240),
      maxYawRate: THREE.MathUtils.degToRad(30),
    },
  },
];

export function createAircraftConfig(catalogEntry) {
  return new AircraftConfig(catalogEntry.configOverrides);
}
