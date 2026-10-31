import * as THREE from 'three';
import { gameState, showNotification } from './gameState.js';

let mainLight = null;
let fillLight = null;
let ambientLight = null;
let sceneRef = null;

// Parâmetros de iluminação calculados para 10h (Sol) e 18h (Lua)
const DAY_CONFIG = {
  skyColor: 0x87ceeb,
  mainColor: 0xfffaed,
  mainIntensity: 1.35,
  mainPos: new THREE.Vector3(120, 170, 100),   // Sol às 10h da manhã (sombras não muito alongadas)
  fillColor: 0x8ba2b8,
  fillIntensity: 0.35,
  fillPos: new THREE.Vector3(-100, 70, -80),   // Luz oposta de menor intensidade (sem sombra)
  ambientColor: 0x5a6a7c,
  ambientIntensity: 0.35
};

const NIGHT_CONFIG = {
  skyColor: 0x0a0f1d,
  mainColor: 0x769cd6,
  mainIntensity: 0.75,
  mainPos: new THREE.Vector3(-110, 160, -110), // Luz da Lua às 18h (sombras nítidas de noite)
  fillColor: 0x22324f,
  fillIntensity: 0.22,
  fillPos: new THREE.Vector3(90, 50, 90),      // Luz de preenchimento noturna
  ambientColor: 0x182035,
  ambientIntensity: 0.28
};

/**
 * Inicializa o sistema de iluminação com sombras balanceadas (qualidade vs desempenho)
 */
export function initLighting(scene) {
  sceneRef = scene;

  // Luz ambiente suave de suporte
  ambientLight = new THREE.AmbientLight(DAY_CONFIG.ambientColor, DAY_CONFIG.ambientIntensity);
  scene.add(ambientLight);

  // Luz direcional principal com projeção de sombras
  mainLight = new THREE.DirectionalLight(DAY_CONFIG.mainColor, DAY_CONFIG.mainIntensity);
  mainLight.position.copy(DAY_CONFIG.mainPos);
  mainLight.castShadow = true;

  // Configuração rigorosa de sombras (qualidade vs desempenho - PCFSoftShadowMap)
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 10;
  mainLight.shadow.camera.far = 460;
  
  // Frustum ortográfico ajustado precisamente para envolver todo o castelo e acessos
  const d = 175;
  mainLight.shadow.camera.left = -d;
  mainLight.shadow.camera.right = d;
  mainLight.shadow.camera.top = d;
  mainLight.shadow.camera.bottom = -d;

  // Bias para evitar artefatos de "shadow acne" e "peter panning"
  mainLight.shadow.bias = -0.0005;
  mainLight.shadow.normalBias = 0.035;

  scene.add(mainLight);

  // Segunda luz direcional oposta de menor intensidade SEM sombras (apenas preenchimento)
  fillLight = new THREE.DirectionalLight(DAY_CONFIG.fillColor, DAY_CONFIG.fillIntensity);
  fillLight.position.copy(DAY_CONFIG.fillPos);
  fillLight.castShadow = false; // "não projetará sombras. Só servirá para melhorar a iluminação"
  scene.add(fillLight);

  // Define o estado inicial (Dia)
  applyLightingMode(gameState.isDayMode);
}

/**
 * Aplica o modo de iluminação Dia ou Noite
 */
export function applyLightingMode(isDay) {
  gameState.isDayMode = isDay;
  const cfg = isDay ? DAY_CONFIG : NIGHT_CONFIG;

  if (sceneRef) {
    sceneRef.background = new THREE.Color(cfg.skyColor);
  }

  if (mainLight) {
    mainLight.color.setHex(cfg.mainColor);
    mainLight.intensity = cfg.mainIntensity;
    mainLight.position.copy(cfg.mainPos);
  }

  if (fillLight) {
    fillLight.color.setHex(cfg.fillColor);
    fillLight.intensity = cfg.fillIntensity;
    fillLight.position.copy(cfg.fillPos);
  }

  if (ambientLight) {
    ambientLight.color.setHex(cfg.ambientColor);
    ambientLight.intensity = cfg.ambientIntensity;
  }

  // Notifica o sistema de inimigos sobre a visibilidade no turno noturno
  const enemiesModule = window._enemiesSystem;
  if (enemiesModule && enemiesModule.setEnemiesActive) {
    enemiesModule.setEnemiesActive(!isDay);
  }
}

/**
 * Alterna entre Dia e Noite via atalho de teclado ('H')
 */
export function toggleDayNight() {
  const nextMode = !gameState.isDayMode;
  applyLightingMode(nextMode);

  if (nextMode) {
    showNotification('☀️ Modo DIA ativado (10:00 - Luz solar | Fantasmas recolhidos)');
  } else {
    showNotification('🌙 Modo NOITE ativado (18:00 - Luz lunar | Monstros e Fantasmas visíveis!)');
  }
}
