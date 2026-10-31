import * as THREE from 'three';
import { materials } from './materials.js';

let crossbowGroup = null;
let loadedBoltMesh = null;
let weaponRestPos = new THREE.Vector3(0.24, -0.32, -0.62);
let weaponRestRot = new THREE.Euler(-0.06, 0.06, -0.04);
let currentRecoil = 0;

/**
 * Cria a Besta Medieval (Crossbow) com alto nível de detalhe em Three.js
 * e acopla à câmera em visual de primeira pessoa.
 */
export function createWeapon(camera) {
  crossbowGroup = new THREE.Group();
  crossbowGroup.name = 'MedievalCrossbow';

  // 1. CORPO DA BESTA (Tiller / Coronha de Madeira)
  // Viga principal onde corre o dardo
  const stockGeom = new THREE.BoxGeometry(0.08, 0.09, 0.72);
  const stockMesh = new THREE.Mesh(stockGeom, materials.wood);
  stockMesh.castShadow = true;
  crossbowGroup.add(stockMesh);

  // Canaleta metálica (trilho do dardo) no topo da coronha
  const railGeom = new THREE.BoxGeometry(0.05, 0.015, 0.55);
  const railMesh = new THREE.Mesh(railGeom, materials.steel);
  railMesh.position.set(0, 0.05, -0.04);
  railMesh.castShadow = true;
  crossbowGroup.add(railMesh);

  // Empunhadura / Coronha traseira chanfrada
  const gripGeom = new THREE.BoxGeometry(0.07, 0.16, 0.18);
  const gripMesh = new THREE.Mesh(gripGeom, materials.wood);
  gripMesh.position.set(0, -0.08, 0.28);
  gripMesh.rotation.x = -Math.PI / 6;
  gripMesh.castShadow = true;
  crossbowGroup.add(gripMesh);

  // Guarda-mato e Gatilho de latão
  const guardGeom = new THREE.TorusGeometry(0.05, 0.008, 8, 16, Math.PI);
  const guardMesh = new THREE.Mesh(guardGeom, materials.iron);
  guardMesh.rotation.x = Math.PI;
  guardMesh.position.set(0, -0.05, 0.12);
  crossbowGroup.add(guardMesh);

  const triggerGeom = new THREE.BoxGeometry(0.012, 0.04, 0.015);
  const triggerMesh = new THREE.Mesh(triggerGeom, materials.brass);
  triggerMesh.position.set(0, -0.06, 0.11);
  triggerMesh.rotation.x = Math.PI / 6;
  crossbowGroup.add(triggerMesh);

  // 2. ARCO FRONTAL DE AÇO (Prod / Limbs)
  // Braçadeira de ferro frontal que prende o arco à coronha
  const bracketGeom = new THREE.BoxGeometry(0.12, 0.11, 0.06);
  const bracketMesh = new THREE.Mesh(bracketGeom, materials.iron);
  bracketMesh.position.set(0, 0.005, -0.32);
  bracketMesh.castShadow = true;
  crossbowGroup.add(bracketMesh);

  // Estribo frontal de ferro (Foot Stirrup) para armar a besta com o pé
  const stirrupGeom = new THREE.TorusGeometry(0.08, 0.012, 8, 16, Math.PI * 1.5);
  const stirrupMesh = new THREE.Mesh(stirrupGeom, materials.iron);
  stirrupMesh.rotation.x = Math.PI / 2;
  stirrupMesh.rotation.z = Math.PI / 4;
  stirrupMesh.position.set(0, 0, -0.42);
  stirrupMesh.castShadow = true;
  crossbowGroup.add(stirrupMesh);

  // Braços do arco curvados em aço (Lado Esquerdo e Direito)
  const armGeom = new THREE.BoxGeometry(0.32, 0.035, 0.02);
  
  // Braço Esquerdo
  const leftArm = new THREE.Mesh(armGeom, materials.steel);
  leftArm.position.set(-0.16, 0.01, -0.32);
  leftArm.rotation.y = THREE.MathUtils.degToRad(16);
  leftArm.castShadow = true;
  crossbowGroup.add(leftArm);

  // Ponta do Braço Esquerdo (nock)
  const leftTip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.028, 0.018), materials.steel);
  leftTip.position.set(-0.35, 0.01, -0.27);
  leftTip.rotation.y = THREE.MathUtils.degToRad(42);
  leftTip.castShadow = true;
  crossbowGroup.add(leftTip);

  // Braço Direito
  const rightArm = new THREE.Mesh(armGeom, materials.steel);
  rightArm.position.set(0.16, 0.01, -0.32);
  rightArm.rotation.y = THREE.MathUtils.degToRad(-16);
  rightArm.castShadow = true;
  crossbowGroup.add(rightArm);

  // Ponta do Braço Direito (nock)
  const rightTip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.028, 0.018), materials.steel);
  rightTip.position.set(0.35, 0.01, -0.27);
  rightTip.rotation.y = THREE.MathUtils.degToRad(-42);
  rightTip.castShadow = true;
  crossbowGroup.add(rightTip);

  // 3. CORDA DA BESTA (Bowstring esticada)
  // Corda esticada da ponta esquerda até a noz central e até a ponta direita
  const stringMat = new THREE.MeshLambertMaterial({ color: 0xdedede });
  const stringGeomL = new THREE.CylinderGeometry(0.005, 0.005, 0.44, 6);
  const stringL = new THREE.Mesh(stringGeomL, stringMat);
  stringL.position.set(-0.2, 0.015, -0.16);
  stringL.rotation.z = THREE.MathUtils.degToRad(68);
  stringL.rotation.y = THREE.MathUtils.degToRad(22);
  crossbowGroup.add(stringL);

  const stringGeomR = new THREE.CylinderGeometry(0.005, 0.005, 0.44, 6);
  const stringR = new THREE.Mesh(stringGeomR, stringMat);
  stringR.position.set(0.2, 0.015, -0.16);
  stringR.rotation.z = THREE.MathUtils.degToRad(-68);
  stringR.rotation.y = THREE.MathUtils.degToRad(-22);
  crossbowGroup.add(stringR);

  // Mola de retenção do dardo (clip superior)
  const springGeom = new THREE.BoxGeometry(0.015, 0.008, 0.16);
  const springMesh = new THREE.Mesh(springGeom, materials.iron);
  springMesh.position.set(0, 0.08, -0.04);
  springMesh.rotation.x = THREE.MathUtils.degToRad(6);
  crossbowGroup.add(springMesh);

  // 4. DARDO POSICIONADO SOBRE A BESTA (Exigência crucial do enunciado)
  // "É importante que o dardo fique visível sobre a besta antes de ser disparado."
  loadedBoltMesh = createBoltMesh();
  loadedBoltMesh.name = 'LoadedBolt';
  loadedBoltMesh.position.set(0, 0.065, -0.12);
  crossbowGroup.add(loadedBoltMesh);

  // Posicionamento e orientação da Besta na visão em primeira pessoa
  crossbowGroup.position.copy(weaponRestPos);
  crossbowGroup.rotation.copy(weaponRestRot);

  camera.add(crossbowGroup);
  return crossbowGroup;
}

