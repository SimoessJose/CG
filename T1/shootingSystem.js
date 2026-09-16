import * as THREE from 'three';
import { setDefaultMaterial } from '../libs/util/util.js';

export class ShootingSystem {
  constructor(scene, camera, weaponMesh) {
    this.scene = scene;
    this.camera = camera;
    this.weaponMesh = weaponMesh;
    
    this.projectiles = [];
    
    // Parâmetros do sistema de tiro
    this.speed = 60.0;
    this.maxDistance = 150.0;
    this.fireRate = 0.25; // Cadência: tempo mínimo em segundos entre cada tiro
    this.cooldown = 0;
    
    // Otimização: reutilizar a mesma geometria e material para todas as esferas
    this.sphereGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    this.sphereMaterial = setDefaultMaterial('rgb(255, 50, 50)'); // Esferas vermelhas
    
    // Vetor auxiliar para calcular a direção
    this.shootDirection = new THREE.Vector3();
  }

  shoot() {
    // Verifica a cadência para impedir tiros infinitos em um único clique
    if (this.cooldown > 0) return;

    // Cria a malha do projétil
    const projectile = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial);
    
    // Define a posição inicial do tiro (na ponta da arma)
    // Usamos getWorldPosition porque a arma é filha da câmera e sofre transformações locais
    this.weaponMesh.getWorldPosition(projectile.position);
    
    // Pega a direção para onde a câmera (mira) está apontando
    this.camera.getWorldDirection(this.shootDirection);
    
    // Salva a velocidade (direção * velocidade) e a distância percorrida no próprio objeto
    projectile.userData.velocity = this.shootDirection.clone().multiplyScalar(this.speed);
    projectile.userData.distanceTraveled = 0;
    
    this.scene.add(projectile);
    this.projectiles.push(projectile);
    
    // Reseta o cooldown com base na cadência
    this.cooldown = this.fireRate;
  }

  update(delta) {
    // Atualiza o temporizador da cadência
    if (this.cooldown > 0) {
      this.cooldown -= delta;
    }

    // Percorre o array de projéteis de trás para frente para evitar problemas de índice ao remover elementos
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      
      // Move o projétil
      const moveDistance = p.userData.velocity.clone().multiplyScalar(delta);
      p.position.add(moveDistance);
      p.userData.distanceTraveled += moveDistance.length();
      
      // Lógica de Remoção: Colisão com o chão (y <= 0) ou distância máxima atingida
      if (p.position.y <= 0 || p.userData.distanceTraveled >= this.maxDistance) {
        this.scene.remove(p);
        this.projectiles.splice(i, 1);
      }
    }
  }
}