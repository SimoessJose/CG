import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { collidableObjects } from './gameState.js';

export class FPAAControls {
  // Configura o estado inicial do Jogador
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.orbit = new OrbitControls(camera, domElement);
    this.orbit.enabled = false;
    this.orbit.target.set(0, 4, 0);

    this.pointerControls = new PointerLockControls(camera, document.body);

    this.isOrbitActive = false;
    this.savedFPAAPosition = new THREE.Vector3();
    this.savedFPAARotation = new THREE.Euler();
    
    this.moveState = { forward: false, backward: false, left: false, right: false };
    this.velocity = new THREE.Vector3();
    this.clock = new THREE.Clock();
    
    // Fisica e Medidas do jogo
    this.speed = 22.0;
    this.jumpForce = 12.0;
    this.gravity = 35.0;
    this.canJump = true;
    this.playerHeight = 2.0; 
    this.playerRadius = 0.8; 
    this.stepMaxHeight = 0.8; // Permite absorver degraus e escadas suavemente

    //Inicia o weaponMesh vazio
    this.weaponMesh = null;
    //Instancia Raycaster - Vai ser usado para calcular as colisões
    this.raycaster = new THREE.Raycaster();

    this._initEvents();
  }

  //Metodo para receber o objeto 
  setWeapon(weaponMesh) {
    this.weaponMesh = weaponMesh;
  }

  _initEvents() {
    document.body.addEventListener('click', () => {
      if (!this.isOrbitActive) this.pointerControls.lock();
    });

    document.addEventListener('keydown', (event) => {
      
      // Caso a gente aperte a Tecla C, ira responder de acordo com o
      // modo em que a camera esta atualmente
      if (event.key === 'c' || event.key === 'C') {
        this.isOrbitActive = !this.isOrbitActive;
        const crosshair = document.getElementById('crosshair');
        

        // Se estiver em Órbita, volta para a posição que estava antes
        // de entrar em órbita
        if (this.isOrbitActive) {

          //Libera pointerControls e salva posição em que a FPAA Camera estava
          this.pointerControls.unlock();
          this.savedFPAAPosition.copy(this.camera.position);
          this.savedFPAARotation.copy(this.camera.rotation);
          
          // Esconde a mira e a arma
          if (crosshair) crosshair.style.display = 'none';
          if (this.weaponMesh) this.weaponMesh.visible = false;

          // Libera orbita
          this.orbit.enabled = true;
          this.camera.position.set(0, 80, 180);
          this.orbit.target.set(0, 4, 0); 
          this.orbit.update();
        } else {
          //Volta para a posição base da FPAA, salva a posição da camera Orbital
          this.orbit.enabled = false;
          this.camera.position.copy(this.savedFPAAPosition);
          this.camera.rotation.copy(this.savedFPAARotation);
        
          //Volta com a camera para a tela
          if (crosshair) crosshair.style.display = 'block';
          if (this.weaponMesh) this.weaponMesh.visible = true;

          this.pointerControls.lock();
        }
      }

      if (!this.isOrbitActive) {
        switch (event.code) {
          case 'ArrowUp': case 'KeyW': this.moveState.forward = true; break;
          case 'ArrowLeft': case 'KeyA': this.moveState.left = true; break;
          case 'ArrowDown': case 'KeyS': this.moveState.backward = true; break;
          case 'ArrowRight': case 'KeyD': this.moveState.right = true; break;
          case 'Space': 
            if (this.canJump) {
              this.velocity.y = this.jumpForce;
              this.canJump = false;
            }
            break;
        }
      }
    });

    document.addEventListener('keyup', (event) => {
      if (!this.isOrbitActive) {
        switch (event.code) {
          // Desabilita movimento quando se solta tecla (keyup)
          case 'ArrowUp': case 'KeyW': this.moveState.forward = false; break;
          case 'ArrowLeft': case 'KeyA': this.moveState.left = false; break;
          case 'ArrowDown': case 'KeyS': this.moveState.backward = false; break;
          case 'ArrowRight': case 'KeyD': this.moveState.right = false; break;
        }
      }
    });
  }

  // Função Update - Roda o tempo todo
  update() {
    const delta = this.clock.getDelta();
    if (delta > 0.1) return;

    if (this.pointerControls.isLocked && !this.isOrbitActive) {
      // Vetor de Direção de Movimento
      const moveVector = new THREE.Vector3();
      
      const forwardDir = new THREE.Vector3();
      this.camera.getWorldDirection(forwardDir);
      forwardDir.y = 0;
      forwardDir.normalize();

      const sideDir = new THREE.Vector3();
      sideDir.crossVectors(this.camera.up, forwardDir).negate().normalize();

      if (this.moveState.forward) moveVector.add(forwardDir);
      if (this.moveState.backward) moveVector.sub(forwardDir);
      if (this.moveState.right) moveVector.add(sideDir);
      if (this.moveState.left) moveVector.sub(sideDir);

      if (moveVector.lengthSq() > 0) {
        moveVector.normalize().multiplyScalar(this.speed * delta);
      }

      // 2. Colisão Horizontal + Efeito de Deslize na Parede (Sliding)
      if (moveVector.lengthSq() > 0) {
        const rayOrigin = this.camera.position.clone();
        rayOrigin.y -= 0.8; // Altura da cintura, acima de degraus

        const moveDir = moveVector.clone().normalize();
        this.raycaster.set(rayOrigin, moveDir);
        const collisions = this.raycaster.intersectObjects(collidableObjects, false);

        if (collisions.length > 0 && collisions[0].distance < moveVector.length() + this.playerRadius) {
          const hit = collisions[0];
          const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
          normal.y = 0;
          normal.normalize();

          // Projeta o vetor de movimento no plano do obstáculo para deslizar sem travar
          const dot = moveVector.dot(normal);
          if (dot < 0) {
            moveVector.sub(normal.clone().multiplyScalar(dot));
          }

          // Checagem secundária para cantos e esquinas
          if (moveVector.lengthSq() > 0.0001) {
            const slideDir = moveVector.clone().normalize();
            this.raycaster.set(rayOrigin, slideDir);
            const secondHits = this.raycaster.intersectObjects(collidableObjects, false);
            if (secondHits.length > 0 && secondHits[0].distance < moveVector.length() + this.playerRadius) {
              const normal2 = secondHits[0].face.normal.clone().transformDirection(secondHits[0].object.matrixWorld);
              normal2.y = 0;
              normal2.normalize();
              const dot2 = moveVector.dot(normal2);
              if (dot2 < 0) {
                moveVector.sub(normal2.clone().multiplyScalar(dot2));
              }
            }
          }
        }
      }

      this.camera.position.x += moveVector.x;
      this.camera.position.z += moveVector.z;

      // 3. Colisão Vertical, Escadas e Queda Suave
      const downRayOrigin = this.camera.position.clone();
      this.raycaster.set(downRayOrigin, new THREE.Vector3(0, -1, 0));
      
      const groundHits = this.raycaster.intersectObjects(collidableObjects, false);
      let groundY = 0;

      if (groundHits.length > 0) {
        groundY = groundHits[0].point.y;
      }

      const targetEyeHeight = groundY + this.playerHeight;
      const heightDiff = targetEyeHeight - this.camera.position.y;

      // 1. Pulo ativo ou em fase aérea com velocidade vertical
      if (!this.canJump || this.velocity.y > 0) {
        this.velocity.y -= this.gravity * delta;
        this.camera.position.y += this.velocity.y * delta;

        // Aterrissagem no chão ou degrau
        if (this.camera.position.y <= targetEyeHeight) {
          this.camera.position.y = targetEyeHeight;
          this.velocity.y = 0;
          this.canJump = true;
        }
      } else if (heightDiff > 0 && heightDiff <= this.stepMaxHeight) {
        // Subida suave de degraus/escadas (Efeito rampa)
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetEyeHeight, 15 * delta);
        this.velocity.y = 0;
        this.canJump = true;
      } else if (heightDiff < 0 && heightDiff >= -this.stepMaxHeight) {
        // Descida suave de degraus/escadas (Efeito rampa ao caminhar)
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetEyeHeight, 15 * delta);
        this.velocity.y = 0;
        this.canJump = true;
      } else {
        // Queda suave com gravidade (ao sair de blocos altos ou do muro)
        this.velocity.y -= this.gravity * delta;
        this.camera.position.y += this.velocity.y * delta;

        if (this.camera.position.y <= targetEyeHeight) {
          this.camera.position.y = targetEyeHeight;
          this.velocity.y = 0;
          this.canJump = true;
        }
      }
    }
  }
}