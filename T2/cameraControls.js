import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { collidableObjects, gameState, showNotification, updateKeysHUD } from './gameState.js';
import { toggleDayNight } from './lighting.js';

export class FPAAControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Câmera Orbital (Modo de Inspeção livre com a tecla C)
    this.orbit = new OrbitControls(camera, domElement);
    this.orbit.enabled = false;
    this.orbit.target.set(0, 4, 0);

    // Câmera em Primeira Pessoa (FPAA) com travamento do ponteiro
    this.pointerControls = new PointerLockControls(camera, document.body);

    this.isOrbitActive = false;
    this.savedFPAAPosition = new THREE.Vector3();
    this.savedFPAARotation = new THREE.Euler();

    // Estado dos controles de movimento
    this.moveState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false   // ITEM: Shift para andar mais rápido
    };

    this.velocity = new THREE.Vector3();
    this.clock = new THREE.Clock();

    // Parâmetros Físicos e de Movimentação calibrados para alta jogabilidade
    this.walkSpeed = 22.0;          // Velocidade normal de caminhada
    this.sprintSpeed = 36.0;        // Velocidade com Shift (Sprint fluido)
    this.currentSpeed = 22.0;
    this.jumpForce = 13.0;          // Força de pulo equilibrada
    this.gravity = 35.0;            // Aceleração da gravidade
    this.canJump = true;
    this.playerHeight = 2.0;        // Altura dos olhos do jogador
    this.playerRadius = 0.8;        // Raio do cilindro de colisão
    this.stepMaxHeight = 0.8;       // Absorção suave de degraus de escada

    this.weaponMesh = null;
    this.raycaster = new THREE.Raycaster();

    this._initEvents();
  }

  setWeapon(weaponMesh) {
    this.weaponMesh = weaponMesh;
  }

  _initEvents() {
    // Clique na tela para capturar a mira do mouse
    document.body.addEventListener('click', () => {
      if (!this.isOrbitActive) {
        this.pointerControls.lock();
      }
    });

    // Manipulação de teclas pressionadas (keydown)
    document.addEventListener('keydown', (event) => {
      // 1. Tecla 'C': Alternar Câmera (Primeira Pessoa / Orbital)
      if (event.code === 'KeyC') {
        this.toggleCameraMode();
        return;
      }

      // 2. Tecla 'H': Alternar Modo Dia e Noite
      // "● Tecla 'H' - Habilitará/Desabilitará os efeitos de dia e noite"
      if (event.code === 'KeyH') {
        toggleDayNight();
        return;
      }

      // 3. Tecla 'K': Atalho de Teste/Correção para Obter Todas as Chaves
      // "● Tecla 'K' - Para facilitar a correção deste trabalho, mapeie esta tecla para que
      // todas as chaves sejam atribuídas ao usuário para testar o portal sem a necessidade
      // de achar/eliminar os fantasmas. Pressionando novamente volta ao estado anterior."
      if (event.code === 'KeyK') {
        this.toggleAllKeysCheat();
        return;
      }

      // 4. Movimentação do Jogador em Primeira Pessoa
      if (!this.isOrbitActive) {
        switch (event.code) {
          case 'ArrowUp':
          case 'KeyW':
            this.moveState.forward = true;
            break;
          case 'ArrowLeft':
          case 'KeyA':
            this.moveState.left = true;
            break;
          case 'ArrowDown':
          case 'KeyS':
            this.moveState.backward = true;
            break;
          case 'ArrowRight':
          case 'KeyD':
            this.moveState.right = true;
            break;
          case 'ShiftLeft':
          case 'ShiftRight':
            // "● Pressionar shift para aumentar a velocidade da movimentação"
            this.moveState.sprint = true;
            break;
          case 'Space':
            // "● Pressionar espaço para pular"
            if (this.canJump) {
              this.velocity.y = this.jumpForce;
              this.canJump = false;
            }
            break;
        }
      }
    });

    // Tecla liberada (keyup)
    document.addEventListener('keyup', (event) => {
      if (!this.isOrbitActive) {
        switch (event.code) {
          case 'ArrowUp':
          case 'KeyW':
            this.moveState.forward = false;
            break;
          case 'ArrowLeft':
          case 'KeyA':
            this.moveState.left = false;
            break;
          case 'ArrowDown':
          case 'KeyS':
            this.moveState.backward = false;
            break;
          case 'ArrowRight':
          case 'KeyD':
            this.moveState.right = false;
            break;
          case 'ShiftLeft':
          case 'ShiftRight':
            this.moveState.sprint = false;
            break;
        }
      }
    });
  }

  /**
   * Alterna modo entre Câmera FPAA e Câmera Orbital de Inspeção
   */
  toggleCameraMode() {
    this.isOrbitActive = !this.isOrbitActive;
    const crosshair = document.getElementById('crosshair');

    if (this.isOrbitActive) {
      this.pointerControls.unlock();
      this.savedFPAAPosition.copy(this.camera.position);
      this.savedFPAARotation.copy(this.camera.rotation);

      if (crosshair) crosshair.style.display = 'none';
      if (this.weaponMesh) this.weaponMesh.visible = false;

      this.orbit.enabled = true;
      this.camera.position.set(0, 90, 190);
      this.orbit.target.set(0, 4, 0);
      this.orbit.update();
      showNotification('Modo Câmera Orbital ativado (Pressione C para retornar ao jogo)');
    } else {
      this.orbit.enabled = false;
      this.camera.position.copy(this.savedFPAAPosition);
      this.camera.rotation.copy(this.savedFPAARotation);

      if (crosshair) crosshair.style.display = 'block';
      if (this.weaponMesh) this.weaponMesh.visible = true;

      this.pointerControls.lock();
    }
  }

  /**
   * Atalho de correção da prova ('K'): concede todas as chaves ou restaura anteriores
   */
  toggleAllKeysCheat() {
    if (gameState.playerKeys < 4) {
      // Salva a quantidade anterior e concede as 4 chaves
      gameState.savedKeys = gameState.playerKeys;
      gameState.playerKeys = 4;
      updateKeysHUD();
      showNotification('🔑 Atalho [K]: 4 Chaves Mágicas concedidas! Aproxime-se dos pedestais para abrir o portal.');
    } else {
      // Restaura o estado de chaves anterior
      gameState.playerKeys = gameState.savedKeys || 0;
      updateKeysHUD();
      showNotification(`🔑 Atalho [K]: Chaves restauradas para ${gameState.playerKeys}.`);
    }
  }

  /**
   * Loop físico principal de movimentação, colisão com deslize, pulo e gravidade
   */
  update() {
    const delta = this.clock.getDelta();
    if (delta > 0.1) return;

    if (this.pointerControls.isLocked && !this.isOrbitActive) {
      // 1. Transição de velocidade suave para sprint
      const targetSpeed = this.moveState.sprint ? this.sprintSpeed : this.walkSpeed;
      this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, targetSpeed, 12 * delta);

      // 2. Vetor de Direção de Movimento
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
        moveVector.normalize().multiplyScalar(this.currentSpeed * delta);
      }

      // 3. Colisão Horizontal com Paredes + Efeito Suave de Deslize (Wall Sliding)
      if (moveVector.lengthSq() > 0) {
        const rayOrigin = this.camera.position.clone();
        rayOrigin.y -= 0.7; // Altura da cintura

        const moveDir = moveVector.clone().normalize();
        this.raycaster.set(rayOrigin, moveDir);
        const collisions = this.raycaster.intersectObjects(collidableObjects, false);

        if (collisions.length > 0 && collisions[0].distance < moveVector.length() + this.playerRadius) {
          const hit = collisions[0];
          const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
          normal.y = 0;
          normal.normalize();

          // Desliza tangencialmente pela superfície do obstáculo
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

      // 4. Colisão Vertical com Chão, Degraus de Escada e Gravidade
      const downRayOrigin = this.camera.position.clone();
      this.raycaster.set(downRayOrigin, new THREE.Vector3(0, -1, 0));

      const groundHits = this.raycaster.intersectObjects(collidableObjects, false);
      let groundY = 0;

      if (groundHits.length > 0) {
        groundY = groundHits[0].point.y;
      }

      const targetEyeHeight = groundY + this.playerHeight;
      const heightDiff = targetEyeHeight - this.camera.position.y;

      // Fase aérea / pulo ativo
      if (!this.canJump || this.velocity.y > 0) {
        this.velocity.y -= this.gravity * delta;
        this.camera.position.y += this.velocity.y * delta;

        // Aterrissagem no chão ou patamar elevado
        if (this.camera.position.y <= targetEyeHeight) {
          this.camera.position.y = targetEyeHeight;
          this.velocity.y = 0;
          this.canJump = true;
        }
      } else if (heightDiff > 0 && heightDiff <= this.stepMaxHeight) {
        // Subida suave de degraus de escada (efeito rampa de absorção)
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetEyeHeight, 18 * delta);
        this.velocity.y = 0;
        this.canJump = true;
      } else if (heightDiff < 0 && heightDiff >= -this.stepMaxHeight) {
        // Descida suave de degraus de escada
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetEyeHeight, 18 * delta);
        this.velocity.y = 0;
        this.canJump = true;
      } else {
        // Queda suave com gravidade ao saltar de plataformas ou muros
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
