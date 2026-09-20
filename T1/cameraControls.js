import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { collidableObjects } from './gameState.js';

export class FPAAControls {
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
    
    this.speed = 22.0;
    this.jumpForce = 12.0;
    this.gravity = 35.0;
    this.canJump = true;
    this.playerHeight = 2.0; 
    this.playerRadius = 0.8; 
    this.stepMaxHeight = 0.8; // Permite absorver degraus e escadas suavemente

    this.raycaster = new THREE.Raycaster();

    this._initEvents();
  }

  _initEvents() {
    document.body.addEventListener('click', () => {
      if (!this.isOrbitActive) this.pointerControls.lock();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'c' || event.key === 'C') {
        this.isOrbitActive = !this.isOrbitActive;
        
        if (this.isOrbitActive) {
          this.pointerControls.unlock();
          this.savedFPAAPosition.copy(this.camera.position);
          this.savedFPAARotation.copy(this.camera.rotation);
          
          this.orbit.enabled = true;
          this.camera.position.set(0, 80, 180);
          this.orbit.target.set(0, 4, 0); 
          this.orbit.update();
        } else {
          this.orbit.enabled = false;
          this.camera.position.copy(this.savedFPAAPosition);
          this.camera.rotation.copy(this.savedFPAARotation);
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
          case 'ArrowUp': case 'KeyW': this.moveState.forward = false; break;
          case 'ArrowLeft': case 'KeyA': this.moveState.left = false; break;
          case 'ArrowDown': case 'KeyS': this.moveState.backward = false; break;
          case 'ArrowRight': case 'KeyD': this.moveState.right = false; break;
        }
      }
    });
  }

  update() {
    const delta = this.clock.getDelta();
    if (delta > 0.1) return;

    if (this.pointerControls.isLocked && !this.isOrbitActive) {
      // 1. Vetor de Direção de Movimento
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

      // 2. Colisão Horizontal + Efeito de Deslize na Parede
      if (moveVector.lengthSq() > 0) {
        const moveDir = moveVector.clone().normalize();
        const rayOrigin = this.camera.position.clone();
        rayOrigin.y -= (this.playerHeight / 2);

        this.raycaster.set(rayOrigin, moveDir);
        const collisions = this.raycaster.intersectObjects(collidableObjects, false);

        if (collisions.length > 0 && collisions[0].distance < moveVector.length() + this.playerRadius) {
          const hit = collisions[0];
          const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);

          // Projeta o vetor de movimento no plano do obstáculo para deslizar
          const dot = moveVector.dot(normal);
          moveVector.sub(normal.multiplyScalar(dot));
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

      // Subida de degraus/escadas (Efeito rampa)
      if (heightDiff > 0 && heightDiff <= this.stepMaxHeight) {
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetEyeHeight, 15 * delta);
        this.velocity.y = 0;
        this.canJump = true;
      } else {
        // Gravidade e queda interpolada
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