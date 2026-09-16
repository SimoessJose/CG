import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';

export class FPAAControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Inicialização do OrbitControls
    this.orbit = new OrbitControls(camera, domElement);
    this.orbit.enabled = false;
    this.orbit.target.set(0, 4, 0);

    // Inicialização do PointerLockControls
    this.pointerControls = new PointerLockControls(camera, document.body);

    // Variáveis de Estado
    this.isOrbitActive = false;
    this.savedFPAAPosition = new THREE.Vector3();
    this.savedFPAARotation = new THREE.Euler();
    
    this.moveState = { forward: false, backward: false, left: false, right: false };
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.clock = new THREE.Clock();
    this.speed = 20.0;

    // Inicia os eventos de escuta
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
      this.velocity.x = 0;
      this.velocity.z = 0;
      
      this.direction.z = Number(this.moveState.forward) - Number(this.moveState.backward);
      this.direction.x = Number(this.moveState.right) - Number(this.moveState.left);
      this.direction.normalize();
      
      if (this.moveState.forward || this.moveState.backward) this.velocity.z -= this.direction.z * this.speed * delta;
      if (this.moveState.left || this.moveState.right) this.velocity.x -= this.direction.x * this.speed * delta;
      
      this.pointerControls.moveRight(-this.velocity.x);
      this.pointerControls.moveForward(-this.velocity.z);
    } 
  }
}