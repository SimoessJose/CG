import * as THREE from 'three';
import {
  initRenderer,
  initCamera,
  initDefaultBasicLight,
  InfoBox,
  onWindowResize
} from '../libs/util/util.js';

import { FPAAControls } from './cameraControls.js';
import { createWeapon } from './weapon.js';
import { ShootingSystem } from './shootingSystem.js';
import { collidableObjects, doorPivots } from './gameState.js';
import { createCastle } from './castle.js';

// Re-exporta para compatibilidade
export { collidableObjects, doorPivots };

const scene = new THREE.Scene();
const renderer = initRenderer();

// Câmera posicionada para visualizar a entrada
const camera = initCamera(new THREE.Vector3(0, 15, 150)); 
scene.add(camera);

// ============================================================================
// ILUMINAÇÃO 
// ============================================================================
scene.background = new THREE.Color(0x87CEEB); // Céu azul
initDefaultBasicLight(scene, false, new THREE.Vector3(150, 250, 100));

// ============================================================================
// ELEMENTOS DE GAMEPLAY
// ============================================================================
const cameraControls = new FPAAControls(camera, renderer.domElement);
const weapon = createWeapon(camera);
cameraControls.setWeapon(weapon); // Permite ocultar a arma durante o modo órbita
const shootingSystem = new ShootingSystem(scene, camera, weapon);

// ============================================================================
// MONTAGEM DO CENÁRIO
// ============================================================================
createCastle(scene);

window.addEventListener('resize', () => onWindowResize(camera, renderer), false);

// Previne o menu de contexto do navegador para o botão direito atirar normalmente
window.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

// --- Controles de Tiro e Interação ---
document.body.addEventListener('mousedown', (event) => {
  if (document.pointerLockElement === document.body) {
    if (event.button === 0 || event.button === 2) {
      shootingSystem.shoot();
    }
  }
});

// Interação manual opcional com a tecla E (além da abertura automática por proximidade)
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

const controlsInfo = new InfoBox();
controlsInfo.add('FPAA - Castelo de Bodiam');
controlsInfo.add('Clique na tela para iniciar');
controlsInfo.add('WASD / Setas: Movimentar (Deslize suave em paredes)');
controlsInfo.add('Espaço: Pular');
controlsInfo.add('C: Alternar Câmera (Primeira Pessoa / Orbital)');
controlsInfo.add('Mouse: Mirar / Atirar (Botões Esquerdo ou Direito)');
controlsInfo.add('Portas: Abrem por proximidade (ou tecla E)');
controlsInfo.add('Muros: Escada de acesso à muralha e prancha de queda');
controlsInfo.show();

const clock = new THREE.Clock();

const PROXIMITY_OPEN_DIST = 11.0;
const PROXIMITY_CLOSE_DIST = 15.0;
const doorPivotPosition = new THREE.Vector3();

function render() {
  requestAnimationFrame(render);
  
  const delta = clock.getDelta();
  
  // Atualiza movimentação, colisão com deslize e escadas (gerenciado por cameraControls)
  cameraControls.update(delta);

  // Atualiza disparos
  shootingSystem.update(delta);
  
  // Abertura e fechamento automático de portas por proximidade (conforme enunciado)
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

    // Animação suave com lerp
    pivot.rotation.y = THREE.MathUtils.lerp(pivot.rotation.y, pivot.userData.targetAngle, delta * 5);
  });
  
  renderer.render(scene, camera);
}

render();