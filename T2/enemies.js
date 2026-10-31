import * as THREE from 'three';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';
import { activeEnemies, droppedKeys, gameState, showNotification, updateKeysHUD } from './gameState.js';
import { materials } from './materials.js';

let sceneRef = null;

/**
 * Inicializa e carrega os 4 inimigos espalhados pelo castelo
 */
export function initEnemies(scene) {
  sceneRef = scene;
  window._enemiesSystem = { setEnemiesActive };

  const loader = new GLTFLoader();

  // Carrega o Fantasma (Ghost - Inimigo Flutuante, 3 HP)
  loader.load('assets/ghost.glb', (gltf) => {
    const baseGhost = gltf.scene;
    prepareModelMaterials(baseGhost);

    // Inimigo 1: Fantasma na parte 'caminhável' de um dos muros (Muralha Norte)
    createEnemyInstance({
      type: 'ghost',
      name: 'Fantasma dos Muros',
      modelTemplate: baseGhost,
      position: new THREE.Vector3(25, 18.2, -78),
      scale: 1.4,
      maxHP: 3,                 // "um tipo de inimigo morra ao receber 3 disparos"
      lightColor: 0x9d4edd,     // Luz pontual violeta/ciano identificável
      hoverHeight: 0.45,
      hoverSpeed: 2.5
    });

    // Inimigo 2: Fantasma no pátio interno / ruínas leste
    createEnemyInstance({
      type: 'ghost',
      name: 'Fantasma das Ruínas',
      modelTemplate: baseGhost,
      position: new THREE.Vector3(55, 3.5, -45),
      scale: 1.4,
      maxHP: 3,
      lightColor: 0x9d4edd,
      hoverHeight: 0.45,
      hoverSpeed: 2.2
    });
  });

  // Carrega o Monstro Slime (Inimigo Rastejante, 5 HP)
  loader.load('assets/slime.glb', (gltf) => {
    const baseSlime = gltf.scene;
    prepareModelMaterials(baseSlime);

    // Inimigo 3: Slime DENTRO de uma das edificações internas (Prédio Oeste)
    createEnemyInstance({
      type: 'slime',
      name: 'Slime do Santuário Interior',
      modelTemplate: baseSlime,
      position: new THREE.Vector3(-40, 1.0, -35),
      scale: 1.5,
      maxHP: 5,                 // "o outro tipo, com 5"
      lightColor: 0x2ecc71,     // Luz pontual verde esmeralda identificável
      hoverHeight: 0.0,
      hoverSpeed: 4.5
    });

    // Inimigo 4: Slime no pátio interno / perto do caminho principal
    createEnemyInstance({
      type: 'slime',
      name: 'Slime do Pátio',
      modelTemplate: baseSlime,
      position: new THREE.Vector3(-38, 1.0, 42),
      scale: 1.5,
      maxHP: 5,
      lightColor: 0x2ecc71,
      hoverHeight: 0.0,
      hoverSpeed: 4.0
    });
  });
}

/**
 * Converte todos os materiais do modelo importado para MeshLambertMaterial
 * conforme a exigência estrita: "Todos os objetos, exceto as chaves, devem possuir LambertMaterial"
 */
function prepareModelMaterials(object3d) {
  object3d.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      const oldMat = child.material;
      child.material = new THREE.MeshLambertMaterial({
        color: oldMat && oldMat.color ? oldMat.color.clone() : new THREE.Color(0xffffff),
        map: oldMat && oldMat.map ? oldMat.map : null,
        transparent: true,
        opacity: 1.0
      });
    }
  });
}

/**
 * Cria uma instância de inimigo com lógica, barra de vida e luz pontual
 */
