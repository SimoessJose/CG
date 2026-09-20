import * as THREE from 'three';
import { setDefaultMaterial } from '../libs/util/util.js';
import { collidableObjects } from './basicScene.js';

export class ShootingSystem {
  constructor(scene, camera, weaponMesh) {
    this.scene = scene;
    this.camera = camera;
    this.weaponMesh = weaponMesh;
    
    this.projectiles = [];
    this.speed = 60.0;
    this.maxDistance = 150.0;
    this.fireRate = 0.25;
    this.cooldown = 0;
    
    this.sphereGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    this.sphereMaterial = setDefaultMaterial('rgb(255, 50, 50)');
    
    this.shootDirection = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
  }

  shoot() {
    if (this.cooldown > 0) return;

    const projectile = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial);
    this.weaponMesh.getWorldPosition(projectile.position);
    this.camera.getWorldDirection(this.shootDirection);
    
    projectile.userData.velocity = this.shootDirection.clone().multiplyScalar(this.speed);
    projectile.userData.distanceTraveled = 0;
    
    this.scene.add(projectile);
    this.projectiles.push(projectile);
    
    this.cooldown = this.fireRate;
  }

  update(delta) {
    if (this.cooldown > 0) {
      this.cooldown -= delta;
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const moveDistance = p.userData.velocity.clone().multiplyScalar(delta);
      const stepLength = moveDistance.length();

      // Trajetória do raio de colisão do tiro
      const rayDir = p.userData.velocity.clone().normalize();
      this.raycaster.set(p.position, rayDir);
      
      const intersects = this.raycaster.intersectObjects(collidableObjects, false);

      // Colisão com paredes/objetos, com o chão (y <= 0) ou limite de alcance
      if ((intersects.length > 0 && intersects[0].distance <= stepLength + 0.2) ||
          p.position.y <= 0 ||
          p.userData.distanceTraveled >= this.maxDistance) {
        this.scene.remove(p);
        this.projectiles.splice(i, 1);
        continue;
      }

      p.position.add(moveDistance);
      p.userData.distanceTraveled += stepLength;
    }
  }
}