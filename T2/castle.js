import * as THREE from 'three';
import { CSG } from '../libs/other/CSGMesh.js';
import { collidableObjects, doorPivots } from './gameState.js';
import { materials } from './materials.js';

// ---------------------------------------------------------------------------
// Helpers Básicos de Geometria e Matrizes
// ---------------------------------------------------------------------------
function updateMeshMatrix(mesh) {
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
}

export function addBox(size, position, material, name, group, addToCollision = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  if (addToCollision) {
    collidableObjects.push(mesh);
  }
  return mesh;
}

export function addCylinder(radius, height, position, material, name, group, addToCollision = true) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 20),
    material
  );
  mesh.position.set(...position);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  if (addToCollision) {
    collidableObjects.push(mesh);
  }
  return mesh;
}

export function createDoorWithPivot(position, size, name, group) {
  const [x, y, z] = position;
  const [width, height, depth] = size;

  const pivot = new THREE.Object3D();
  pivot.position.set(x - width / 2, y, z);
  pivot.name = `${name} pivot`;
  pivot.userData = { isOpen: false, targetAngle: 0 };

  const doorGroup = new THREE.Group();
  doorGroup.position.set(width / 2, height / 2, 0);
  doorGroup.name = name;

  // Folha de madeira da porta
  const woodBase = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials.wood);
  woodBase.castShadow = true;
  woodBase.receiveShadow = true;
  doorGroup.add(woodBase);
  collidableObjects.push(woodBase);

  // Faixas de ferro forjado de reforço
  const bandHeight = height * 0.08;
  const bandDepth = depth + 0.08;

  const topBand = new THREE.Mesh(new THREE.BoxGeometry(width, bandHeight, bandDepth), materials.iron);
  topBand.position.set(0, height * 0.3, 0);
  topBand.castShadow = true;
  doorGroup.add(topBand);

  const bottomBand = new THREE.Mesh(new THREE.BoxGeometry(width, bandHeight, bandDepth), materials.iron);
  bottomBand.position.set(0, -height * 0.3, 0);
  bottomBand.castShadow = true;
  doorGroup.add(bottomBand);

  // Maçaneta / Puxador de ferro
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8), materials.iron);
  handle.position.set(width * 0.35, 0, depth / 2 + 0.05);
  handle.rotation.x = Math.PI / 2;
  doorGroup.add(handle);

  pivot.add(doorGroup);
  group.add(pivot);
  doorPivots.push(pivot);
  return pivot;
}

export function createStaircase(baseX, baseZ, direction, totalHeight, group, name = 'stair') {
  const stepHeight = 0.5;
  const stepDepth = 1.0;
  const stepWidth = 4.0;
  const numSteps = Math.ceil(totalHeight / stepHeight);

  // Degraus visuais (sem colisão individual para evitar solavancos / travamentos)
  for (let i = 0; i < numSteps; i += 1) {
    const y = stepHeight / 2 + i * stepHeight;
    const z = baseZ + direction * i * stepDepth;
    addBox([stepWidth, stepHeight, stepDepth], [baseX, y, z], materials.stoneDark, `${name} step ${i + 1}`, group, false);
  }

  // Rampa de colisão matemática perfeitamente linear (elimina qualquer efeito de subida e descida)
  const run = numSteps * stepDepth;
  const length = Math.sqrt(run * run + totalHeight * totalHeight);
  const angle = Math.atan2(totalHeight, run);

  const rampZ = baseZ + direction * (run / 2 - 0.5);
  const rampY = totalHeight / 2;
  const rampGeom = new THREE.BoxGeometry(stepWidth, 0.2, length);
  const rampMat = new THREE.MeshBasicMaterial({ visible: false });
  const rampMesh = new THREE.Mesh(rampGeom, rampMat);
  rampMesh.position.set(baseX, rampY, rampZ);
  rampMesh.rotation.x = -angle * direction;
  group.add(rampMesh);
  collidableObjects.push(rampMesh);
}

// ---------------------------------------------------------------------------
// FUNÇÕES AUXILIARES CSG PARA CORTES EM ARCO E SETEIRAS
// ---------------------------------------------------------------------------
/**
 * Cria a geometria CSG de corte em arco (parte inferior retangular plana e superior arredondada)
 * transformada diretamente para a posição e rotação especificadas no espaço global 3D.
 */
function createArchCutterCSG(posX, posY, posZ, rotY = 0, width = 3.6, height = 5.2, depth = 8.0) {
  const boxH = Math.max(0.1, height - width / 2);
  const radius = width / 2;

  // Grupo-pai que carrega a rotação e a posição globais
  const base = new THREE.Matrix4()
    .makeRotationY(rotY)
    .setPosition(posX, posY, posZ);

  // Parte retangular (inferior plana)
  const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(width, boxH, depth));
  boxMesh.matrixAutoUpdate = false;
  boxMesh.matrix.copy(base).multiply(
    new THREE.Matrix4().makeTranslation(0, boxH / 2, 0)
  );

  // Parte arredondada (superior)
  const archMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 16));
  archMesh.matrixAutoUpdate = false;
  archMesh.matrix.copy(base).multiply(
    new THREE.Matrix4()
      .makeTranslation(0, boxH, 0)
      .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
  );

  return CSG.fromMesh(boxMesh).union(CSG.fromMesh(archMesh));
}

/**
 * Cria a geometria de corte para uma Seteira medieval com parte inferior plana e superior arredondada
 */
function createSeteiraCutterCSG(posX, posY, posZ, rotY = 0, width = 1.0, height = 3.2, depth = 8.0) {
  return createArchCutterCSG(posX, posY, posZ, rotY, width, height, depth);
}