function createEnemyInstance(config) {
  const group = new THREE.Group();
  group.position.copy(config.position);
  group.name = config.name;

  // Clona o modelo geométrico
  const model = config.modelTemplate.clone(true);
  model.scale.setScalar(config.scale);
  group.add(model);

  // Clona os materiais para garantir controle independente de opacidade na morte
  model.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material = child.material.clone();
    }
  });

  // Luz pontual de baixa intensidade identificável
  const pointLight = new THREE.PointLight(config.lightColor, 1.25, 15);
  pointLight.position.set(0, 1.5, 0);
  pointLight.castShadow = false; // Leveza de desempenho
  group.add(pointLight);

  // Barra de Vida 3D Billboard suspensa sobre o inimigo
  const healthBar = createHealthBar(config.maxHP);
  healthBar.group.position.set(0, 2.6, 0);
  group.add(healthBar.group);

  // Malha de colisão invisível (bounding box/cilindro) para receber tiros
  const hitBoxGeom = new THREE.CylinderGeometry(1.2, 1.2, 2.5, 8);
  const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
  const collisionMesh = new THREE.Mesh(hitBoxGeom, hitBoxMat);
  collisionMesh.position.set(0, 1.25, 0);
  group.add(collisionMesh);

  const enemyObj = {
    type: config.type,
    name: config.name,
    group,
    model,
    pointLight,
    healthBar,
    collisionMesh,
    basePosition: config.position.clone(),
    maxHP: config.maxHP,
    currentHP: config.maxHP,
    isAlive: true,
    isDying: false,
    opacity: 1.0,
    hoverHeight: config.hoverHeight,
    hoverSpeed: config.hoverSpeed,

    takeDamage(amount) {
      if (!this.isAlive || this.isDying) return;

      this.currentHP = Math.max(0, this.currentHP - amount);
      this.healthBar.update(this.currentHP, this.maxHP);

      // Flash visual de impacto
      this.flashHit();

      if (this.currentHP === 0) {
        this.die();
      }
    },

    flashHit() {
      model.traverse((child) => {
        if (child.isMesh && child.material) {
          const origColor = child.material.color.clone();
          child.material.color.setHex(0xff3333);
          setTimeout(() => {
            if (child.material) child.material.color.copy(origColor);
          }, 120);
        }
      });
    },

    die() {
      this.isDying = true;
      this.healthBar.group.visible = false;
      showNotification(`💀 ${this.name} foi eliminado! A chave mágica está surgindo...`);
    }
  };

  collisionMesh.userData.enemyRef = enemyObj;

  // Inimigos só começam visíveis se estiver no turno noturno
  group.visible = !gameState.isDayMode;
  pointLight.intensity = gameState.isDayMode ? 0 : 1.25;

  sceneRef.add(group);
  activeEnemies.push(enemyObj);
}

/**
 * Cria uma barra de vida 3D (Billboard) com fundo escuro e barra preenchida
 */
function createHealthBar(maxHP) {
  const group = new THREE.Group();

  const width = 1.6;
  const height = 0.22;

  // Fundo preto com borda
  const bgGeom = new THREE.PlaneGeometry(width + 0.08, height + 0.08);
  const bgMat = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
  const bgMesh = new THREE.Mesh(bgGeom, bgMat);
  group.add(bgMesh);

  // Barra de fundo vermelha
  const redGeom = new THREE.PlaneGeometry(width, height);
  const redMat = new THREE.MeshBasicMaterial({ color: 0x881111, side: THREE.DoubleSide });
  const redMesh = new THREE.Mesh(redGeom, redMat);
  redMesh.position.z = 0.01;
  group.add(redMesh);

  // Barra de vida verde que reduz com o dano
  const fillGeom = new THREE.PlaneGeometry(width, height);
  const fillMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71, side: THREE.DoubleSide });
  const fillMesh = new THREE.Mesh(fillGeom, fillMat);
  fillMesh.position.z = 0.02;
  group.add(fillMesh);

  return {
    group,
    fillMesh,
    fillMat,
    totalWidth: width,
    update(currentHP, maxHP) {
      const ratio = Math.max(0, currentHP / maxHP);
      this.fillMesh.scale.x = ratio;
      // Reposiciona o centro para ancorar na borda esquerda
      this.fillMesh.position.x = -(this.totalWidth * (1 - ratio)) / 2;

      // Cor dinâmica: verde -> amarelo -> vermelho
      if (ratio > 0.5) {
        this.fillMat.color.setHex(0x2ecc71);
      } else if (ratio > 0.25) {
        this.fillMat.color.setHex(0xf39c12);
      } else {
        this.fillMat.color.setHex(0xe74c3c);
      }
    }
  };
}

