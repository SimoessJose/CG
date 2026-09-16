import * as THREE from 'three';
import {
  initRenderer,
  initCamera,
  initDefaultBasicLight,
  setDefaultMaterial,
  InfoBox,
  onWindowResize,
  createGroundPlaneXZ
} from '../libs/util/util.js';

import { FPAAControls } from './cameraControls.js';
import { createWeapon } from './weapon.js';
// --- NOVO: Importando o sistema de tiros ---
import { ShootingSystem } from './shootingSystem.js';

const scene = new THREE.Scene();
const renderer = initRenderer();

const camera = initCamera(new THREE.Vector3(0, 2, 10));
scene.add(camera);

initDefaultBasicLight(scene);
// Inicialização encapsulada dos controles da câmera
const cameraControls = new FPAAControls(camera, renderer.domElement);
const weapon = createWeapon(camera);

// --- NOVO: Instanciando o Sistema de Tiros ---
const shootingSystem = new ShootingSystem(scene, camera, weapon);
// ---------------------------------------------------------------------------
// Materiais
// ---------------------------------------------------------------------------
const materials = {
  ground: setDefaultMaterial('rgb(70, 140, 45)'),
  water: setDefaultMaterial('rgb(30, 90, 120)'),
  stone: setDefaultMaterial('rgb(150, 145, 125)'),
  stoneDark: setDefaultMaterial('rgb(105, 100, 90)'),
  stoneLight: setDefaultMaterial('rgb(175, 170, 150)'),
  wood: setDefaultMaterial('rgb(95, 55, 30)'),
  roof: setDefaultMaterial('rgb(75, 45, 35)')
};

// ---------------------------------------------------------------------------
// Grupos
// ---------------------------------------------------------------------------
const castleGroup = new THREE.Group();
const wallsGroup = new THREE.Group();
const towersGroup = new THREE.Group();
const gatehouseGroup = new THREE.Group();
const buildingsGroup = new THREE.Group();

wallsGroup.name = 'walls';
towersGroup.name = 'towers';
gatehouseGroup.name = 'gatehouse';
buildingsGroup.name = 'buildings';

castleGroup.add(wallsGroup, towersGroup, gatehouseGroup, buildingsGroup);
scene.add(castleGroup);

export const doorPivots = [];

// ---------------------------------------------------------------------------
// Helpers de Geometria
// ---------------------------------------------------------------------------
function addBox(size, position, material, name, group) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.name = name;
  group.add(mesh);
  return mesh;
}

function addCylinder(radius, height, position, material, name, group) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 16),
    material
  );
  mesh.position.set(...position);
  mesh.name = name;
  group.add(mesh);
  return mesh;
}

function addCone(radius, height, position, material, name, group) {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(radius, height, 8),
    material
  );
  mesh.position.set(...position);
  mesh.name = name;
  group.add(mesh);
  return mesh;
}

function createDoorWithPivot(position, size, name, group) {
  const [x, y, z] = position;
  const [width, height, depth] = size;

  const pivot = new THREE.Object3D();
  pivot.position.set(x - width / 2, y, z);
  pivot.name = `${name} pivot`;

  const doorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    materials.wood
  );
  doorMesh.position.set(width / 2, height / 2, 0);
  doorMesh.name = name;

  pivot.add(doorMesh);
  group.add(pivot);
  doorPivots.push(pivot);
  return pivot;
}

// Escada Reta (para prédios internos)
function createStaircase(baseX, baseZ, direction, totalHeight, group, name = 'stair') {
  const stepHeight = 0.5;
  const stepDepth = 1.1;
  const stepWidth = 4;
  const numSteps = Math.ceil(totalHeight / stepHeight);

  for (let i = 0; i < numSteps; i += 1) {
    const y = stepHeight / 2 + i * stepHeight;
    const z = baseZ + direction * i * stepDepth;
    addBox(
      [stepWidth, stepHeight, stepDepth],
      [baseX, y, z],
      materials.stoneDark,
      `${name} step ${i + 1}`,
      group
    );
  }
  return numSteps * stepDepth;
}

