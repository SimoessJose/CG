import * as THREE from 'three';
import { activeEnemies, collidableObjects, gameState } from './gameState.js';
import { createBoltMesh, setLoadedBoltVisible, triggerCrossbowRecoil, updateWeaponAnimation } from './weapon.js';

export class ShootingSystem {
  constructor(scene, camera, weaponGroup) {
    this.scene = scene;
    this.camera = camera;
    this.weaponGroup = weaponGroup;

    this.projectiles = [];
    this.speed = 80.0;          // Velocidade de voo veloz e realista do dardo
    this.maxDistance = 200.0;   // Alcance máximo do disparo
    this.reloadTime = 1.0;      // Tempo de recarga entre disparos (em segundos)
    this.cooldown = 0;

    this.raycaster = new THREE.Raycaster();
    this.shootDirection = new THREE.Vector3();
    this.spawnPosition = new THREE.Vector3();
  }

  /**
   * Dispara um dardo de alta velocidade na direção da mira
   */
  shoot() {
    // Não dispara se estiver no período de recarga
    if (this.cooldown > 0) return;

    // 1. Oculta o dardo que estava repousado na besta
    setLoadedBoltVisible(false);

    // 2. Dispara a animação física de coice da besta
    triggerCrossbowRecoil();

    // 3. Cria a malha do dardo com geometria autêntica de projétil
    const bolt = createBoltMesh();

    // Calcula a posição de saída (bico da coronha da besta)
    this.camera.getWorldDirection(this.shootDirection);
    this.camera.getWorldPosition(this.spawnPosition);

    // Posiciona ligeiramente à frente da câmera e na linha de visada
    this.spawnPosition.addScaledVector(this.shootDirection, 0.85);
    this.spawnPosition.y -= 0.15; // Alinhado com a altura da besta

    bolt.position.copy(this.spawnPosition);

    // Orienta a ponta do dardo para frente na direção da mira
    const forwardVector = new THREE.Vector3(0, 0, -1);
    bolt.quaternion.setFromUnitVectors(forwardVector, this.shootDirection);

    bolt.userData.velocity = this.shootDirection.clone().multiplyScalar(this.speed);
    bolt.userData.distanceTraveled = 0;

    this.scene.add(bolt);
    this.projectiles.push(bolt);

    // Inicia o contador de tempo de recarga
    this.cooldown = this.reloadTime;
  }

  /**
   * Atualiza movimentação, colisões e ciclo de recarga dos disparos
   */
  update(delta) {
    // 1. Atualização do tempo de recarga e animações da arma
    if (this.cooldown > 0) {
      this.cooldown -= delta;
    }
    const reloadProgress = 1.0 - Math.max(0, this.cooldown) / this.reloadTime;
    updateWeaponAnimation(delta, reloadProgress);

    // 2. Atualização dos projéteis em voo
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const step = p.userData.velocity.clone().multiplyScalar(delta);
      const stepLength = step.length();
      const rayDir = p.userData.velocity.clone().normalize();

      this.raycaster.set(p.position, rayDir);

      let collided = false;

      // Checagem de colisão com inimigos (apenas se for turno noturno e visíveis)
      if (!gameState.isDayMode && activeEnemies.length > 0) {
        // Coleta os nós de colisão dos inimigos vivos
        const enemyHitTargets = [];
        for (const enemy of activeEnemies) {
          if (enemy.isAlive && enemy.collisionMesh) {
            enemyHitTargets.push(enemy.collisionMesh);
          }
        }

        const enemyHits = this.raycaster.intersectObjects(enemyHitTargets, false);
        if (enemyHits.length > 0 && enemyHits[0].distance <= stepLength + 0.3) {
          const hitMesh = enemyHits[0].object;
          if (hitMesh.userData.enemyRef) {
            hitMesh.userData.enemyRef.takeDamage(1);
          }
          collided = true;
        }
      }

      // Checagem de colisão com cenário, paredes e chão
      if (!collided) {
        const envHits = this.raycaster.intersectObjects(collidableObjects, false);
        if (envHits.length > 0 && envHits[0].distance <= stepLength + 0.3) {
          collided = true;
        }
      }

      // Limites de distância e nível da água (y <= -2.0)
      if (collided || p.position.y <= -2.0 || p.userData.distanceTraveled >= this.maxDistance) {
        this.scene.remove(p);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Se não colidiu, translada o dardo para frente
      p.position.add(step);
      p.userData.distanceTraveled += stepLength;
    }
  }
}
