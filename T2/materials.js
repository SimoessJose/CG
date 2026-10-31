import * as THREE from 'three';

/**
 * REQUISITO DE MATERIAIS:
 * "Todos os objetos, exceto as chaves, devem possuir LambertMaterial. 
 * As chaves utilizarão PhongMaterial e terão luzes pontuais ao serem posicionadas 
 * sobre os pedestais. Elas também devem emitir luz (atributo emissive)."
 */

export const materials = {
  // Cenário e Terreno (MeshLambertMaterial)
  ground: new THREE.MeshLambertMaterial({ color: 0x4d8a30 }),           // Grama externa
  islandGrass: new THREE.MeshLambertMaterial({ color: 0x589838 }),      // Grama do castelo e ilha
  path: new THREE.MeshLambertMaterial({ color: 0xb49a70 }),             // Caminho de areia/terra
  water: new THREE.MeshLambertMaterial({ 
    color: 0x2e6b88, 
    transparent: true, 
    opacity: 0.88 
  }),                                                                   // Água do fosso
  
  // Alvenaria do Castelo (MeshLambertMaterial)
  stone: new THREE.MeshLambertMaterial({ color: 0xa59b87 }),            // Pedra padrão das paredes
  stoneDark: new THREE.MeshLambertMaterial({ color: 0x7c7365 }),        // Pedra escura (torres/degraus)
  stoneLight: new THREE.MeshLambertMaterial({ color: 0xbab3a2 }),       // Pedra clara (passadiços)
  stoneTrim: new THREE.MeshLambertMaterial({ color: 0x8e8474 }),         // Detalhes e mísulas
  
  // Madeiras e Telhados (MeshLambertMaterial)
  wood: new THREE.MeshLambertMaterial({ color: 0x54371f }),             // Madeira escura estrutural
  woodPlanks: new THREE.MeshLambertMaterial({ color: 0x704d2e }),       // Pranchas de ponte/porta
  floorWood: new THREE.MeshLambertMaterial({ color: 0x63462b }),        // Piso interno de madeira
  roof: new THREE.MeshLambertMaterial({ color: 0x6b665c }),             // Telhado de ardósia
  
  // Metais (MeshLambertMaterial)
  iron: new THREE.MeshLambertMaterial({ color: 0x2b2d30 }),             // Ferro forjado / ferragens
  brass: new THREE.MeshLambertMaterial({ color: 0xb59132 }),            // Latão da besta e detalhes
  steel: new THREE.MeshLambertMaterial({ color: 0x6e7278 }),            // Lâmina/arco de aço da besta
  arrowTip: new THREE.MeshLambertMaterial({ color: 0x3d4045 }),         // Ponta de ferro do dardo
  fletching: new THREE.MeshLambertMaterial({ color: 0x992222 }),        // Penas traseiras do dardo
  
  // Portal e Escotilha (MeshLambertMaterial)
  portalStone: new THREE.MeshLambertMaterial({ color: 0x625d6b }),      // Pedra do pedestal e base
  hatchMetal: new THREE.MeshLambertMaterial({ color: 0x383a42 }),       // Metal da escotilha circular
  hatchTrim: new THREE.MeshLambertMaterial({ color: 0x8a7a50 }),        // Detalhe dourado da escotilha
  
  // Chaves Mágicas (MeshPhongMaterial com emissive conforme exigido)
  keySphere: new THREE.MeshPhongMaterial({
    color: 0x00e5ff,
    emissive: 0x0088cc,
    emissiveIntensity: 0.85,
    shininess: 90,
    specular: 0xffffff,
    transparent: true,
    opacity: 0.95
  }),

  // Vórtice do Portal aberto
  portalVortex: new THREE.MeshPhongMaterial({
    color: 0x00ffff,
    emissive: 0x0077aa,
    emissiveIntensity: 1.0,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85
  })
};