// Escada em L com Corrimão (acesso ao muro)
function createLShapedStaircase(cornerX, cornerZ, xDir, zDir, totalHeight, group, name = 'stair') {
  const stepHeight = 0.5;
  const stepDepth = 1.2;
  const stepWidth = 4;
  const stepsPerFlight = Math.ceil((totalHeight / 2) / stepHeight);

  // Lance 1
  for (let i = 0; i < stepsPerFlight; i += 1) {
    const y = stepHeight / 2 + i * stepHeight;
    const z = cornerZ + zDir * ((stepsPerFlight - i) * stepDepth);
    addBox([stepWidth, stepHeight, stepDepth], [cornerX, y, z], materials.stoneDark, `${name} lance1 step ${i + 1}`, group);
    
    const railX = cornerX + xDir * (stepWidth / 2 - 0.2);
    if (i % 3 === 0 || i === stepsPerFlight - 1) {
      addBox([0.2, 2.5, 0.2], [railX, y + 1.25, z], materials.wood, `${name} rail post ${i}`, group);
    }
    addBox([0.2, 0.3, stepDepth], [railX, y + 2.5, z], materials.wood, `${name} rail bar ${i}`, group);
  }

  // Patamar
  const landingY = totalHeight / 2;
  addBox([stepWidth, stepHeight, stepWidth], [cornerX, landingY, cornerZ], materials.stoneDark, `${name} landing`, group);

  // Lance 2
  for (let i = 1; i <= stepsPerFlight; i += 1) {
    const y = landingY + stepHeight / 2 + (i - 1) * stepHeight;
    const x = cornerX + xDir * (i * stepDepth);
    addBox([stepDepth, stepHeight, stepWidth], [x, y, cornerZ], materials.stoneDark, `${name} lance2 step ${i}`, group);
    
    const railZ = cornerZ + zDir * (stepWidth / 2 - 0.2);
    if (i % 3 === 0 || i === stepsPerFlight) {
      addBox([0.2, 2.5, 0.2], [x, y + 1.25, railZ], materials.wood, `${name} rail post 2_${i}`, group);
    }
    addBox([stepDepth, 0.3, 0.2], [x, y + 2.5, railZ], materials.wood, `${name} rail bar 2_${i}`, group);
  }
}

// ---------------------------------------------------------------------------
// Terreno, Fosso d'Água e Ponte de Acesso
// ---------------------------------------------------------------------------
function createGround() {
  // Gramado externo
  const outerGround = createGroundPlaneXZ(200, 200, 20, 20, 'rgb(70, 140, 45)');
  scene.add(outerGround);

  // Espelho d'água (Fosso)
  const moat = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), materials.water);
  moat.rotation.x = -Math.PI / 2;
  moat.position.y = 0.01;
  scene.add(moat);

  // Ilha central de pedra
  const island = new THREE.Mesh(new THREE.PlaneGeometry(68, 68), materials.stoneLight);
  island.rotation.x = -Math.PI / 2;
  island.position.y = 0.02;
  scene.add(island);

  // Ponte de Acesso ao Portão Sul
  const bridgeGroup = new THREE.Group();
  addBox([8, 1, 30], [0, 0.5, 45], materials.wood, 'bridge floor', bridgeGroup);
  
  for (let z = 33; z <= 57; z += 8) {
    addBox([1.5, 4, 1.5], [-3.5, -1.5, z], materials.stoneDark, 'bridge pillar L', bridgeGroup);
    addBox([1.5, 4, 1.5], [3.5, -1.5, z], materials.stoneDark, 'bridge pillar R', bridgeGroup);
  }
  scene.add(bridgeGroup);
}

// ---------------------------------------------------------------------------
// Muralhas, Ameias e Consolos (Machicolations)
// ---------------------------------------------------------------------------
const WALL_HEIGHT = 16;
const WALL_THICKNESS = 4;
const WALL_LENGTH = 60;

function createWalls() {
  // Muralhas
  addBox([WALL_LENGTH, WALL_HEIGHT, WALL_THICKNESS], [0, WALL_HEIGHT / 2, -30], materials.stone, 'north wall', wallsGroup);
  addBox([WALL_THICKNESS, WALL_HEIGHT, WALL_LENGTH], [30, WALL_HEIGHT / 2, 0], materials.stone, 'east wall', wallsGroup);
  addBox([WALL_THICKNESS, WALL_HEIGHT, WALL_LENGTH], [-30, WALL_HEIGHT / 2, 0], materials.stone, 'west wall', wallsGroup);
  addBox([22, WALL_HEIGHT, WALL_THICKNESS], [-19, WALL_HEIGHT / 2, 30], materials.stone, 'south wall left', wallsGroup);
  addBox([22, WALL_HEIGHT, WALL_THICKNESS], [19, WALL_HEIGHT / 2, 30], materials.stone, 'south wall right', wallsGroup);

  createWallBattlements();
  createMachicolations();

  // Escada em L interna
  createLShapedStaircase(-26, -26, 1, 1, WALL_HEIGHT, wallsGroup, 'wall access stair');
}

function createMachicolations() {
  const y = WALL_HEIGHT - 0.5;
  const corbelSize = [0.8, 1.2, 1.2];

  for (let coord = -27; coord <= 27; coord += 3) {
    addBox(corbelSize, [coord, y, -31], materials.stoneDark, 'corbel N', wallsGroup);
    addBox(corbelSize, [coord, y, 31], materials.stoneDark, 'corbel S', wallsGroup);
    addBox([1.2, 1.2, 0.8], [-31, y, coord], materials.stoneDark, 'corbel W', wallsGroup);
    addBox([1.2, 1.2, 0.8], [31, y, coord], materials.stoneDark, 'corbel E', wallsGroup);
  }
}

function createWallBattlements() {
  const y = WALL_HEIGHT + 1;
  const merlonSize = [2.5, 2, 2.5];

  for (let coordinate = -27; coordinate <= 27; coordinate += 5) {
    addBox(merlonSize, [coordinate, y, -30], materials.stone, 'north merlon', wallsGroup);
    addBox(merlonSize, [-30, y, coordinate], materials.stone, 'west merlon', wallsGroup);
    addBox(merlonSize, [coordinate, y, 30], materials.stone, 'south merlon', wallsGroup);
    addBox(merlonSize, [30, y, coordinate], materials.stone, 'east merlon', wallsGroup);
  }
}