// ---------------------------------------------------------------------------
// ITEM: Ponte da Parte Externa (Ambiente - 2 pontos)
// Castelo e acesso mais altos que a água (plano base a y = -2.0), cores areia e verde,
// com alturas diferentes para evitar Z-fighting
// ---------------------------------------------------------------------------
export function createGroundAndBridge(scene) {
  const envGroup = new THREE.Group();
  envGroup.name = 'EnvironmentAndBridge';

  // 1. Plano de água base do fosso a y = -2.0 (plano base)
  const waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), materials.water);
  waterPlane.rotation.x = -Math.PI / 2;
  waterPlane.position.y = -2.0;
  waterPlane.receiveShadow = true;
  envGroup.add(waterPlane);
  collidableObjects.push(waterPlane);

  // Fundo escuro do fosso sob a água
  const bedPlane = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshLambertMaterial({ color: 0x18241c }));
  bedPlane.rotation.x = -Math.PI / 2;
  bedPlane.position.y = -2.6;
  envGroup.add(bedPlane);

  // 2. Ilha elevada do Castelo (mais alta que o plano base de água: base a y = -2.0, topo a y = 0.0)
  // Dimensão 160x160 para coincidir perfeitamente com a fundação das muralhas e pátio,
  // permitindo que as muralhas e torres mergulhem diretamente no fosso de água (como no modelo base)
  const castleIsland = new THREE.Mesh(new THREE.BoxGeometry(160, 2.0, 160), materials.stoneLight);
  castleIsland.position.set(0, -1.0, 0);
  castleIsland.receiveShadow = true;
  castleIsland.castShadow = true;
  envGroup.add(castleIsland);
  collidableObjects.push(castleIsland);

  // 3. Complexo da Ponte e Acesso Exterior (Acesso elevado, cores areia e verde)
  const bridgeGroup = new THREE.Group();
  bridgeGroup.name = 'BridgeAccess';

  // Trecho 1: Ponte reta conectando o Portão Principal (z = 94) à Ilha Octogonal (z = 135)
  // Pilares de pedra no fosso sob a ponte
  for (let pz of [105, 122]) {
    addCylinder(1.6, 2.4, [-4.5, -1.0, pz], materials.stoneDark, 'bridge pier L', bridgeGroup);
    addCylinder(1.6, 2.4, [4.5, -1.0, pz], materials.stoneDark, 'bridge pier R', bridgeGroup);
  }

  // Base estrutural da ponte (topo a y = 0.0)
  addBox([18, 2.0, 42], [0, -1.0, 114], materials.stoneDark, 'bridge base', bridgeGroup);

  // Margens de grama verde da ponte (topo y = 0.10)
  addBox([5, 0.1, 42], [-6.5, 0.05, 114], materials.islandGrass, 'bridge grass L', bridgeGroup);
  addBox([5, 0.1, 42], [6.5, 0.05, 114], materials.islandGrass, 'bridge grass R', bridgeGroup);

  // Caminho de areia central da ponte (topo y = 0.15 - ligeiramente mais alto para eliminar Z-fighting)
  addBox([8, 0.14, 42], [0, 0.08, 114], materials.path, 'bridge sand path', bridgeGroup);

  // Guarda-corpos de madeira ao longo da ponte
  for (let z = 96; z <= 132; z += 6) {
    addBox([0.25, 1.2, 0.25], [-8.8, 0.7, z], materials.wood, 'rail post L', bridgeGroup);
    addBox([0.25, 1.2, 0.25], [8.8, 0.7, z], materials.wood, 'rail post R', bridgeGroup);
  }
  addBox([0.2, 0.15, 38], [-8.8, 1.3, 114], materials.woodPlanks, 'handrail L', bridgeGroup);
  addBox([0.2, 0.15, 38], [8.8, 1.3, 114], materials.woodPlanks, 'handrail R', bridgeGroup);

  // Trecho 2: Ilha Octogonal Intermediária (Bastion / Píer Octogonal como na referência de Bodiam)
  const octoRadius = 18;
  const octoBase = new THREE.Mesh(
    new THREE.CylinderGeometry(octoRadius, octoRadius + 1.5, 2.0, 8),
    materials.stoneLight
  );
  octoBase.rotation.y = Math.PI / 8;
  octoBase.position.set(0, -1.0, 150);
  octoBase.castShadow = true;
  octoBase.receiveShadow = true;
  bridgeGroup.add(octoBase);
  collidableObjects.push(octoBase);

  // Superfície de grama verde da ilha octogonal (topo y = 0.10)
  const octoGrass = new THREE.Mesh(
    new THREE.CylinderGeometry(octoRadius - 0.2, octoRadius - 0.2, 0.1, 8),
    materials.islandGrass
  );
  octoGrass.rotation.y = Math.PI / 8;
  octoGrass.position.set(0, 0.05, 150);
  octoGrass.receiveShadow = true;
  bridgeGroup.add(octoGrass);

  // Caminho de areia cortando a ilha octogonal (topo y = 0.15 para evitar Z-fighting)
  addBox([8, 0.14, 36], [0, 0.08, 150], materials.path, 'octo sand path', bridgeGroup);

  // Muretas baixas de pedra ornamental ao redor da ilha octogonal
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 + Math.PI / 8;
    if (i !== 2 && i !== 6) { // Deixa livre as passagens de entrada e saída
      const px = Math.sin(angle) * (octoRadius - 0.8);
      const pz = 150 + Math.cos(angle) * (octoRadius - 0.8);
      const parapet = addBox([7.0, 1.0, 1.0], [px, 0.60, pz], materials.stoneDark, `octo parapet ${i}`, bridgeGroup);
      parapet.rotation.y = -angle + Math.PI / 2;
    }
  }

  // Ruína da Barbacã (Barbican) na ilha octogonal (elemento icônico do modelo base de Bodiam Castle)
  const barbicanWall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 9.5, 12.0), materials.stoneDark);
  barbicanWall.position.set(8.5, 4.75, 148);
  updateMeshMatrix(barbicanWall);

  let barbicanCSG = CSG.fromMesh(barbicanWall);
  // Portal em arco esculpido via CSG através da muralha em ruína
  const barbicanArchCutter = createArchCutterCSG(8.5, 0.1, 148, Math.PI / 2, 3.8, 6.5, 6.0);
  barbicanCSG = barbicanCSG.subtract(barbicanArchCutter);

  // Recortes desgastados via CSG no topo simulando ruína medieval
  const ruinNotch1 = createArchCutterCSG(8.5, 7.8, 152, Math.PI / 2, 2.4, 3.5, 6.0);
  const ruinNotch2 = createArchCutterCSG(8.5, 8.2, 144, Math.PI / 2, 2.0, 3.0, 6.0);
  barbicanCSG = barbicanCSG.subtract(ruinNotch1).subtract(ruinNotch2);

  const finalBarbicanMesh = CSG.toMesh(barbicanCSG, new THREE.Matrix4(), materials.stoneDark);
  finalBarbicanMesh.castShadow = true;
  finalBarbicanMesh.receiveShadow = true;
  finalBarbicanMesh.name = 'ruined barbican wall csg';
  bridgeGroup.add(finalBarbicanMesh);
  collidableObjects.push(finalBarbicanMesh);

  // Trecho 3: Extensão da ponte em direção à margem externa (z = 168 até z = 205)
  addBox([14, 2.0, 38], [0, -1.0, 186], materials.stoneDark, 'outer bridge base', bridgeGroup);
  addBox([3, 0.1, 38], [-5.5, 0.05, 186], materials.islandGrass, 'outer bridge grass L', bridgeGroup);
  addBox([3, 0.1, 38], [5.5, 0.05, 186], materials.islandGrass, 'outer bridge grass R', bridgeGroup);
  addBox([8, 0.14, 38], [0, 0.08, 186], materials.path, 'outer bridge sand path', bridgeGroup);

  // Pilares na água sob a extensão da ponte
  for (let pz of [176, 196]) {
    addCylinder(1.4, 2.4, [-4.0, -1.0, pz], materials.wood, 'timber pier L', bridgeGroup);
    addCylinder(1.4, 2.4, [4.0, -1.0, pz], materials.wood, 'timber pier R', bridgeGroup);
  }

  envGroup.add(bridgeGroup);
  scene.add(envGroup);
}

