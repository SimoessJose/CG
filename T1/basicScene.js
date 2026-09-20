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
import { collidableObjects, doorPivots } from './gameState.js';
import { createCastle } from './castle.js';

// Re-exporta para compatibilidade
export { collidableObjects, doorPivots };

const scene = new THREE.Scene();
const renderer = initRenderer();

// Câmera posicionada para visualizar a nova entrada longa
const camera = initCamera(new THREE.Vector3(0, 15, 150)); 
scene.add(camera);

// ============================================================================
// ILUMINAÇÃO DE DIA / CÉU CLARO
// ============================================================================

// 1. Muda a cor do "fundo" do universo para um Azul Céu
scene.background = new THREE.Color(0x87CEEB); // Código hexadecimal para "SkyBlue"

// 2. Luz Ambiente (Luz rebatida do sol, que clareia as sombras para não ficarem 100% pretas)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Cor branca, intensidade 0.6
scene.add(ambientLight);

// 3. Luz Direcional (Simula o Sol batendo diretamente no castelo)
const sunLight = new THREE.DirectionalLight(0xffffff, 1.2); // Cor branca, intensidade 1.2
sunLight.position.set(150, 250, 100); // Coloca o sol alto e inclinado no céu
scene.add(sunLight);

const cameraControls = new FPAAControls(camera, renderer.domElement);
const weapon = createWeapon(camera);
const shootingSystem = new ShootingSystem(scene, camera, weapon);

// ============================================================================
// MONTAGEM DO CENÁRIO
// ============================================================================
createCastle(scene);

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
      
      if (distance < 18) {
        // Sobe na hierarquia até achar o pivô (que tem os userData da porta)
        let pivot = intersects[0].object;
        while (pivot && pivot.userData.isOpen === undefined) {
          pivot = pivot.parent;
        }
        
        // Se encontrou o pivô válido, aplica a animação
        if (pivot && pivot.userData !== undefined) {
          pivot.userData.isOpen = !pivot.userData.isOpen;
          pivot.userData.targetAngle = pivot.userData.isOpen ? Math.PI / 2 : 0; 
        }
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

// Raycaster dedicado para o movimento (para evitar recriar todo frame)
const movementRaycaster = new THREE.Raycaster();
const PLAYER_RADIUS = 2.0; // Distância mínima da parede

function render() {
  requestAnimationFrame(render);
  
  const delta = clock.getDelta();
  
  // 1. Salva a posição exata antes do jogador se mover
  const oldPosition = camera.position.clone();
  
  // 2. Atualiza os controles (isso tenta mover a câmera)
  cameraControls.update(delta);
  
  // 3. Isola APENAS o movimento horizontal (X e Z) ignorando pulo/gravidade
  const moveX = camera.position.x - oldPosition.x;
  const moveZ = camera.position.z - oldPosition.z;
  const horizontalMove = new THREE.Vector3(moveX, 0, moveZ);
  const moveDistance = horizontalMove.length();
  
  // Se o jogador tentou andar para os lados ou para frente...
  if (moveDistance > 0.001) {
    const moveDirection = horizontalMove.clone().normalize();
    
    // Dispara um raio da posição antiga, APENAS na direção horizontal
    movementRaycaster.set(oldPosition, moveDirection);
    
    // Checa colisão
    const intersects = movementRaycaster.intersectObjects(collidableObjects, false);
    
    // Se bater em algo e a distância for menor que o movimento + o tamanho do jogador
    if (intersects.length > 0 && intersects[0].distance < (moveDistance + PLAYER_RADIUS)) {
      // COLISÃO DETECTADA!
      // Reverte APENAS o movimento horizontal (X e Z)
      camera.position.x = oldPosition.x;
      camera.position.z = oldPosition.z;
      
      // Perceba que NÃO revertemos o camera.position.y
      // Isso permite que o pulo e a gravidade funcionem normalmente!
    }
  }

  shootingSystem.update(delta);
  
  // Animação das portas
  doorPivots.forEach((pivot) => {
    pivot.rotation.y = THREE.MathUtils.lerp(pivot.rotation.y, pivot.userData.targetAngle, delta * 5);
  });
  
  renderer.render(scene, camera);
}

render();