// ---------------------------------------------------------------------------
// Torres de Canto e Intermediárias (Bodiam style)
// ---------------------------------------------------------------------------
function createTowers() {
  // 4 Torres Cilíndricas nos Cantos
  const cornerTowers = [
    [-30, 8, -30],
    [30, 8, -30],
    [-30, 8, 30],
    [30, 8, 30]
  ];

  cornerTowers.forEach((pos, index) => {
    addCylinder(6, 18, pos, materials.stoneDark, `corner tower ${index + 1}`, towersGroup);
    addCone(6.5, 4, [pos[0], 19.5, pos[2]], materials.roof, `tower roof ${index + 1}`, towersGroup);

    for (let merlon = 0; merlon < 8; merlon += 1) {
      const angle = (merlon / 8) * Math.PI * 2;
      addBox(
        [1.8, 2, 1.8],
        [pos[0] + Math.cos(angle) * 4.8, WALL_HEIGHT + 2, pos[2] + Math.sin(angle) * 4.8],
        materials.stone,
        `tower ${index + 1} merlon`,
        towersGroup
      );
    }
  });

  // Torres Intermediárias Quadradas (Leste, Oeste e Norte/Postern Tower)
  addBox([7, 18, 7], [31, 9, 0], materials.stoneDark, 'east mid tower', towersGroup);
  addBox([7, 18, 7], [-31, 9, 0], materials.stoneDark, 'west mid tower', towersGroup);
  addBox([7, 18, 7], [0, 9, -31], materials.stoneDark, 'north postern tower', towersGroup);
}

// ---------------------------------------------------------------------------
// Gatehouse Imponente (Entrada Principal de Bodiam)
// ---------------------------------------------------------------------------
function createMainGate() {
  addBox([6, 18, 8], [-6, 9, 31], materials.stoneDark, 'gatehouse tower L', gatehouseGroup);
  addBox([6, 18, 8], [6, 9, 31], materials.stoneDark, 'gatehouse tower R', gatehouseGroup);
  addBox([18, 4, 8], [0, 15, 31], materials.stoneDark, 'gatehouse arch top', gatehouseGroup);
  addBox([19, 2, 9], [0, 17.5, 31], materials.roof, 'gatehouse roof', gatehouseGroup);

  createDoorWithPivot([0, 0, 31.1], [4, 10, 0.6], 'main gate door', gatehouseGroup);
}

// ---------------------------------------------------------------------------
// Prédios Internos
// ---------------------------------------------------------------------------
function createBuilding(position, name, stairDirection) {
  const [x, z] = position;
  const group = new THREE.Group();
  group.name = name;

  addBox([16, 4, 12], [x, 2, z], materials.stone, `${name} ground floor`, group);
  addBox([13.5, 4, 9.5], [x, 6, z], materials.stone, `${name} upper floor`, group);
  addBox([16.5, 1.5, 12.5], [x, 8.75, z], materials.roof, `${name} roof`, group);
  createDoorWithPivot([x, 0, z + 6.1], [3, 5, 0.5], `${name} door`, group);

  const stairX = x < 0 ? x - 10 : x + 10;
  const stairZ = stairDirection === 1 ? z - 4.4 : z + 4.4;
  createStaircase(stairX, stairZ, stairDirection, 4, group, `${name} stair`);

  buildingsGroup.add(group);
  return group;
}

// ---------------------------------------------------------------------------
// Montagem Final
// ---------------------------------------------------------------------------
function createCastle() {
  createGround();
  createWalls();
  createTowers();
  createMainGate();
  createBuilding([-12, 10], 'inner building one', 1);
  createBuilding([12, -10], 'inner building two', -1);
}

createCastle();

window.addEventListener('resize', () => onWindowResize(camera, renderer), false);

// --- NOVO: Escutando cliques para atirar ---
document.body.addEventListener('mousedown', (event) => {
  // Confirma se o jogo está ativo (mouse travado na tela)
  if (document.pointerLockElement === document.body) {
    // 0 = Botão esquerdo, 2 = Botão direito
    if (event.button === 0 || event.button === 2) {
      shootingSystem.shoot();
    }
  }
});

const controlsInfo = new InfoBox();
controlsInfo.add('FPAA - Castelo de Bodiam');
controlsInfo.add('Clique na tela para iniciar');
controlsInfo.add('WASD/Setas: Movimentar');
controlsInfo.add('C: Alternar Câmera Orbital/FPAA');
controlsInfo.add('Mouse: Atirar');
controlsInfo.show();

// --- NOVO: Relógio global para gerenciar o delta time ---
const clock = new THREE.Clock();

function render() {
  requestAnimationFrame(render);
  
  const delta = clock.getDelta();
  
  // Atualiza a física de movimento da câmera 
  cameraControls.update();
  
  // --- NOVO: Atualiza a movimentação e física dos tiros ---
  shootingSystem.update(delta);
  
  renderer.render(scene, camera);
}

render();c