// ---------------------------------------------------------------------------
// ITEM: Seteiras e Pórtico via CSG (5 pontos)
// "Estas aberturas devem ser criadas através de métodos CSG. Reparem que a
// maioria das aberturas possuem a parte inferior plana e a superior arredondada."
// "O pórtico do portão principal do castelo também deve ser feito via CSG"
// ---------------------------------------------------------------------------
const WALL_HEIGHT = 18;
const WALL_THICKNESS = 5;
const WALL_LENGTH = 160;

/**
 * Cria muralhas com seteiras esculpidas via CSG
 */
export function createWallsWithCSG(wallsGroup) {
  const auxMat = new THREE.Matrix4();

  // 1. MURALHA NORTE COM SETEIRAS CSG
  const northWallMesh = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_LENGTH, WALL_HEIGHT, WALL_THICKNESS),
    materials.stone
  );
  northWallMesh.position.set(0, WALL_HEIGHT / 2, -80);
  updateMeshMatrix(northWallMesh);

  let northCSG = CSG.fromMesh(northWallMesh);

  // Esculpe 4 seteiras distribuídas na muralha norte
  for (let sx of [-50, -20, 20, 50]) {
    const cutterMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 8));
    cutterMesh.position.set(sx, 12, -80);
    updateMeshMatrix(cutterMesh);

    const archCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 8, 16));
    archCylinder.rotation.x = Math.PI / 2;
    archCylinder.position.set(sx, 13.6, -80);
    updateMeshMatrix(archCylinder);

    const slitCSG = CSG.fromMesh(cutterMesh).union(CSG.fromMesh(archCylinder));
    northCSG = northCSG.subtract(slitCSG);
  }

  const finalNorthMesh = CSG.toMesh(northCSG, auxMat, materials.stone);
  finalNorthMesh.castShadow = true;
  finalNorthMesh.receiveShadow = true;
  finalNorthMesh.name = 'north wall with csg seteiras';
  wallsGroup.add(finalNorthMesh);
  collidableObjects.push(finalNorthMesh);

  // 2. MURALHAS LESTE E OESTE
  // Muralha Leste com seteiras CSG
  const eastWallMesh = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, WALL_LENGTH),
    materials.stone
  );
  eastWallMesh.position.set(80, WALL_HEIGHT / 2, 0);
  updateMeshMatrix(eastWallMesh);

  let eastCSG = CSG.fromMesh(eastWallMesh);
  for (let sz of [-45, 0, 45]) {
    const cBox = new THREE.Mesh(new THREE.BoxGeometry(8, 3.2, 1.2));
    cBox.position.set(80, 12, sz);
    updateMeshMatrix(cBox);

    const cArch = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 8, 16));
    cArch.rotation.z = Math.PI / 2;
    cArch.position.set(80, 13.6, sz);
    updateMeshMatrix(cArch);

    eastCSG = eastCSG.subtract(CSG.fromMesh(cBox).union(CSG.fromMesh(cArch)));
  }

  const finalEastMesh = CSG.toMesh(eastCSG, auxMat, materials.stone);
  finalEastMesh.castShadow = true;
  finalEastMesh.receiveShadow = true;
  wallsGroup.add(finalEastMesh);
  collidableObjects.push(finalEastMesh);

  // Muralha Oeste com seteiras CSG
  const westWallMesh = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, WALL_LENGTH),
    materials.stone
  );
  westWallMesh.position.set(-80, WALL_HEIGHT / 2, 0);
  updateMeshMatrix(westWallMesh);

  let westCSG = CSG.fromMesh(westWallMesh);
  for (let sz of [-45, 0, 45]) {
    const cBox = new THREE.Mesh(new THREE.BoxGeometry(8, 3.2, 1.2));
    cBox.position.set(-80, 12, sz);
    updateMeshMatrix(cBox);

    const cArch = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 8, 16));
    cArch.rotation.z = Math.PI / 2;
    cArch.position.set(-80, 13.6, sz);
    updateMeshMatrix(cArch);

    westCSG = westCSG.subtract(CSG.fromMesh(cBox).union(CSG.fromMesh(cArch)));
  }

  const finalWestMesh = CSG.toMesh(westCSG, auxMat, materials.stone);
  finalWestMesh.castShadow = true;
  finalWestMesh.receiveShadow = true;
  wallsGroup.add(finalWestMesh);
  collidableObjects.push(finalWestMesh);

  // 3. MURALHAS SUL (Lado esquerdo e direito do portão) COM SETEIRAS CSG
  const southWallLMesh = new THREE.Mesh(new THREE.BoxGeometry(72, WALL_HEIGHT, WALL_THICKNESS), materials.stone);
  southWallLMesh.position.set(-44, WALL_HEIGHT / 2, 80);
  updateMeshMatrix(southWallLMesh);
  let southLCSG = CSG.fromMesh(southWallLMesh);
  for (let sx of [-60, -32]) {
    southLCSG = southLCSG.subtract(createSeteiraCutterCSG(sx, 12, 80, 0, 1.2, 3.2, 8.0));
  }
  const finalSouthLMesh = CSG.toMesh(southLCSG, auxMat, materials.stone);
  finalSouthLMesh.castShadow = true;
  finalSouthLMesh.receiveShadow = true;
  finalSouthLMesh.name = 'south wall left with csg seteiras';
  wallsGroup.add(finalSouthLMesh);
  collidableObjects.push(finalSouthLMesh);

  const southWallRMesh = new THREE.Mesh(new THREE.BoxGeometry(72, WALL_HEIGHT, WALL_THICKNESS), materials.stone);
  southWallRMesh.position.set(44, WALL_HEIGHT / 2, 80);
  updateMeshMatrix(southWallRMesh);
  let southRCSG = CSG.fromMesh(southWallRMesh);
  for (let sx of [32, 60]) {
    southRCSG = southRCSG.subtract(createSeteiraCutterCSG(sx, 12, 80, 0, 1.2, 3.2, 8.0));
  }
  const finalSouthRMesh = CSG.toMesh(southRCSG, auxMat, materials.stone);
  finalSouthRMesh.castShadow = true;
  finalSouthRMesh.receiveShadow = true;
  finalSouthRMesh.name = 'south wall right with csg seteiras';
  wallsGroup.add(finalSouthRMesh);
  collidableObjects.push(finalSouthRMesh);

  // Passadiços, Ameias, Escada e Prancha de queda
  createWallWalkways(wallsGroup);
  createWallBattlements(wallsGroup);
  createWallStairs(wallsGroup);
  createDropPlatform(wallsGroup);
}

