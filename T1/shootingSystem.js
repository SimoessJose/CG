import * as THREE from 'three';
import { setDefaultMaterial } from '../libs/util/util.js';
import { collidableObjects } from './gameState.js';




export class ShootingSystem {
  
  //Declara dados da camera
  constructor(scene, camera, weaponMesh) {
    this.scene = scene;
    this.camera = camera;
    this.weaponMesh = weaponMesh;
    
    this.projectiles = [];
    this.speed = 60.0;
    this.maxDistance = 150.0;
    this.fireRate = 0.25;
    this.cooldown = 0;
    
    //declaração do projétil
    this.sphereGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    this.sphereMaterial = setDefaultMaterial('rgb(255, 50, 50)');
    
    this.shootDirection = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
  }
  
  shoot() {
    //O jogador não pode atirar infinitas vezes por segundo, só atira quando o cooldown é 0
    if (this.cooldown > 0) return;
    
    //Declara projetil, mistura a Goemetria com a Esfera
    const projectile = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial);
    //Adiciona o projetil na frente da arma
    //Para funcionar, temos que saber onde a arma está e para onde o tiro vai
    this.weaponMesh.getWorldPosition(projectile.position);
    //Direção do tiro é a direção que a camera está olhando
    this.camera.getWorldDirection(this.shootDirection);
    
    // Pega direção do tiro e multiplica escalarmente 
    projectile.userData.velocity = this.shootDirection.clone().multiplyScalar(this.speed);
    projectile.userData.distanceTraveled = 0;
    
    //Adiciona o projetil na cena e empurra ele
    this.scene.add(projectile);
    this.projectiles.push(projectile);
    
    this.cooldown = this.fireRate;
  }

  update(delta) {
    // Coldown vai diminuindo com o tempo devido ao delta a cada iteração
    if (this.cooldown > 0) {
      this.cooldown -= delta;
    }


    for (let i = this.projectiles.length - 1; i >= 0; i--) {

      //Para cada bala, ela calcula a distância que deve se mover neste quadro
      const p = this.projectiles[i];

      //Distancia = velocidade * tempo
      const moveDistance = p.userData.velocity.clone().multiplyScalar(delta);
      
      //Comprimento escalar do movimento
      const stepLength = moveDistance.length();

      //Trajetória do raio de colisão do tiro
      //Se calcula o raio de colisão, vetor direção com tamanho 1 em direção para onde a bala esta indo
      //Posiciona o Raycaster onde a bala está e lança raio em direção ao objeto do cenário
      const rayDir = p.userData.velocity.clone().normalize();
      this.raycaster.set(p.position, rayDir);
      

      const intersects = this.raycaster.intersectObjects(collidableObjects, false);

      // Colisão com paredes/objetos, com o chão (y <= 0) ou limite de alcance
      // Colisão Frontal
      // Colisão com o chão
      // Alcance Máximo
      if ((intersects.length > 0 && intersects[0].distance <= stepLength + 0.2) ||
          p.position.y <= 0 ||
          p.userData.distanceTraveled >= this.maxDistance) {

      // Destruição e limpeza
        this.scene.remove(p);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Se o if não foi ativado, atualizamos o move distance do P
      // Movemos o P e atualizamos a distância de movimento de P
      p.position.add(moveDistance);
      p.userData.distanceTraveled += stepLength;
    }
  }
}