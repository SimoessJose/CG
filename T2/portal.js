import * as THREE from 'three';
import { collidableObjects, gameState, pedestals, showNotification, updateKeysHUD } from './gameState.js';
import { materials } from './materials.js';

let portalGroup = null;
let hatchDoorLeft = null;
let hatchDoorRight = null;
let portalVortex = null;
let portalBeam = null;
let portalLight = null;
let portalCenterPos = new THREE.Vector3(0, 0.3, 0);

/**
 * Cria o conjunto do Portal no pátio interno:
 * - Plataforma circular (Dais)
 * - Escotilha circular de metal bipartida
 * - 4 Pedestais ao redor da escotilha
 * - Efeitos visuais do portal (vórtice, feixe de luz e iluminação)
 */
export function createPortalDais(scene, position = new THREE.Vector3(0, 0.1, 0)) {
  portalGroup = new THREE.Group();
  portalGroup.position.copy(position);
  portalCenterPos.copy(position);

  // 1. Plataforma circular elevada (Dais)
  const daisMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(13.5, 14.5, 0.6, 32),
    materials.stoneDark
  );
  daisMesh.position.y = 0.3;
  daisMesh.receiveShadow = true;
  daisMesh.castShadow = true;
  portalGroup.add(daisMesh);
  collidableObjects.push(daisMesh);

  // Anel decorativo de pedra polida ao redor da escotilha
  const rimMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(5.2, 5.5, 0.15, 32),
    materials.stoneLight
  );
  rimMesh.position.y = 0.65;
  rimMesh.receiveShadow = true;
  portalGroup.add(rimMesh);

  // Poço interno escuro abaixo da escotilha (abismo do portal)
  const pitMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.2, 2.5, 32, 1, true),
    materials.iron
  );
  pitMesh.position.y = -0.5;
  portalGroup.add(pitMesh);

  // Fundo do poço
  const pitBottom = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 32),
    new THREE.MeshLambertMaterial({ color: 0x050508 })
  );
  pitBottom.rotation.x = -Math.PI / 2;
  pitBottom.position.y = -1.6;
  portalGroup.add(pitBottom);

  // 2. Escotilha Circular no chão (Dividida em 2 portas semicirculares que abrem deslizando)
  const hatchRadius = 4.3;
  const hatchThickness = 0.25;

  // Geometria semicircular para cada lado da escotilha
  const halfCircleGeom = new THREE.CylinderGeometry(
    hatchRadius, hatchRadius, hatchThickness, 24, 1, false, 0, Math.PI
  );

  // Porta Esquerda da Escotilha
  hatchDoorLeft = new THREE.Mesh(halfCircleGeom, materials.hatchMetal);
  hatchDoorLeft.rotation.y = -Math.PI / 2;
  hatchDoorLeft.position.set(0, 0.68, 0);
  hatchDoorLeft.castShadow = true;
  hatchDoorLeft.receiveShadow = true;
  portalGroup.add(hatchDoorLeft);

  // Porta Direita da Escotilha
  hatchDoorRight = new THREE.Mesh(halfCircleGeom, materials.hatchMetal);
  hatchDoorRight.rotation.y = Math.PI / 2;
  hatchDoorRight.position.set(0, 0.68, 0);
  hatchDoorRight.castShadow = true;
  hatchDoorRight.receiveShadow = true;
  portalGroup.add(hatchDoorRight);

  // Detalhes metálicos ornamentais na escotilha
  const handleLeft = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 8, 16), materials.hatchTrim);
  handleLeft.rotation.x = Math.PI / 2;
  handleLeft.position.set(-1.2, 0.85, 0);
  portalGroup.add(handleLeft);

  const handleRight = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 8, 16), materials.hatchTrim);
  handleRight.rotation.x = Math.PI / 2;
  handleRight.position.set(1.2, 0.85, 0);
  portalGroup.add(handleRight);

  // 3. Efeitos Místicos do Portal (Invisíveis até a abertura)
  // Disco vórtice animado
  const vortexGeom = new THREE.CircleGeometry(4.0, 32);
  portalVortex = new THREE.Mesh(vortexGeom, materials.portalVortex);
  portalVortex.rotation.x = -Math.PI / 2;
  portalVortex.position.y = 0.1;
  portalVortex.visible = false;
  portalGroup.add(portalVortex);

  // Feixe de luz vertical que dispara aos céus quando o portal é aberto
  const beamGeom = new THREE.CylinderGeometry(3.6, 3.6, 60, 24, 1, true);
  portalBeam = new THREE.Mesh(beamGeom, new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide
  }));
  portalBeam.position.y = 30;
  portalBeam.visible = false;
  portalGroup.add(portalBeam);

  // Luz pontual central que ilumina o ambiente ao abrir o portal
  portalLight = new THREE.PointLight(0x00e5ff, 0.0, 35);
  portalLight.position.set(0, 2, 0);
  portalGroup.add(portalLight);

  // 4. Criação dos 4 Pedestais ao redor da escotilha
  const pedestalDist = 8.2;
  const angles = [
    { name: 'Norte', angle: 0 },
    { name: 'Leste', angle: Math.PI / 2 },
    { name: 'Sul', angle: Math.PI },
    { name: 'Oeste', angle: (3 * Math.PI) / 2 }
  ];

  angles.forEach((dir, index) => {
    const px = Math.sin(dir.angle) * pedestalDist;
    const pz = Math.cos(dir.angle) * pedestalDist;

    const pedGroup = createSinglePedestal(index, dir.name, px, pz);
    portalGroup.add(pedGroup);
  });

  scene.add(portalGroup);
  return portalGroup;
}