/**
 * Cria o Pórtico do Portão Principal via CSG
 */
export function createGatehouseWithCSGPortico(gatehouseGroup) {
  const auxMat = new THREE.Matrix4();

  // Torres gêmeas retangulares ladeando o portão com seteiras CSG
  const ghTowerLMesh = new THREE.Mesh(new THREE.BoxGeometry(14, 26, 22), materials.stoneDark);
  ghTowerLMesh.position.set(-11, 13, 85);
  updateMeshMatrix(ghTowerLMesh);
  let ghTLCSG = CSG.fromMesh(ghTowerLMesh);
  ghTLCSG = ghTLCSG.subtract(createSeteiraCutterCSG(-11, 10, 96, 0, 1.2, 3.2, 6.0));
  ghTLCSG = ghTLCSG.subtract(createSeteiraCutterCSG(-11, 18, 96, 0, 1.2, 3.2, 6.0));
  const finalGHTLMesh = CSG.toMesh(ghTLCSG, auxMat, materials.stoneDark);
  finalGHTLMesh.castShadow = true;
  finalGHTLMesh.receiveShadow = true;
  finalGHTLMesh.name = 'gatehouse tower L csg';
  gatehouseGroup.add(finalGHTLMesh);
  collidableObjects.push(finalGHTLMesh);

  const ghTowerRMesh = new THREE.Mesh(new THREE.BoxGeometry(14, 26, 22), materials.stoneDark);
  ghTowerRMesh.position.set(11, 13, 85);
  updateMeshMatrix(ghTowerRMesh);
  let ghTRCSG = CSG.fromMesh(ghTowerRMesh);
  ghTRCSG = ghTRCSG.subtract(createSeteiraCutterCSG(11, 10, 96, 0, 1.2, 3.2, 6.0));
  ghTRCSG = ghTRCSG.subtract(createSeteiraCutterCSG(11, 18, 96, 0, 1.2, 3.2, 6.0));
  const finalGHTRMesh = CSG.toMesh(ghTRCSG, auxMat, materials.stoneDark);
  finalGHTRMesh.castShadow = true;
  finalGHTRMesh.receiveShadow = true;
  finalGHTRMesh.name = 'gatehouse tower R csg';
  gatehouseGroup.add(finalGHTRMesh);
  collidableObjects.push(finalGHTRMesh);

  // Bloco de entrada central do Gatehouse onde esculpimos o Pórtico via CSG
  const porticoBlock = new THREE.Mesh(
    new THREE.BoxGeometry(10, 24, 18),
    materials.stoneDark
  );
  porticoBlock.position.set(0, 12, 85);
  updateMeshMatrix(porticoBlock);

  // Cortador do Pórtico: passagem retangular + abóbada de arco pleno no topo
  const archBox = new THREE.Mesh(new THREE.BoxGeometry(7.6, 10.0, 22));
  archBox.position.set(0, 5.0, 85);
  updateMeshMatrix(archBox);

  const archCyl = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 22, 24));
  archCyl.rotation.x = Math.PI / 2;
  archCyl.position.set(0, 10.0, 85);
  updateMeshMatrix(archCyl);

  const porticoCutterCSG = CSG.fromMesh(archBox).union(CSG.fromMesh(archCyl));
  const porticoCSG = CSG.fromMesh(porticoBlock).subtract(porticoCutterCSG);

  const finalPorticoMesh = CSG.toMesh(porticoCSG, auxMat, materials.stoneDark);
  finalPorticoMesh.castShadow = true;
  finalPorticoMesh.receiveShadow = true;
  finalPorticoMesh.name = 'gatehouse csg portico';
  gatehouseGroup.add(finalPorticoMesh);
  collidableObjects.push(finalPorticoMesh);

  // Rastrilho medieval de ferro (Portcullis) suspenso sob o arco do pórtico (fidelidade ao modelo base)
  const portcullisGroup = new THREE.Group();
  portcullisGroup.name = 'Gatehouse Portcullis';
  for (let bx = -3.0; bx <= 3.0; bx += 0.85) {
    addBox([0.08, 6.0, 0.08], [bx, 9.5, 85.5], materials.iron, 'portcullis bar', portcullisGroup, false);
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 4), materials.iron);
    spike.position.set(bx, 6.4, 85.5);
    spike.rotation.x = Math.PI;
    portcullisGroup.add(spike);
  }
  for (let by of [7.5, 9.8, 12.0]) {
    addBox([6.8, 0.08, 0.08], [0, by, 85.5], materials.iron, 'portcullis beam', portcullisGroup, false);
  }
  gatehouseGroup.add(portcullisGroup);

  // Ameias superiores do Gatehouse
  for (let x of [-15, -11, -7, 7, 11, 15]) {
    addBox([3, 2, 3], [x, 27, 94.5], materials.stone, 'gh merlon front', gatehouseGroup);
    addBox([3, 2, 3], [x, 27, 75.5], materials.stone, 'gh merlon back', gatehouseGroup);
  }

  // Piso sob o pórtico: fecha o vão entre a ilha (z = 80) e a ponte (z = 93)
