import * as THREE from 'three';
import {
  initRenderer,
  initCamera,
  InfoBox,
  onWindowResize
} from '../libs/util/util.js';

import { FPAAControls } from './cameraControls.js';
import { createWeapon } from './weapon.js';
import { ShootingSystem } from './shootingSystem.js';
import { collidableObjects, doorPivots, updateKeysHUD } from './gameState.js';
import { createCastle } from './castle.js';
import { createPortalDais, updatePortalSystem } from './portal.js';
import { initEnemies, updateEnemies } from './enemies.js';
import { initLighting } from './lighting.js';

export { collidableObjects, doorPivots };

// ============================================================================
// INICIALIZAÇÃO DA CENA E RENDERIZADOR
// ============================================================================
const scene = new THREE.Scene();
const renderer = initRenderer();

// Habilitação e calibração de sombras suaves de alto desempenho (PCFSoftShadowMap)
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Câmera posicionada na ponte de entrada do castelo, voltada para o pórtico principal
const camera = initCamera(new THREE.Vector3(0, 4.0, 155));
scene.add(camera);

// ============================================================================
// SISTEMA DE ILUMINAÇÃO (DIA/NOITE, SOMBRAS DIRECIONAIS E MATERIAIS)
// ============================================================================
initLighting(scene);

// ============================================================================
// MONTAGEM DO CENÁRIO E ELEMENTOS CSG
// ============================================================================
// 1. Castelo, Fosso, Ponte Externa Elevada, Seteiras e Torres com CSG
createCastle(scene);

// 2. Escotilha circular e 4 Pedestais do Portal Mágico no pátio interno
createPortalDais(scene, new THREE.Vector3(0, 0.1, 0));

// 3. Sistema de Inimigos (4 monstros/fantasmas importados com barras de HP e luzes)
initEnemies(scene);

// ============================================================================
// ELEMENTOS DE GAMEPLAY (CONTROLES, BESTA E DISPAROS)
// ============================================================================
const cameraControls = new FPAAControls(camera, renderer.domElement);
const weapon = createWeapon(camera);
cameraControls.setWeapon(weapon);

const shootingSystem = new ShootingSystem(scene, camera, weapon);

// Atualização inicial da interface gráfica de chaves (HUD)
updateKeysHUD();

window.addEventListener('resize', () => onWindowResize(camera, renderer), false);

// Previne o menu de contexto do botão direito para disparar com ambos os botões do mouse
window.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

// Disparo ao pressionar qualquer um dos botões do mouse (esquerdo ou direito)
document.body.addEventListener('mousedown', (event) => {
  if (document.pointerLockElement === document.body) {
    if (event.button === 0 || event.button === 2) {
      shootingSystem.shoot();
    }
  }
});

// Interação manual opcional com a tecla 'E' para abrir/fechar portas
const interactRaycaster = new THREE.Raycaster();
document.body.addEventListener('keydown', (event) => {
  if (event.code === 'KeyE' && document.pointerLockElement === document.body) {
    interactRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = interactRaycaster.intersectObjects(doorPivots, true);

    if (intersects.length > 0) {
      const distance = intersects[0].distance;
      if (distance < 18) {
        let pivot = intersects[0].object;
        while (pivot && pivot.userData.isOpen === undefined) {
          pivot = pivot.parent;
        }
        if (pivot && pivot.userData !== undefined) {
          pivot.userData.isOpen = !pivot.userData.isOpen;
          pivot.userData.targetAngle = pivot.userData.isOpen ? Math.PI / 2 : 0;
        }
      }
    }
  }
});

// ============================================================================
// PAINEL DE INFORMAÇÕES E CONTROLES
// ============================================================================
const controlsInfo = new InfoBox();
controlsInfo.add('FPAA - Castelo de Bodiam (T2)');
controlsInfo.add('Clique na tela para iniciar');
controlsInfo.add('WASD / Setas: Movimentar (Deslize suave)');
controlsInfo.add('Shift: Correr mais rápido (Sprint)');
controlsInfo.add('Espaço: Pular');
controlsInfo.add('Mouse: Mirar / Disparar Besta (Botões L/R)');
controlsInfo.add('Tecla H: Alternar Dia (10h) / Noite (18h)');
controlsInfo.add('Tecla K: Conceder todas as 4 chaves (Atalho de teste)');
controlsInfo.add('Tecla C: Alternar Câmera (FPAA / Órbita)');
controlsInfo.add('Portas: Abrem por aproximação (ou tecla E)');
controlsInfo.add('Objetivo: À noite, elimine os 4 monstros para coletar as chaves e abrir o portal!');
controlsInfo.show();

// ============================================================================
// LOOP PRINCIPAL DE RENDERIZAÇÃO
// ============================================================================
const clock = new THREE.Clock();
const PROXIMITY_OPEN_DIST = 12.0;
const PROXIMITY_CLOSE_DIST = 16.0;
const doorPivotPosition = new THREE.Vector3();

function render() {
  requestAnimationFrame(render);

  const delta = clock.getDelta();

  // 1. Atualiza movimentação, sprint (Shift), pulo e colisão física
  cameraControls.update(delta);

  // 2. Atualiza voo dos dardos, colisão com inimigos e recarga da besta
  shootingSystem.update(delta);

  // 3. Atualiza inimigos, barras de vida, transição de opacidade e coleta de chaves
  updateEnemies(delta, camera, camera.position);

  // 4. Atualiza pedestais, depósito de chaves por aproximação e animação do portal
  updatePortalSystem(delta, camera.position);

  // 5. Abertura e fechamento automático de portas por proximidade
  doorPivots.forEach((pivot) => {
    pivot.getWorldPosition(doorPivotPosition);
    const distanceToPlayer = camera.position.distanceTo(doorPivotPosition);

    if (distanceToPlayer < PROXIMITY_OPEN_DIST) {
      pivot.userData.isOpen = true;
      pivot.userData.targetAngle = Math.PI / 2;
    } else if (distanceToPlayer > PROXIMITY_CLOSE_DIST) {
      pivot.userData.isOpen = false;
      pivot.userData.targetAngle = 0;
    }

    // Animação suave com interpolação linear (lerp)
    pivot.rotation.y = THREE.MathUtils.lerp(pivot.rotation.y, pivot.userData.targetAngle, delta * 5);
  });

  // Renderização final da cena
  renderer.render(scene, camera);
}

render();