/**
 * Atualiza estado de atividade dos inimigos conforme Dia/Noite
 * "Os inimigos só estarão visíveis no turno noturno."
 */
export function setEnemiesActive(isActive) {
  for (const enemy of activeEnemies) {
    if (enemy.isAlive) {
      enemy.group.visible = isActive;
      enemy.pointLight.intensity = isActive ? 1.25 : 0.0;
    }
  }
}

/**
 * Spawna a chave mágica (esfera com emissive) no local da morte do monstro
 */
function spawnKey(position) {
  const keyGroup = new THREE.Group();
  keyGroup.position.copy(position);
  keyGroup.position.y += 0.8;

  // "representada por uma esfera com emissão de luz (parâmetro emissive do material utilizado)"
  const sphereGeom = new THREE.SphereGeometry(0.55, 32, 32);
  const sphereMesh = new THREE.Mesh(sphereGeom, materials.keySphere);
  sphereMesh.castShadow = true;
  keyGroup.add(sphereMesh);

  // Luz pontual própria da chave
  const keyLight = new THREE.PointLight(0x00e5ff, 1.4, 14);
  keyGroup.add(keyLight);

  sceneRef.add(keyGroup);

  droppedKeys.push({
    group: keyGroup,
    sphereMesh,
    keyLight,
    baseY: keyGroup.position.y,
    collected: false
  });
}

/**
 * Atualiza todos os inimigos, barras de vida, transições de opacidade e coleta de chaves
 */
export function updateEnemies(delta, camera, playerPos) {
  const time = Date.now() * 0.001;

  // 1. Atualização dos Inimigos
  for (let i = activeEnemies.length - 1; i >= 0; i--) {
    const enemy = activeEnemies[i];

    if (!enemy.isAlive) continue;

    // Se estiver morrendo: transição suave de opacidade até sumir completamente
    if (enemy.isDying) {
      enemy.opacity -= delta * 0.85; // Desvanece em ~1.2 segundos
      enemy.pointLight.intensity = Math.max(0, enemy.opacity * 1.25);

      enemy.model.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.opacity = Math.max(0, enemy.opacity);
        }
      });

      if (enemy.opacity <= 0) {
        // Morreu completamente: remove inimigo e solta a chave
        enemy.isAlive = false;
        sceneRef.remove(enemy.group);
        spawnKey(enemy.group.position);
        activeEnemies.splice(i, 1);
        continue;
      }
    } else {
      // Animações de movimento temático para inimigos vivos
      if (enemy.type === 'ghost') {
        // Fantasma: flutua suavemente no ar (onda senoidal)
        enemy.group.position.y = enemy.basePosition.y + Math.sin(time * enemy.hoverSpeed) * enemy.hoverHeight;
        enemy.model.rotation.y += delta * 0.4;
      } else if (enemy.type === 'slime') {
        // Slime: rasteja no chão com efeito elástico squash and stretch
        const squish = Math.sin(time * enemy.hoverSpeed);
        enemy.model.scale.y = 1.5 + squish * 0.22;
        enemy.model.scale.x = 1.5 - squish * 0.12;
        enemy.model.scale.z = 1.5 - squish * 0.12;
      }

      // Billboard da barra de vida: sempre voltada para a câmera
      enemy.healthBar.group.quaternion.copy(camera.quaternion);
    }
  }

  // 2. Atualização das Chaves soltas no chão
  for (let i = droppedKeys.length - 1; i >= 0; i--) {
    const key = droppedKeys[i];
    if (key.collected) continue;

    // Efeito de levitação e rotação mágica
    key.sphereMesh.rotation.y += delta * 1.8;
    key.group.position.y = key.baseY + Math.sin(time * 3.0) * 0.15;

    // Coleta por aproximação do jogador ("Chaves são adquiridas por aproximação")
    const distToPlayer = playerPos.distanceTo(key.group.position);
    if (distToPlayer < 3.8) {
      key.collected = true;
      sceneRef.remove(key.group);
      droppedKeys.splice(i, 1);

      gameState.playerKeys++;
      updateKeysHUD();
      showNotification(`🔑 Chave Mágica Coletada! (${gameState.playerKeys}/4) - Leve até os pedestais.`);
    }
  }
}