addBox([17.8, 2.0, 13], [0, -1.0, 86.5], materials.stoneDark, 'gatehouse floor base', gatehouseGroup);
addBox([8, 0.14, 13], [0, 0.08, 86.5], materials.path, 'gatehouse sand path', gatehouseGroup);

  // Porta fortificada posicionada no interior do pórtico
  createDoorWithPivot([0, 0, 82], [7.6, 11, 0.8], 'main gate door', gatehouseGroup);
}

// ---------------------------------------------------------------------------
// ITEM: Torres Cilíndricas Acessíveis via CSG (5 pontos)
// "Através de métodos CSG, crie formas de acessar as torres cilíndricas,
// isto é, as torres agora devem ser acessíveis (somente a parte superior)."
// ---------------------------------------------------------------------------
export function createAccessibleTowersWithCSG(towersGroup) {
  const auxMat = new THREE.Matrix4();

  // Configuração das 4 torres de canto cilíndricas
  // Cada torre possui portais em arco conectando aos passadiços das muralhas
  const cornerTowersConfig = [
    {
      pos: [-80, -80],
      name: 'Tower_NW',
      portals: [
        { x: -73, y: 17.5, z: -78, rotY: Math.PI / 2, name: 'north entrance' },
        { x: -78, y: 17.5, z: -73, rotY: 0,           name: 'west entrance' }
      ],
      slits: [
        { angle: (5 * Math.PI) / 4, y: 9.0 },
        { angle: (5 * Math.PI) / 4, y: 15.0 },
        { angle: Math.PI,          y: 12.0 }
      ]
    },
    {
      pos: [80, -80],
      name: 'Tower_NE',
      portals: [
        { x: 73, y: 17.5, z: -78, rotY: Math.PI / 2, name: 'north entrance' },
        { x: 78, y: 17.5, z: -73, rotY: 0,           name: 'east entrance' }
      ],
      slits: [
        { angle: (7 * Math.PI) / 4, y: 9.0 },
        { angle: (7 * Math.PI) / 4, y: 15.0 },
        { angle: 0,                 y: 12.0 }
      ]
    },
    {
      pos: [-80, 80],
      name: 'Tower_SW',
      portals: [
        { x: -73, y: 17.5, z: 78, rotY: Math.PI / 2, name: 'south entrance' },
        { x: -78, y: 17.5, z: 73, rotY: 0,           name: 'west entrance' }
      ],
      slits: [
        { angle: (3 * Math.PI) / 4, y: 9.0 },
        { angle: (3 * Math.PI) / 4, y: 15.0 },
        { angle: Math.PI / 2,       y: 12.0 }
      ]
    },
    {
      pos: [80, 80],
      name: 'Tower_SE',
      portals: [
        { x: 73, y: 17.5, z: 78, rotY: Math.PI / 2, name: 'south entrance' },
        { x: 78, y: 17.5, z: 73, rotY: 0,           name: 'east entrance' }
      ],
      slits: [
        { angle: Math.PI / 4,       y: 9.0 },
        { angle: Math.PI / 4,       y: 15.0 },
        { angle: Math.PI / 2,       y: 12.0 }
      ]
    }
  ];

  cornerTowersConfig.forEach((cfg) => {
    const tx = cfg.pos[0];
    const tz = cfg.pos[1];

    // 1. Cilindro sólido da torre cilíndrica (mergulha na água até y = -2.0)
    const towerRadius = 9.0;
    const towerHeight = 32.0;
    const towerMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(towerRadius, towerRadius, towerHeight, 32),
      materials.stoneDark
    );
    towerMesh.position.set(tx, 14, tz);
    updateMeshMatrix(towerMesh);

    let towerCSG = CSG.fromMesh(towerMesh);

    // 2. CSG SUBTRAÇÃO 1: Esvazia o interior superior da torre (Deck / Plataforma acessível)
    // Deixa um piso firme na altura do passadiço (y = 17.5) e um parapeito de pedra ao redor
    const innerRadius = 7.6;
    const deckHollowHeight = 14.5;
    const deckHollowMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(innerRadius, innerRadius, deckHollowHeight, 32)
    );
    deckHollowMesh.position.set(tx, 17.5 + deckHollowHeight / 2, tz);
    updateMeshMatrix(deckHollowMesh);

    towerCSG = towerCSG.subtract(CSG.fromMesh(deckHollowMesh));

    // 3. CSG SUBTRAÇÃO 2: Esculpe as aberturas de acesso em arco (Portais conectando aos passadiços)
    // Permitindo ao jogador caminhar livremente da muralha para dentro da torre
    for (const portal of cfg.portals) {
      const archCutter = createArchCutterCSG(portal.x, portal.y, portal.z, portal.rotY, 3.4, 5.2, 9.0);
      towerCSG = towerCSG.subtract(archCutter);
    }

    // 4. CSG SUBTRAÇÃO 3: Esculpe seteiras na fachada externa da torre voltada para o fosso
    for (const slit of cfg.slits) {
      const slitX = tx + Math.cos(slit.angle) * 8.5;
      const slitZ = tz + Math.sin(slit.angle) * 8.5;
      const slitRotY = -slit.angle + Math.PI / 2;
      const slitCutter = createSeteiraCutterCSG(slitX, slit.y, slitZ, slitRotY, 1.0, 3.0, 5.0);
      towerCSG = towerCSG.subtract(slitCutter);
    }

    // Converte de volta para Mesh Three.js
    const finalTowerMesh = CSG.toMesh(towerCSG, auxMat, materials.stoneDark);
    finalTowerMesh.castShadow = true;
    finalTowerMesh.receiveShadow = true;
    finalTowerMesh.name = cfg.name;
    towersGroup.add(finalTowerMesh);
    collidableObjects.push(finalTowerMesh);

    // 5. Piso plano da plataforma superior da torre (y = 17.5) para colisão e caminhabilidade
    const floorMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(innerRadius, innerRadius, 0.4, 24),
      materials.roof
    );
    floorMesh.position.set(tx, 17.4, tz);
    floorMesh.receiveShadow = true;
    towersGroup.add(floorMesh);
    collidableObjects.push(floorMesh);

    // 6. Ameias cilíndricas no topo da torre para acabamento arquitetônico
    for (let merlon = 0; merlon < 10; merlon += 1) {
      const angle = (merlon / 10) * Math.PI * 2;
      addBox(
        [2.2, 3.2, 2.2],
        [tx + Math.cos(angle) * 8.0, 31, tz + Math.sin(angle) * 8.0],
        materials.stone,
        `${cfg.name} merlon`,
        towersGroup
      );
    }
  });

  // Torres intermediárias projetadas para a parte externa
  addBox([10, 30, 10], [85, 15, 0], materials.stoneDark, 'east mid tower', towersGroup);
  addBox([10, 30, 10], [-85, 15, 0], materials.stoneDark, 'west mid tower', towersGroup);
  addBox([10, 30, 10], [0, 15, -85], materials.stoneDark, 'north postern tower', towersGroup);
}

