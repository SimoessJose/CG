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

// --- IMPORTANTE: Importação do novo arquivo de controles ---
import { FPAAControls } from './cameraControls.js';

const scene = new THREE.Scene();
const renderer = initRenderer();

const camera = initCamera(new THREE.Vector3(0, 2, 10));
scene.add(camera);

initDefaultBasicLight(scene);

// --- Inicialização encapsulada dos controles da câmera ---
const cameraControls = new FPAAControls(camera, renderer.domElement);

const materials = {
  ground: setDefaultMaterial('rgb(83, 184, 16)'),
  stone: setDefaultMaterial('rgb(150, 145, 125)'),
  stoneDark: setDefaultMaterial('rgb(105, 100, 90)'),
  wood: setDefaultMaterial('rgb(95, 55, 30)'),
  roof: setDefaultMaterial('rgb(75, 45, 35)')
};

function addBox(size, position, material, name) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.name = name;
  scene.add(mesh);
  return mesh;
}

function addCylinder(radius, height, position, material, name) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 16),
    material
  );
  mesh.position.set(...position);
  mesh.name = name;
  scene.add(mesh);
  return mesh;
}

function addCone(radius, height, position, material, name) {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(radius, height, 8),
    material
  );
  mesh.position.set(...position);
  mesh.name = name;
  scene.add(mesh);
  return mesh;
}

function createGround() {
  const ground = createGroundPlaneXZ(70, 70, 10, 10, 'rgb(83, 184, 16)');
  scene.add(ground);
}

function createWalls() {
  const wallHeight = 16;
  const wallThickness = 4;
  const wallLength = 68;

  addBox([wallLength, wallHeight, wallThickness], [0, wallHeight / 2, -17], materials.stone, 'north wall');
  addBox([wallThickness, wallHeight, wallLength], [-17, wallHeight / 2, 0], materials.stone, 'west wall');
  addBox([wallThickness, wallHeight, wallLength], [17, wallHeight / 2, 0], materials.stone, 'east wall');

  addBox([12, wallHeight, wallThickness], [-11, wallHeight / 2, 17], materials.stone, 'south wall left');
  addBox([12, wallHeight, wallThickness], [11, wallHeight / 2, 17], materials.stone, 'south wall right');

  createWallBattlements();
}

function createWallBattlements() {
  const y = 8.8;
  const merlonSize = [1.5, 1.6, 1.5];

  for (let coordinate = -15; coordinate <= 15; coordinate += 3) {
    addBox(merlonSize, [coordinate, y, -17], materials.stone, 'north merlon');
    addBox(merlonSize, [coordinate, y, 17], materials.stone, 'south merlon');
    addBox(merlonSize, [-17, y, coordinate], materials.stone, 'west merlon');
    addBox(merlonSize, [17, y, coordinate], materials.stone, 'east merlon');
  }
}

function createTowers() {
  const towerPositions = [
    [-38, 6, -17],
    [38, 6, -17],
    [-17, 6, 17],
    [17, 6, 17]
  ];

  towerPositions.forEach((position, index) => {
    addCylinder(4, 12, position, materials.stoneDark, `tower ${index + 1}`);
    addCone(4.5, 3, [position[0], 13.5, position[2]], materials.roof, `tower roof ${index + 1}`);

    for (let merlon = 0; merlon < 8; merlon += 1) {
      const angle = (merlon / 8) * Math.PI * 2;
      addBox(
        [1.2, 1.5, 1.2],
        [position[0] + Math.cos(angle) * 3.2, 12.7, position[2] + Math.sin(angle) * 3.2],
        materials.stone,
        `tower ${index + 1} merlon`
      );
    }
  });
}

function createMainGate() {
  addBox([2, 6, 0.6], [0, 3, 16.1], materials.wood, 'main gate');
  addBox([3, 8, 3], [-4, 4, 16], materials.stoneDark, 'gatehouse left');
  addBox([3, 8, 3], [4, 4, 16], materials.stoneDark, 'gatehouse right');
  addBox([11, 2, 3], [0, 8.5, 16], materials.stoneDark, 'gatehouse top');
  addBox([12, 1, 3.5], [0, 10, 16], materials.roof, 'gatehouse roof');
}

function createBuilding(position, name) {
  const [x, z] = position;
  addBox([10, 5, 8], [x, 2.5, z], materials.stone, `${name} walls`);
  addBox([10.5, 1, 8.5], [x, 5.5, z], materials.roof, `${name} roof`);
  addBox([2, 3, 0.5], [x, 1.5, z + 4.1], materials.wood, `${name} door`);
}

function createStairs() {
  for (let step = 0; step < 12; step += 1) {
    addBox(
      [5, 0.5 + step * 0.90, 3],
      [-13.5, 0.1 + step * 0.15, -3 - step * 1.1],
      materials.stoneDark,
      `stairs ${step + 1}`
    );
  }
}

function createCastle() {
  createGround();
  createWalls();
  createTowers();
  createMainGate();
  createBuilding([-7, 6], 'inner building one');
  createBuilding([7, -6], 'inner building two');
  createStairs();
}

createCastle();

window.addEventListener('resize', () => onWindowResize(camera, renderer), false);

const controlsInfo = new InfoBox();
controlsInfo.add('FPAA - Castelo de Bodiam');
controlsInfo.add('Clique na tela para iniciar');
controlsInfo.add('WASD/Setas: Movimentar');
controlsInfo.add('C: Alternar Câmera Orbital/FPAA');
controlsInfo.show();

function render() {
  requestAnimationFrame(render);
  
  // --- Atualiza os cálculos de física de movimento da câmera a cada frame ---
  cameraControls.update();
  
  renderer.render(scene, camera);
}

render();