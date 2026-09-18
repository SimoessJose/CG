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
import { ShootingSystem } from './shootingSystem.js';

const scene = new THREE.Scene();
const renderer = initRenderer();

// Câmera posicionada para visualizar a nova entrada longa
const camera = initCamera(new THREE.Vector3(0, 15, 180)); 
scene.add(camera);

initDefaultBasicLight(scene);

const cameraControls = new FPAAControls(camera, renderer.domElement);
const weapon = createWeapon(camera);
const shootingSystem = new ShootingSystem(scene, camera, weapon);

// ---------------------------------------------------------------------------
// Materiais
// ---------------------------------------------------------------------------
const materials = {
  ground: setDefaultMaterial('rgb(85, 145, 55)'),
  path: setDefaultMaterial('rgb(160, 140, 110)'),
  water: setDefaultMaterial('rgb(90, 115, 60)'),
  stone: setDefaultMaterial('rgb(165, 155, 135)'),
  stoneDark: setDefaultMaterial('rgb(130, 120, 105)'),
  stoneLight: setDefaultMaterial('rgb(180, 175, 160)'),
  wood: setDefaultMaterial('rgb(80, 50, 30)'),
  roof: setDefaultMaterial('rgb(110, 105, 95)')
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
    new THREE.CylinderGeometry(radius, radius, height, 24),
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
  pivot.userData = { isOpen: false, targetAngle: 0 };

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

function createStaircase(baseX, baseZ, direction, totalHeight, group, name = 'stair') {
  const stepHeight = 0.5;
  const stepDepth = 1.1;
  const stepWidth = 4;
  const numSteps = Math.ceil(totalHeight / stepHeight);

  for (let i = 0; i < numSteps; i += 1) {
    const y = stepHeight / 2 + i * stepHeight;
    const z = baseZ + direction * i * stepDepth;
    addBox([stepWidth, stepHeight, stepDepth], [baseX, y, z], materials.stoneDark, `${name} step ${i + 1}`, group);
  }
}

// ---------------------------------------------------------------------------
// Terreno, Fosso d'Água e Caminho de Entrada (Refeito)
// ---------------------------------------------------------------------------
function createGround() {
  const outerGround = createGroundPlaneXZ(800, 800, 60, 60, 'rgb(85, 145, 55)');
  scene.add(outerGround);

  const moat = new THREE.Mesh(new THREE.PlaneGeometry(380, 380), materials.water);
  moat.rotation.x = -Math.PI / 2;
  moat.position.y = 0.01;
  scene.add(moat);

  const island = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), materials.stoneLight);
  island.rotation.x = -Math.PI / 2;
  island.position.y = 0.02;
  scene.add(island);

  // NOVO COMPLEXO DE ENTRADA 
  const entranceGroup = new THREE.Group();
  
  // Caminho principal sólido sobre a água
  addBox([8, 2, 50], [0, 0.5, 105], materials.path, 'path center', entranceGroup);
  addBox([5, 2, 50], [-6.5, 0.5, 105], materials.ground, 'path grass L', entranceGroup);
  addBox([5, 2, 50], [6.5, 0.5, 105], materials.ground, 'path grass R', entranceGroup);

  // Ruína da barbacã no meio do caminho (estrutura isolada e desgastada

  // Ilha octogonal de grama no início do caminho
  const octoMesh = new THREE.Mesh(new THREE.CylinderGeometry(28, 28, 1.8, 8), materials.ground);
  octoMesh.rotation.y = Math.PI / 8; // Alinha a face plana
  octoMesh.position.set(0, 0.5, 150);
  entranceGroup.add(octoMesh);
  
  // Caminho de terra cortando a ilha octogonal
  addBox([8, 2.2, 56], [0, 0.5, 150], materials.path, 'island path', entranceGroup);
  
  scene.add(entranceGroup);
}

// ---------------------------------------------------------------------------
// Muralhas, Ameias e Consolos
// ---------------------------------------------------------------------------
const WALL_HEIGHT = 18;
const WALL_THICKNESS = 5;
const WALL_LENGTH = 160; 