// ---------------------------------------------------------------------------
// Passadiços, Ameias, Escadas e Prancha de Salto
// ---------------------------------------------------------------------------
export function createWallWalkways(wallsGroup) {
  addBox([140, 1, 6], [0, 17.5, -78], materials.stoneLight, 'north walkway', wallsGroup);
  addBox([6, 1, 140], [-78, 17.5, 0], materials.stoneLight, 'west walkway', wallsGroup);
  addBox([6, 1, 140], [78, 17.5, 0], materials.stoneLight, 'east walkway', wallsGroup);
  addBox([55, 1, 6], [-44, 17.5, 78], materials.stoneLight, 'south walkway left', wallsGroup);
  addBox([55, 1, 6], [44, 17.5, 78], materials.stoneLight, 'south walkway right', wallsGroup);

  // Guarda-corpo interno de segurança
  addBox([135, 1.2, 0.5], [0, 18.6, -75], materials.stoneDark, 'north inner parapet', wallsGroup);
  addBox([55, 1.2, 0.5], [-44, 18.6, 75], materials.stoneDark, 'south inner parapet left', wallsGroup);
  addBox([55, 1.2, 0.5], [44, 18.6, 75], materials.stoneDark, 'south inner parapet right', wallsGroup);
  addBox([0.5, 1.2, 140], [75, 18.6, 0], materials.stoneDark, 'east inner parapet', wallsGroup);
  addBox([0.5, 1.2, 50], [-75, 18.6, -40], materials.stoneDark, 'west inner parapet north', wallsGroup);
  addBox([0.5, 1.2, 55], [-75, 18.6, 45], materials.stoneDark, 'west inner parapet south', wallsGroup);
}

