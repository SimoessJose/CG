import * as THREE from 'three';
import { setDefaultMaterial } from '../libs/util/util.js';

export function createWeapon(camera) {
  // Define as dimensões do cilindro (arma)
  const radius = 0.1;
  const height = 0.8;
  
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
  
  const material = setDefaultMaterial('rgb(50, 50, 50)'); 
  
  const weaponMesh = new THREE.Mesh(geometry, material);
  
  // Rotaciona o cilindro para deitá-lo e apontar para a frente (direção da mira)
  weaponMesh.rotation.x = Math.PI / 2;
  
  // Posiciona a arma relativa à câmera:
  // X positivo (direita), Y negativo (baixo), Z negativo (frente)
  weaponMesh.position.set(0.4, -0.4, -1);
  
  // O pulo do gato: adiciona a arma como filha da câmera
  camera.add(weaponMesh);
  
  return weaponMesh;
}