function createWalls() {
  addBox([WALL_LENGTH, WALL_HEIGHT, WALL_THICKNESS], [0, WALL_HEIGHT / 2, -80], materials.stone, 'north wall', wallsGroup);
  addBox([WALL_THICKNESS, WALL_HEIGHT, WALL_LENGTH], [80, WALL_HEIGHT / 2, 0], materials.stone, 'east wall', wallsGroup);
  addBox([WALL_THICKNESS, WALL_HEIGHT, WALL_LENGTH], [-80, WALL_HEIGHT / 2, 0], materials.stone, 'west wall', wallsGroup);
  
  addBox([72, WALL_HEIGHT, WALL_THICKNESS], [-44, WALL_HEIGHT / 2, 80], materials.stone, 'south wall left', wallsGroup);
  addBox([72, WALL_HEIGHT, WALL_THICKNESS], [44, WALL_HEIGHT / 2, 80], materials.stone, 'south wall right', wallsGroup);

  createWallBattlements();
}

function createWallBattlements() {
  const y = WALL_HEIGHT + 1;
  const merlonSize = [3, 2, 3];

  for (let coordinate = -77; coordinate <= 77; coordinate += 6) {
    addBox(merlonSize, [coordinate, y, -80], materials.stone, 'north merlon', wallsGroup);
    addBox(merlonSize, [-80, y, coordinate], materials.stone, 'west merlon', wallsGroup);
    addBox(merlonSize, [coordinate, y, 80], materials.stone, 'south merlon', wallsGroup);
    addBox(merlonSize, [80, y, coordinate], materials.stone, 'east merlon', wallsGroup);
  }
}

// ---------------------------------------------------------------------------
// Torres
// ---------------------------------------------------------------------------
function createTowers() {
  const cornerTowers = [
    [-80, 8, -80], [80, 8, -80], [-80, 8, 80], [80, 8, 80]
  ];

  cornerTowers.forEach((pos, index) => {
    addCylinder(9, 30, [pos[0], 15, pos[2]], materials.stoneDark, `corner tower ${index + 1}`, towersGroup);
    addCylinder(8.5, 0.5, [pos[0], 19.75, pos[2]], materials.roof, `tower flat roof ${index + 1}`, towersGroup);

    for (let merlon = 0; merlon < 10; merlon += 1) {
      const angle = (merlon / 10) * Math.PI * 2;
      addBox([2.5, 35, 2.5], [pos[0] + Math.cos(angle) * 7.5, 16, pos[2] + Math.sin(angle) * 7.5], materials.stone, `tower ${index + 1} merlon`, towersGroup);
    }
  });

  addBox([10, 30, 10], [81, 10, 0], materials.stoneDark, 'east mid tower', towersGroup);
  addBox([10, 30, 10], [-81, 10, 0], materials.stoneDark, 'west mid tower', towersGroup);
  addBox([10, 30, 10], [0, 10, -81], materials.stoneDark, 'north postern tower', towersGroup);
}

// ---------------------------------------------------------------------------
// Gatehouse Principal (Refeito para parecer com a foto)
// ---------------------------------------------------------------------------
function createMainGate() {
  // Duas torres gêmeas altas e quadradas ladeando a entrada
  addBox([14, 26, 22], [-11, 13, 85], materials.stoneDark, 'gatehouse tower L', gatehouseGroup);
  addBox([14, 26, 22], [11, 13, 85], materials.stoneDark, 'gatehouse tower R', gatehouseGroup);
  
  // Bloco central recuado acima da porta (comporta o mecanismo do rastrilho)
  addBox([8, 12, 14], [0, 20, 82], materials.stoneDark, 'gatehouse arch top', gatehouseGroup);
  
  // Ameias do Gatehouse para acabamento
  for(let x of [-15, -11, -7, 7, 11, 15]) {
    addBox([3, 2, 3], [x, 27, 94.5], materials.stone, 'gh merlon front', gatehouseGroup);
    addBox([3, 2, 3], [x, 27, 75.5], materials.stone, 'gh merlon back', gatehouseGroup);
  }

  // Porta de madeira recuada no arco
  createDoorWithPivot([0, 0, 77], [8, 12, 0.8], 'main gate door', gatehouseGroup);
}