export function createWallBattlements(wallsGroup) {
  const y = WALL_HEIGHT + 1;
  const merlonSizeX = [3, 2, 1.5];
  const merlonSizeZ = [1.5, 2, 3];

  for (let coordinate = -77; coordinate <= 77; coordinate += 6) {
    if (coordinate >= -44 && coordinate <= -36) continue;
    addBox(merlonSizeX, [coordinate, y, -82], materials.stone, 'north merlon', wallsGroup);
    addBox(merlonSizeZ, [-82, y, coordinate], materials.stone, 'west merlon', wallsGroup);
    addBox(merlonSizeX, [coordinate, y, 82], materials.stone, 'south merlon', wallsGroup);
    addBox(merlonSizeZ, [82, y, coordinate], materials.stone, 'east merlon', wallsGroup);
  }
}

export function createWallStairs(wallsGroup) {
  const stepHeight = 0.5;
  const stepDepth = 1.0;
  const stepWidth = 3.5;
  const totalHeight = 18;
  const numSteps = Math.ceil(totalHeight / stepHeight);
  const baseX = -73.5;
  const baseZ = -22;

  // Degraus visuais (sem colisão direta para movimento perfeitamente suave)
  for (let i = 0; i < numSteps; i += 1) {
    const y = stepHeight / 2 + i * stepHeight;
    const z = baseZ + i * stepDepth;
    addBox([stepWidth, stepHeight, stepDepth], [baseX, y, z], materials.stoneDark, `wall stair step ${i + 1}`, wallsGroup, false);
  }

  // Rampa de colisão matemática perfeitamente linear da muralha
  const run = numSteps * stepDepth;
  const length = Math.sqrt(run * run + totalHeight * totalHeight);
  const angle = Math.atan2(totalHeight, run);

  const rampZ = baseZ + (run / 2 - 0.5);
  const rampY = totalHeight / 2;
  const rampGeom = new THREE.BoxGeometry(stepWidth, 0.2, length);
  const rampMat = new THREE.MeshBasicMaterial({ visible: false });
  const rampMesh = new THREE.Mesh(rampGeom, rampMat);
  rampMesh.position.set(baseX, rampY, rampZ);
  rampMesh.rotation.x = -angle;
  wallsGroup.add(rampMesh);
  collidableObjects.push(rampMesh);
}

export function createDropPlatform(wallsGroup) {
  addBox([5, 0.4, 7], [-40, 17.8, -83.5], materials.wood, 'drop platform', wallsGroup);
  addBox([0.3, 1.4, 6], [-42.3, 18.7, -83.5], materials.iron, 'drop rail left', wallsGroup);
  addBox([0.3, 1.4, 6], [-37.7, 18.7, -83.5], materials.iron, 'drop rail right', wallsGroup);
  addBox([0.4, 2.5, 0.4], [-42.3, 19.2, -86.5], materials.wood, 'drop marker post L', wallsGroup);
  addBox([0.4, 2.5, 0.4], [-37.7, 19.2, -86.5], materials.wood, 'drop marker post R', wallsGroup);
}

// ---------------------------------------------------------------------------
// Prédios Internos e Ruínas
// ---------------------------------------------------------------------------
export function createBuilding(position, name, stairDirection, buildingsGroup) {
  const [x, z] = position;
  const group = new THREE.Group();
  group.name = name;

  const t = 1.5;
  const gWidth = 24;
  const gHeight = 6;
  const gDepth = 20;
  const gY = gHeight / 2;

  // --- TÉRREO (Espaço Oco Habitável com Piso de Madeira) ---
  addBox([gWidth - t * 2, 0.2, gDepth - t * 2], [x, 0.1, z], materials.floorWood, `${name} floor`, group);
  addBox([t, gHeight, gDepth], [x - gWidth / 2 + t / 2, gY, z], materials.stone, `${name} wall left`, group);
  addBox([t, gHeight, gDepth], [x + gWidth / 2 - t / 2, gY, z], materials.stone, `${name} wall right`, group);
  addBox([gWidth - t * 2, gHeight, t], [x, gY, z - gDepth / 2 + t / 2], materials.stone, `${name} wall back`, group);

  const doorW = 4;
  const doorH = 5;
  const frontWallW = (gWidth - t * 2 - doorW) / 2;

  addBox([frontWallW, gHeight, t], [x - doorW / 2 - frontWallW / 2, gY, z + gDepth / 2 - t / 2], materials.stone, `${name} front L`, group);
  addBox([frontWallW, gHeight, t], [x + doorW / 2 + frontWallW / 2, gY, z + gDepth / 2 - t / 2], materials.stone, `${name} front R`, group);

  const topH = gHeight - doorH;
  addBox([doorW, topH, t], [x, gHeight - topH / 2, z + gDepth / 2 - t / 2], materials.stone, `${name} front top`, group);

  createDoorWithPivot([x, 0, z + gDepth / 2 - t / 2], [doorW, doorH, 0.6], `${name} door`, group);

  // --- TETO / TERRAÇO CAMINHÁVEL DA CASA (As escadas levam diretamente para o teto da casa) ---
  // Piso do teto da casa a y = 6.0
  addBox([gWidth, 0.4, gDepth], [x, 5.8, z], materials.stoneLight, `${name} roof floor`, group);

  // Muretas / Ameias de proteção ao redor do teto
  const parapetH = 1.2;
  const parapetY = 6.0 + parapetH / 2;

  // Parapeto traseiro (fundo)
  addBox([gWidth, parapetH, 0.6], [x, parapetY, z - gDepth / 2 + 0.3], materials.stoneDark, `${name} roof back parapet`, group);
  // Parapeto frontal
  addBox([gWidth, parapetH, 0.6], [x, parapetY, z + gDepth / 2 - 0.3], materials.stoneDark, `${name} roof front parapet`, group);

  // Parapeto do lado oposto à escada (fechado)
  const farWallX = x < 0 ? (x + gWidth / 2 - 0.3) : (x - gWidth / 2 + 0.3);
  addBox([0.6, parapetH, gDepth], [farWallX, parapetY, z], materials.stoneDark, `${name} roof far parapet`, group);

  // Parapeto do lado da escada (com vão de 4m permitindo entrar no teto)
  const nearWallX = x < 0 ? (x - gWidth / 2 + 0.3) : (x + gWidth / 2 - 0.3);
  if (stairDirection === 1) {
    // Escada sobe de -Z para +Z e chega por volta de z = -29
    addBox([0.6, parapetH, 13.5], [nearWallX, parapetY, z - 3.25], materials.stoneDark, `${name} roof near parapet`, group);
  } else {
    // Escada sobe de +Z para -Z e chega por volta de z = 29
    addBox([0.6, parapetH, 13.5], [nearWallX, parapetY, z + 3.25], materials.stoneDark, `${name} roof near parapet`, group);
  }

  // Ameias decorativas nas bordas do teto
  for (let ox = -gWidth / 2 + 2; ox <= gWidth / 2 - 2; ox += 4.5) {
    addBox([1.8, 0.6, 0.8], [x + ox, parapetY + parapetH / 2 + 0.3, z - gDepth / 2 + 0.3], materials.stone, `${name} merlon B`, group);
    addBox([1.8, 0.6, 0.8], [x + ox, parapetY + parapetH / 2 + 0.3, z + gDepth / 2 - 0.3], materials.stone, `${name} merlon F`, group);
  }

  // --- ESCADA EXTERNA E PATAMAR DE CONEXÃO AO TETO ---
  const stairX = x < 0 ? x - 14 : x + 14;
  const stairZ = stairDirection === 1 ? z - 6 : z + 6;
  createStaircase(stairX, stairZ, stairDirection, 6, group, `${name} stair`);

  // Patamar de desembarque no topo da escada conectando fisicamente à abertura do teto
  const landingZ = stairDirection === 1 ? (stairZ + 11.5) : (stairZ - 11.5);
  const platWidth = 4.5;
  const platX = x < 0 ? (stairX + 2.0) : (stairX - 2.0);
  addBox([platWidth, 0.4, 3.2], [platX, 5.8, landingZ], materials.stoneLight, `${name} stair landing`, group);

  buildingsGroup.add(group);
  return group;
}