/**
 * Constrói a geometria de alta qualidade do Dardo Medieval (Bolt / Quarrel)
 * com ponta piramidal perfurante, haste torneada e aletas estabilizadoras.
 */
export function createBoltMesh() {
  const boltGroup = new THREE.Group();
  boltGroup.name = 'CrossbowBolt';

  // Haste de madeira torneada
  const shaftGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8);
  const shaftMesh = new THREE.Mesh(shaftGeom, materials.woodPlanks);
  shaftMesh.rotation.x = Math.PI / 2;
  shaftMesh.castShadow = true;
  boltGroup.add(shaftMesh);

  // Ponta piramidal/cônica perfurante em metal (Quarrel point)
  const tipGeom = new THREE.ConeGeometry(0.022, 0.09, 4); // 4 faces: ponta piramidal autêntica
  const tipMesh = new THREE.Mesh(tipGeom, materials.arrowTip);
  tipMesh.rotation.x = -Math.PI / 2;
  tipMesh.position.set(0, 0, -0.24);
  tipMesh.castShadow = true;
  boltGroup.add(tipMesh);

  // Aletas estabilizadoras traseiras (Fletchings em couro/pena vermelha)
  const vaneGeom = new THREE.BoxGeometry(0.004, 0.035, 0.10);
  
  // Aleta vertical
  const vaneV = new THREE.Mesh(vaneGeom, materials.fletching);
  vaneV.position.set(0, 0, 0.14);
  boltGroup.add(vaneV);

  // Aleta horizontal
  const vaneH = new THREE.Mesh(vaneGeom, materials.fletching);
  vaneH.rotation.z = Math.PI / 2;
  vaneH.position.set(0, 0, 0.14);
  boltGroup.add(vaneH);

  // Entalhe traseiro (Nock)
  const nockGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.02, 6);
  const nockMesh = new THREE.Mesh(nockGeom, materials.iron);
  nockMesh.rotation.x = Math.PI / 2;
  nockMesh.position.set(0, 0, 0.21);
  boltGroup.add(nockMesh);

  return boltGroup;
}

/**
 * Controla a visibilidade do dardo carregado na besta
 */
export function setLoadedBoltVisible(visible) {
  if (loadedBoltMesh) {
    loadedBoltMesh.visible = visible;
  }
}

/**
 * Aplica o coice (recoil) ao disparar
 */
export function triggerCrossbowRecoil() {
  currentRecoil = 0.09;
}

/**
 * Atualiza animações da besta (coice, recarga e repouso)
 */
export function updateWeaponAnimation(delta, reloadRatio) {
  if (!crossbowGroup) return;

  // Recuperação do coice
  if (currentRecoil > 0) {
    currentRecoil = Math.max(0, currentRecoil - delta * 0.45);
  }

  // Posição final combinando repouso e coice
  crossbowGroup.position.set(
    weaponRestPos.x,
    weaponRestPos.y + currentRecoil * 0.25,
    weaponRestPos.z + currentRecoil
  );

  // Recarga: o dardo reaparece na besta quando a recarga passa de 45%
  if (reloadRatio > 0.45) {
    setLoadedBoltVisible(true);
  }
}