// ---------------------------------------------------------------------------
// Prédios Internos Funcionais e Ruínas Avulsas
// ---------------------------------------------------------------------------
function createBuilding(position, name, stairDirection) {
  const [x, z] = position;
  const group = new THREE.Group();
  group.name = name;

  addBox([24, 6, 20], [x, 3, z], materials.stone, `${name} ground floor`, group);
  addBox([22, 6, 18], [x, 9, z], materials.stone, `${name} upper floor`, group);
  addBox([26, 2.5, 22], [x, 13.25, z], materials.roof, `${name} roof`, group);
  
  createDoorWithPivot([x, 0, z + 10.1], [4, 7, 0.6], `${name} door`, group);

  const stairX = x < 0 ? x - 14 : x + 14;
  const stairZ = stairDirection === 1 ? z - 6 : z + 6;
  createStaircase(stairX, stairZ, stairDirection, 6, group, `${name} stair`);

  buildingsGroup.add(group);
  return group;
}

function createInnerLayout() {
  addBox([152, 0.1, 152], [0, 0.05, 0], materials.ground, 'inner courtyard grass', buildingsGroup);
  addBox([152, 0.2, 6], [0, 0.1, 0], materials.path, 'courtyard path H', buildingsGroup);
  addBox([6, 0.2, 152], [0, 0.1, 0], materials.path, 'courtyard path V', buildingsGroup);

  createBuilding([-40, -35], 'inner building west', 1);
  createBuilding([40, 35], 'inner building east', -1);

  addBox([25, 4, 15], [55, 2, -60], materials.stoneDark, 'ruin 1', buildingsGroup);
  addBox([18, 6, 12], [62, 3, -48], materials.stone, 'ruin 2', buildingsGroup);
  addBox([30, 3, 20], [-50, 1.5, 60], materials.stoneDark, 'ruin 3', buildingsGroup);
  addBox([15, 8, 15], [-68, 4, 65], materials.stone, 'ruin 4', buildingsGroup);
  addBox([40, 5, 12], [0, 2.5, -72], materials.stoneLight, 'north ruin', buildingsGroup);
}

// ---------------------------------------------------------------------------
// Montagem Final
// ---------------------------------------------------------------------------
function createCastle() {
  createGround();
  createWalls();
  createTowers();
  createMainGate();
  createInnerLayout();
}

createCastle();

window.addEventListener('resize', () => onWindowResize(camera, renderer), false);

// --- Controles de Tiro e Interação ---
const interactRaycaster = new THREE.Raycaster();

document.body.addEventListener('mousedown', (event) => {
  if (document.pointerLockElement === document.body) {
    if (event.button === 0 || event.button === 2) {
      shootingSystem.shoot();
    }
  }
});

document.body.addEventListener('keydown', (event) => {
  if (event.code === 'KeyE' && document.pointerLockElement === document.body) {
    interactRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = interactRaycaster.intersectObjects(doorPivots, true);
    
    if (intersects.length > 0) {
      const distance = intersects[0].distance;
      const pivot = intersects[0].object.parent; 
      
      if (distance < 18 && pivot.userData !== undefined) {
        pivot.userData.isOpen = !pivot.userData.isOpen;
        pivot.userData.targetAngle = pivot.userData.isOpen ? Math.PI / 2 : 0; 
      }
    }
  }
});

const controlsInfo = new InfoBox();
controlsInfo.add('FPAA - Castelo de Bodiam (Escala Massiva)');
controlsInfo.add('Clique na tela para iniciar');
controlsInfo.add('WASD/Setas: Movimentar');
controlsInfo.add('C: Alternar Câmera');
controlsInfo.add('Mouse: Atirar');
controlsInfo.add('Tecla E: Abrir/Fechar Portas');
controlsInfo.show();

const clock = new THREE.Clock();

function render() {
  requestAnimationFrame(render);
  
  const delta = clock.getDelta();
  cameraControls.update();
  shootingSystem.update(delta);
  
  doorPivots.forEach((pivot) => {
    pivot.rotation.y = THREE.MathUtils.lerp(pivot.rotation.y, pivot.userData.targetAngle, delta * 5);
  });
  
  renderer.render(scene, camera);
}

render();