import * as THREE from 'three';

// Listas globais compartilhadas entre os sistemas do jogo
export const collidableObjects = [];
export const doorPivots = [];
export const activeEnemies = [];
export const droppedKeys = [];
export const pedestals = [];

// Estado central do jogo
export const gameState = {
  isDayMode: true,          // true = Dia (10h, Sol), false = Noite (18h, Lua)
  playerKeys: 0,            // Quantidade de chaves carregadas pelo jogador (0 a 4)
  savedKeys: 0,             // Backup para o atalho de teste 'K'
  portalOpen: false,        // Se o portal secreto foi aberto
  portalProgress: 0.0,      // Progresso de abertura do portal (0 a 1)
  placedKeysCount: 0,       // Chaves já posicionadas nos pedestais
};

// Funções utilitárias de notificação HUD (Toasts)
let toastTimeout = null;
export function showNotification(message, duration = 3500) {
  const toast = document.getElementById('toast-notification');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
  }, duration);
}

// Atualização da interface de chaves (HUD)
export function updateKeysHUD() {
  const keyCounter = document.getElementById('key-counter');
  const keyIcons = document.querySelectorAll('.key-slot');
  if (keyCounter) {
    keyCounter.textContent = `${gameState.playerKeys} / 4`;
  }
  if (keyIcons) {
    keyIcons.forEach((slot, index) => {
      // Se o slot estiver dentro das chaves que o jogador possui
      if (index < gameState.playerKeys) {
        slot.classList.add('active');
      } else {
        slot.classList.remove('active');
      }
    });
  }
}
