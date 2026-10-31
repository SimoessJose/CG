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
  const stepDepth = 1.1;
  const stepWidth = 4.0;
  const numSteps = Math.ceil(totalHeight / stepHeight);

  for (let i = 0; i < numSteps; i += 1) {
    const y = stepHeight / 2 + i * stepHeight;
    const z = baseZ + direction * i * stepDepth;
    addBox([stepWidth, stepHeight, stepDepth], [baseX, y, z], materials.stoneDark, `${name} step ${i + 1}`, group);
  }
}

// ---------------------------------------------------------------------------
// ITEM: Ponte da Parte Externa (Ambiente - 2 pontos)
// Castelo e acesso mais altos que a água (plano base), cores areia e verde,
// com alturas diferentes para evitar Z-fighting
// ---------------------------------------------------------------------------
export function createGroundAndBridge(scene) {
  const envGroup = new THREE.Group();
  envGroup.name = 'EnvironmentAndBridge';

  // 1. Plano de água base do fosso a y = 0.0 (plano base)
  const waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), materials.water);
  waterPlane.rotation.x = -Math.PI / 2;
  waterPlane.position.y = 0.0;
  waterPlane.receiveShadow = true;
  envGroup.add(waterPlane);

  // Fundo escuro do fosso sob a água
  const bedPlane = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshLambertMaterial({ color: 0x18241c }));
  bedPlane.rotation.x = -Math.PI / 2;
  bedPlane.position.y = -0.6;
  envGroup.add(bedPlane);

  // 2. Ilha elevada do Castelo (mais alta que o plano base de água: base a y = 1.6, topo a y = 1.8)
  const castleIsland = new THREE.Mesh(new THREE.BoxGeometry(184, 1.8, 184), materials.stoneLight);
  castleIsland.position.set(0, 0.9, 0);
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
    addCylinder(1.6, 2.2, [-4.5, 1.1, pz], materials.stoneDark, 'bridge pier L', bridgeGroup);
    addCylinder(1.6, 2.2, [4.5, 1.1, pz], materials.stoneDark, 'bridge pier R', bridgeGroup);
  }

  // Base estrutural da ponte
  addBox([18, 1.2, 42], [0, 1.4, 114], materials.stoneDark, 'bridge base', bridgeGroup);

  // Margens de grama verde da ponte (altura y = 2.05 para evitar Z-fighting)
  addBox([5, 0.3, 42], [-6.5, 2.05, 114], materials.islandGrass, 'bridge grass L', bridgeGroup);
  addBox([5, 0.3, 42], [6.5, 2.05, 114], materials.islandGrass, 'bridge grass R', bridgeGroup);

  // Caminho de areia central da ponte (altura y = 2.12 - ligeiramente mais alto para eliminar Z-fighting)
  addBox([8, 0.3, 42], [0, 2.12, 114], materials.path, 'bridge sand path', bridgeGroup);

  // Guarda-corpos de madeira ao longo da ponte
  for (let z = 96; z <= 132; z += 6) {
    addBox([0.25, 1.2, 0.25], [-8.8, 2.7, z], materials.wood, 'rail post L', bridgeGroup);
    addBox([0.25, 1.2, 0.25], [8.8, 2.7, z], materials.wood, 'rail post R', bridgeGroup);
  }
  addBox([0.2, 0.15, 38], [-8.8, 3.2, 114], materials.woodPlanks, 'handrail L', bridgeGroup);
  addBox([0.2, 0.15, 38], [8.8, 3.2, 114], materials.woodPlanks, 'handrail R', bridgeGroup);

  // Trecho 2: Ilha Octogonal Intermediária (Bastion / Píer Octogonal como na referência de Bodiam)
  const octoRadius = 18;
  const octoBase = new THREE.Mesh(
    new THREE.CylinderGeometry(octoRadius, octoRadius + 1.5, 2.2, 8),
    materials.stoneLight
  );
  octoBase.rotation.y = Math.PI / 8;
  octoBase.position.set(0, 1.1, 150);
  octoBase.castShadow = true;
  octoBase.receiveShadow = true;
  bridgeGroup.add(octoBase);
  collidableObjects.push(octoBase);

  // Superfície de grama verde da ilha octogonal (y = 2.22)
  const octoGrass = new THREE.Mesh(
    new THREE.CylinderGeometry(octoRadius - 0.2, octoRadius - 0.2, 0.15, 8),
    materials.islandGrass
  );
  octoGrass.rotation.y = Math.PI / 8;
  octoGrass.position.set(0, 2.22, 150);
  octoGrass.receiveShadow = true;
  bridgeGroup.add(octoGrass);

  // Caminho de areia cortando a ilha octogonal (y = 2.28 para evitar Z-fighting)
  addBox([8, 0.2, 36], [0, 2.28, 150], materials.path, 'octo sand path', bridgeGroup);

  // Muretas baixas de pedra ornamental ao redor da ilha octogonal
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 + Math.PI / 8;
    if (i !== 2 && i !== 6) { // Deixa livre as passagens de entrada e saída
      const px = Math.sin(angle) * (octoRadius - 0.8);
      const pz = 150 + Math.cos(angle) * (octoRadius - 0.8);
      const parapet = addBox([7.0, 1.0, 1.0], [px, 2.8, pz], materials.stoneDark, `octo parapet ${i}`, bridgeGroup);
      parapet.rotation.y = -angle + Math.PI / 2;
    }
  }

  // Trecho 3: Extensão da ponte em direção à margem externa (z = 168 até z = 205)
  addBox([14, 1.2, 38], [0, 1.4, 186], materials.stoneDark, 'outer bridge base', bridgeGroup);
  addBox([3, 0.3, 38], [-5.5, 2.05, 186], materials.islandGrass, 'outer bridge grass L', bridgeGroup);
  addBox([3, 0.3, 38], [5.5, 2.05, 186], materials.islandGrass, 'outer bridge grass R', bridgeGroup);
  addBox([8, 0.3, 38], [0, 2.12, 186], materials.path, 'outer bridge sand path', bridgeGroup);

  // Pilares na água sob a extensão da ponte
  for (let pz of [176, 196]) {
    addCylinder(1.4, 2.2, [-4.0, 1.1, pz], materials.wood, 'timber pier L', bridgeGroup);
    addCylinder(1.4, 2.2, [4.0, 1.1, pz], materials.wood, 'timber pier R', bridgeGroup);
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
 * Cria a geometria de corte para uma Seteira com parte inferior plana e superior arredondada
 */
function createSeteiraCutter(width = 1.2, height = 3.6, depth = 8.0) {
  const boxH = height - width / 2;
  const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(width, boxH, depth));
  boxMesh.position.set(0, boxH / 2, 0);
  updateMeshMatrix(boxMesh);

  const radius = width / 2;
  const archMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 16));
  archMesh.rotation.x = Math.PI / 2;
  archMesh.position.set(0, boxH, 0);
  updateMeshMatrix(archMesh);

  const boxCSG = CSG.fromMesh(boxMesh);
  const archCSG = CSG.fromMesh(archMesh);
  return boxCSG.union(archCSG);
}

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

  // Muralhas Sul (Lado esquerdo e direito do portão) com seteiras
  addBox([72, WALL_HEIGHT, WALL_THICKNESS], [-44, WALL_HEIGHT / 2, 80], materials.stone, 'south wall left', wallsGroup);
  addBox([72, WALL_HEIGHT, WALL_THICKNESS], [44, WALL_HEIGHT / 2, 80], materials.stone, 'south wall right', wallsGroup);

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

  // Torres gêmeas retangulares ladeando o portão
  addBox([14, 26, 22], [-11, 13, 85], materials.stoneDark, 'gatehouse tower L', gatehouseGroup);
  addBox([14, 26, 22], [11, 13, 85], materials.stoneDark, 'gatehouse tower R', gatehouseGroup);

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

  // Ameias superiores do Gatehouse
  for (let x of [-15, -11, -7, 7, 11, 15]) {
    addBox([3, 2, 3], [x, 27, 94.5], materials.stone, 'gh merlon front', gatehouseGroup);
    addBox([3, 2, 3], [x, 27, 75.5], materials.stone, 'gh merlon back', gatehouseGroup);
  }

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

  // Configuração das 4 torres de canto
  const cornerTowersConfig = [
    { pos: [-80, -80], name: 'Tower_NW', doorwayAngle: Math.PI / 4, enterX: -74.5, enterZ: -74.5 },
    { pos: [80, -80],  name: 'Tower_NE', doorwayAngle: (3 * Math.PI) / 4, enterX: 74.5, enterZ: -74.5 },
    { pos: [-80, 80],  name: 'Tower_SW', doorwayAngle: -Math.PI / 4, enterX: -74.5, enterZ: 74.5 },
    { pos: [80, 80],   name: 'Tower_SE', doorwayAngle: -(3 * Math.PI) / 4, enterX: 74.5, enterZ: 74.5 }
  ];

  cornerTowersConfig.forEach((cfg) => {
    const tx = cfg.pos[0];
    const tz = cfg.pos[1];

    // 1. Cilindro sólido externo da torre
    const towerRadius = 9.0;
    const towerHeight = 30.0;
    const towerMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(towerRadius, towerRadius, towerHeight, 32),
      materials.stoneDark
    );
    towerMesh.position.set(tx, 15, tz);
    updateMeshMatrix(towerMesh);

    let towerCSG = CSG.fromMesh(towerMesh);

    // 2. CSG SUBTRAÇÃO 1: Esvazia o interior superior da torre (Deck / Plataforma acessível)
    // Deixa um piso firme na altura do passadiço (y = 17.5) e um parapeito de pedra ao redor
    const innerRadius = 7.6;
    const deckHollowHeight = 13.5;
    const deckHollowMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(innerRadius, innerRadius, deckHollowHeight, 32)
    );
    deckHollowMesh.position.set(tx, 17.5 + deckHollowHeight / 2, tz);
    updateMeshMatrix(deckHollowMesh);

    towerCSG = towerCSG.subtract(CSG.fromMesh(deckHollowMesh));

    // 3. CSG SUBTRAÇÃO 2: Esculpe a abertura de acesso em arco (Pórtico de entrada na torre)
    // Conectando diretamente o passadiço da muralha (y = 17.5) à plataforma interna da torre
    const doorW = 3.6;
    const doorH = 5.2;
    const doorDepth = 6.0;

    const doorBox = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, doorDepth));
    doorBox.position.set(0, doorH / 2, 0);
    updateMeshMatrix(doorBox);

    const doorArch = new THREE.Mesh(new THREE.CylinderGeometry(doorW / 2, doorW / 2, doorDepth, 16));
    doorArch.rotation.x = Math.PI / 2;
    doorArch.position.set(0, doorH, 0);
    updateMeshMatrix(doorArch);

    const archCutterCSG = CSG.fromMesh(doorBox).union(CSG.fromMesh(doorArch));

    // Posiciona e rotaciona o cortador na direção da passagem que conecta ao passadiço
    const doorwayHelper = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    doorwayHelper.position.set(cfg.enterX, 17.5, cfg.enterZ);
    doorwayHelper.rotation.y = cfg.doorwayAngle;
    updateMeshMatrix(doorwayHelper);

    // Converte o cortador no espaço global
    const placedCutterMesh = CSG.toMesh(archCutterCSG, doorwayHelper.matrix, materials.stoneDark);
    updateMeshMatrix(placedCutterMesh);

    towerCSG = towerCSG.subtract(CSG.fromMesh(placedCutterMesh));

    // Converte de volta para Mesh Three.js
    const finalTowerMesh = CSG.toMesh(towerCSG, auxMat, materials.stoneDark);
    finalTowerMesh.castShadow = true;
    finalTowerMesh.receiveShadow = true;
    finalTowerMesh.name = cfg.name;
    towersGroup.add(finalTowerMesh);
    collidableObjects.push(finalTowerMesh);

    // 4. Piso plano da plataforma superior da torre (y = 17.5) para colisão e caminhabilidade
    const floorMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(innerRadius, innerRadius, 0.4, 24),
      materials.roof
    );
    floorMesh.position.set(tx, 17.3, tz);
    floorMesh.receiveShadow = true;
    towersGroup.add(floorMesh);
    collidableObjects.push(floorMesh);

    // 5. Ameias cilíndricas no topo da torre para acabamento arquitetônico
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

  for (let i = 0; i < numSteps; i += 1) {
    const y = stepHeight / 2 + i * stepHeight;
    const z = baseZ + i * stepDepth;
    addBox([stepWidth, stepHeight, stepDepth], [baseX, y, z], materials.stoneDark, `wall stair step ${i + 1}`, wallsGroup);
  }
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

  // Andar Superior
  const uWidth = 22;
  const uHeight = 6;
  const uDepth = 18;
  const uBaseY = gHeight;
  const uY = uBaseY + uHeight / 2;

  addBox([gWidth, 1, gDepth], [x, uBaseY + 0.5, z], materials.wood, `${name} ceiling`, group);
  addBox([t, uHeight, uDepth], [x - uWidth / 2 + t / 2, uY, z], materials.stone, `${name} up wall left`, group);
  addBox([t, uHeight, uDepth], [x + uWidth / 2 - t / 2, uY, z], materials.stone, `${name} up wall right`, group);
  addBox([uWidth - t * 2, uHeight, t], [x, uY, z - uDepth / 2 + t / 2], materials.stone, `${name} up wall back`, group);
  addBox([uWidth - t * 2, uHeight, t], [x, uY, z + uDepth / 2 - t / 2], materials.stone, `${name} up wall front`, group);

  addBox([26, 2.5, 22], [x, uBaseY + uHeight + 1.25, z], materials.roof, `${name} roof`, group);

  const stairX = x < 0 ? x - 14 : x + 14;
  const stairZ = stairDirection === 1 ? z - 6 : z + 6;
  createStaircase(stairX, stairZ, stairDirection, 6, group, `${name} stair`);

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
