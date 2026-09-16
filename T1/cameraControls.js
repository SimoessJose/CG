import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';

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
    this.direction = new THREE.Vector3();
    this.clock = new THREE.Clock();
    
    this.speed = 20.0;
    this.jumpForce = 15.0; // Força do pulo
    this.gravity = 40.0;   // Peso da gravidade
    this.canJump = true;   // Controle para evitar pulos infinitos no ar
    this.playerHeight = 2.0; // Altura padrão da câmera

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
          this.camera.position.set(38, 30, 38);
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
    
    if (this.pointerControls.isLocked && !this.isOrbitActive) {
      // Zeramos apenas X e Z a cada frame. Y é cumulativo (gravidade).
      this.velocity.x = 0;
      this.velocity.z = 0;
      
      // Aplica a gravidade constantemente puxando para baixo
      this.velocity.y -= this.gravity * delta;
      
      this.direction.z = Number(this.moveState.forward) - Number(this.moveState.backward);
      this.direction.x = Number(this.moveState.right) - Number(this.moveState.left);
      this.direction.normalize();
      
      if (this.moveState.forward || this.moveState.backward) this.velocity.z -= this.direction.z * this.speed * delta;
      if (this.moveState.left || this.moveState.right) this.velocity.x -= this.direction.x * this.speed * delta;
      
      this.pointerControls.moveRight(-this.velocity.x);
      this.pointerControls.moveForward(-this.velocity.z);
      
      // Move a câmera no eixo Y com base na gravidade ou pulo
      this.camera.position.y += this.velocity.y * delta;
      

      // cravamos o chão na altura dos olhos do jogador.
      if (this.camera.position.y < this.playerHeight) {
        this.velocity.y = 0;
        this.camera.position.y = this.playerHeight;
        this.canJump = true; // Libera o pulo novamente ao tocar o chão
      }
    } 
  }
}