export function createInnerLayout(buildingsGroup) {
  // Pátio interno com grama e caminhos
  addBox([152, 0.1, 152], [0, 0.05, 0], materials.islandGrass, 'inner courtyard grass', buildingsGroup);
  addBox([152, 0.2, 8], [0, 0.12, 0], materials.path, 'courtyard path H', buildingsGroup);
  addBox([8, 0.2, 152], [0, 0.12, 0], materials.path, 'courtyard path V', buildingsGroup);

  createBuilding([-40, -35], 'inner building west', 1, buildingsGroup);
  createBuilding([40, 35], 'inner building east', -1, buildingsGroup);

  // Ruínas decorativas no pátio
  addBox([25, 4, 15], [55, 2, -60], materials.stoneDark, 'ruin 1', buildingsGroup);
  addBox([18, 6, 12], [62, 3, -48], materials.stone, 'ruin 2', buildingsGroup);
  addBox([30, 3, 20], [-50, 1.5, 60], materials.stoneDark, 'ruin 3', buildingsGroup);
  addBox([15, 8, 15], [-68, 4, 65], materials.stone, 'ruin 4', buildingsGroup);
  addBox([40, 5, 12], [0, 2.5, -72], materials.stoneLight, 'north ruin', buildingsGroup);
}

// Muralhas baixas em "L" dos dois lados do portão (como na referência de Bodiam)
export function createFrontLWalls(wallsGroup) {
  const wallH = 12;            // mais baixa que a muralha principal (18)
  const wallY = wallH / 2 - 2; // base mergulha na água (y = -2)

  for (const side of [-1, 1]) {
    // Trecho frontal avançado: da torre do portão (|x| = 18) até |x| = 62, em z = 88
    addBox([44, wallH + 2, 4], [side * 40, wallY + 1, 88], materials.stone, `front L wall ${side}`, wallsGroup);

    // Retorno perpendicular: liga o trecho frontal à muralha principal (forma o L)
    addBox([4, wallH + 2, 8], [side * 62, wallY + 1, 85], materials.stone, `front L return ${side}`, wallsGroup);

    // Piso de pedra entre a muralha principal e a frontal (fecha o vão sobre a água)
    addBox([40, 2.0, 7], [side * 40, -1.0, 85.5], materials.stoneDark, `front L ground ${side}`, wallsGroup);

    // Ameias no trecho frontal
    for (let x = 20; x <= 60; x += 6) {
      addBox([3, 1.6, 1.5], [side * x, wallH - 0.2, 88], materials.stone, `front L merlon ${side}`, wallsGroup);
    }
  }
}

// ---------------------------------------------------------------------------
// Montagem Completa do Castelo
// ---------------------------------------------------------------------------
export function createCastle(scene) {
  const castleGroup = new THREE.Group();
  castleGroup.name = 'CastleMainGroup';

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

  // 1. Terreno, Fosso d'Água e Ponte Externa Elevada (Ambiente - 2 pontos)
  createGroundAndBridge(scene);

  // 2. Muralhas com Seteiras CSG (Ambiente - 5 pontos)
  createWallsWithCSG(wallsGroup);
  

  // 3. Pórtico do Portão Principal via CSG (Ambiente - 5 pontos)
  createGatehouseWithCSGPortico(gatehouseGroup);

  // 4. Torres Cilíndricas Acessíveis via CSG (Ambiente - 5 pontos)
  createAccessibleTowersWithCSG(towersGroup);

  // 5. Edificações Internas e Pátio
  createInnerLayout(buildingsGroup);

  return castleGroup;
}