/**
 * Constrói um pedestal individual detalhado
 */
function createSinglePedestal(index, directionName, relX, relZ) {
  const group = new THREE.Group();
  group.position.set(relX, 0.6, relZ);
  group.name = `Pedestal_${directionName}`;

  // Base do pedestal (plinto quadrangular)
  const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 1.8), materials.stoneDark);
  baseMesh.position.y = 0.2;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Coluna central (fuste canelado/cilíndrico)
  const shaftMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 2.0, 16), materials.stone);
  shaftMesh.position.y = 1.35;
  shaftMesh.castShadow = true;
  shaftMesh.receiveShadow = true;
  group.add(shaftMesh);

  // Capitel superior com receptáculo circular para a esfera
  const capitalMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.7, 0.5, 16), materials.stoneLight);
  capitalMesh.position.y = 2.45;
  capitalMesh.castShadow = true;
  capitalMesh.receiveShadow = true;
  group.add(capitalMesh);

  // Cubo de colisão invisível para bloquear passagem física pelo pedestal
  const colBox = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 1.8), new THREE.MeshBasicMaterial({ visible: false }));
  colBox.position.copy(group.position);
  colBox.position.y += 1.4;
  collidableObjects.push(colBox);

  // Registro do estado do pedestal
  pedestals.push({
    index,
    name: directionName,
    worldPosition: new THREE.Vector3(relX + portalCenterPos.x, 3.2, relZ + portalCenterPos.z),
    hasKey: false,
    keyMesh: null,
    keyLight: null,
    group
  });

  return group;
}

/**
 * Coloca uma chave sobre o pedestal indicado
 */
export function placeKeyOnPedestal(pedestal) {
  if (pedestal.hasKey) return;
  pedestal.hasKey = true;
  gameState.placedKeysCount++;

  // "As chaves utilizarão PhongMaterial e terão luzes pontuais ao serem posicionadas 
  // sobre os pedestais. Elas também devem emitir luz (atributo emissive)."
  const sphereGeom = new THREE.SphereGeometry(0.55, 32, 32);
  const keyMesh = new THREE.Mesh(sphereGeom, materials.keySphere);
  keyMesh.position.set(0, 2.95, 0); // Repousa sobre o receptáculo do capitel
  keyMesh.castShadow = true;
  pedestal.group.add(keyMesh);
  pedestal.keyMesh = keyMesh;

  // Luz pontual associada que ilumina o pedestal e seu entorno
  const pointLight = new THREE.PointLight(0x00e5ff, 1.6, 16);
  pointLight.position.set(0, 3.3, 0);
  pedestal.group.add(pointLight);
  pedestal.keyLight = pointLight;

  showNotification(`Chave mágica posicionada no Pedestal ${pedestal.name} (${gameState.placedKeysCount}/4)!`);

  // Se todas as 4 esferas foram posicionadas, inicia a abertura do portal!
  if (gameState.placedKeysCount === 4) {
    triggerPortalOpening();
  }
}

/**
 * Dispara a sequência épica de abertura do portal secreto
 */
export function triggerPortalOpening() {
  gameState.portalOpen = true;
  if (portalVortex) portalVortex.visible = true;
  if (portalBeam) portalBeam.visible = true;

  showNotification('⚡ TODAS AS 4 CHAVES FORAM POSICIONADAS! O PORTAL ESTÁ SE ABRINDO!', 6000);
}

/**
 * Atualiza checagens de proximidade do jogador com os pedestais e animações do portal
 */
export function updatePortalSystem(delta, playerPos) {
  // 1. Checagem de proximidade: se o jogador tem chaves, deposita no pedestal mais próximo
  if (gameState.playerKeys > 0) {
    for (const ped of pedestals) {
      if (!ped.hasKey) {
        const dist = playerPos.distanceTo(ped.worldPosition);
        if (dist < 4.0) {
          gameState.playerKeys--;
          updateKeysHUD();
          placeKeyOnPedestal(ped);
          break; // Deposita uma por aproximação
        }
      }
    }
  }

  // 2. Animação suave de abertura e rotação do portal
  if (gameState.portalOpen) {
    // Progresso da escotilha abrindo
    if (gameState.portalProgress < 1.0) {
      gameState.portalProgress = Math.min(1.0, gameState.portalProgress + delta * 0.4);
      
      const openSlide = 3.6 * gameState.portalProgress;
      if (hatchDoorLeft) hatchDoorLeft.position.x = -openSlide;
      if (hatchDoorRight) hatchDoorRight.position.x = openSlide;
    }

    // Animação contínua do vórtice místico e feixe de energia
    if (portalVortex) {
      portalVortex.rotation.z += delta * 2.2;
    }
    if (portalBeam) {
      const pulse = 0.55 + 0.25 * Math.sin(Date.now() * 0.005);
      portalBeam.material.opacity = pulse * gameState.portalProgress;
      portalBeam.rotation.y += delta * 0.5;
    }
    if (portalLight) {
      portalLight.intensity = (2.0 + Math.sin(Date.now() * 0.008) * 0.6) * gameState.portalProgress;
    }
  }

  // 3. Efeito contínuo de rotação suave nas chaves depositadas nos pedestais
  for (const ped of pedestals) {
    if (ped.keyMesh) {
      ped.keyMesh.rotation.y += delta * 1.5;
      ped.keyMesh.position.y = 2.95 + Math.sin(Date.now() * 0.003 + ped.index) * 0.05;
    }
  }
}
