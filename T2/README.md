# Trabalho 2 (T2) - Computação Gráfica (2026.3)
**Prof. Rodrigo L. S. Silva**  
**First-Person Action-Adventure (FPAA) - Castelo de Bodiam**  
**Pontuação Total: 35 Pontos**

---

## 🎮 Como Executar o Projeto

Em qualquer terminal Linux na raiz do repositório:

```bash
# Iniciar o servidor HTTP local
python3 -m http.server 8080
```

Abra o navegador em:
👉 **[http://localhost:8080/T2/basicScene.html](http://localhost:8080/T2/basicScene.html)**  
*(ou [http://localhost:8080/T2/index.html](http://localhost:8080/T2/index.html))*

---

## ⌨️ Controles e Atalhos de Teclado

| Comando / Tecla | Ação / Funcionalidade | Critério Avaliado |
| :--- | :--- | :--- |
| **Clique na Tela** | Captura a mira do mouse (PointerLock) para controle FPAA | Usabilidade |
| **W, A, S, D** / **Setas** | Movimentação em primeira pessoa com física e deslizamento suave em paredes | Movimentação |
| **Shift** (pressionado) | **Sprint**: aumenta a velocidade da movimentação de forma fluida | **Interação (0,5 pt)** |
| **Espaço** | **Pulo**: impulso com gravidade física e absorção suave de degraus de escada | **Interação (0,5 pt)** |
| **Tecla 'H'** | **Ciclo Dia / Noite**: alterna entre 10h da manhã (Sol) e 18h (Lua / Noite) | **Interação (0,5 pt) & Iluminação (4 pts)** |
| **Tecla 'K'** | **Atalho de Correção**: concede todas as 4 chaves para testar o portal sem matar monstros (pressione novamente para restaurar) | **Interação (0,5 pt)** |
| **Tecla 'C'** | **Câmera**: alterna entre Primeira Pessoa (FPAA) e Câmera Orbital de Inspeção | Câmera |
| **Mouse Botão Esquerdo / Direito** | **Disparo da Besta**: atira dardos balísticos de alta velocidade | **Armas (2 pts)** |
| **Tecla 'E'** / **Aproximação** | Abertura/fechamento das portas do castelo | Cenário |

---

## 🏆 Mapeamento Completo dos Critérios de Avaliação

### 1. Inimigos e Chaves (9 Pontos)
* **Importação de Modelos (5 pontos)**:
  * Modelos 3D importados (`T2/assets/ghost.glb` e `T2/assets/slime.glb`).
  * 4 inimigos no total (2 fantasmas e 2 slimes).
  * Posicionamento estrito:
    * 1 Fantasma posicionado no passadiço caminhável da muralha norte (`y = 18.2`).
    * 1 Slime posicionado dentro da edificação interna oeste (`y = 1.0`).
    * 2 outros inimigos posicionados no pátio interno e ruínas.
  * Cada inimigo possui uma **luz pontual de baixa intensidade facilmente identificável** (violeta para fantasmas, verde esmeralda para slimes).
  * **Turno Noturno**: os inimigos só aparecem e ficam ativos no modo noturno (tecla `H`).
  * Movimentação temática: fantasma flutua suavemente em onda senoidal; slime rasteja com deformação elástica (*squash and stretch*).
* **Chaves (3 pontos)**:
  * Ao serem eliminados, cada monstro solta uma chave mágica esférica com material `MeshPhongMaterial` e emissão de luz (`emissive`).
  * Coletadas por aproximação do jogador (< 3.8 unidades).
  * HUD no topo da tela exibe os slots de orbes mágicos e contador de chaves em tempo real (`X / 4`).
* **Barra de Danos (1 ponto)**:
  * Barra de HP 3D suspensa em *billboard* (sempre voltada para a câmera) acima de cada monstro.
  * Fantasma morre ao receber **3 disparos**.
  * Slime morre ao receber **5 disparos**.
  * Quando o HP chega a zero, o monstro desaparece através de uma **transição suave de opacidade** antes de liberar a chave.

---

### 2. Interior do Castelo (3 Pontos)
* **Pedestais (2 pontos)**:
  * 4 pedestais esculpidos ao redor da escotilha circular no chão do pátio interno.
  * Ao se aproximar de um pedestal vazio portando uma chave, a esfera é posicionada sobre o receptáculo superior do pedestal.
  * As esferas sobre os pedestais utilizam `MeshPhongMaterial` com `emissive` e ativam uma **luz pontual própria** que ilumina o pedestal e o chão.
* **Portal (1 ponto)**:
  * Escotilha circular metálica bipartida no centro do dais de pedra.
  * Quando as 4 chaves são colocadas, a escotilha abre suavemente deslizando para os lados, revelando um **vórtice luminoso giratório**, um **feixe de luz vertical ascendente** e luz mística de alta intensidade.

---

### 3. Interação (2 Pontos)
* **Shift (0,5 ponto)**: Corrida mais rápida com aceleração suave interpolada (*sprint* de 22 para 36 unidades/s).
* **Espaço (0,5 ponto)**: Pulo com física gravitacional, aterrissagem precisa e transição em escadas.
* **Tecla 'K' (0,5 ponto)**: Concede imediatamente as 4 chaves ao jogador para teste do portal ou restaura a quantidade anterior.
* **Tecla 'H' (0,5 ponto)**: Alterna perfeitamente entre o modo Dia (10:00) e Noite (18:00).

---

### 4. Armas (4 Pontos)
* **Besta Medieval (2 pontos)**:
  * Besta com coronha de madeira entalhada, arco curvo de aço temperado, estribo frontal em ferro forjado, canaleta/trilho metálico superior, corda esticada, guarda-mato e gatilho em latão.
  * Acoplada à visão em primeira pessoa com animação física de coice (*recoil*).
* **Dardo (2 pontos)**:
  * Dardo medieval com ponta piramidal de 4 faces em ferro (*bodkin quarrel*), haste torneada em madeira e aletas estabilizadoras vermelhas.
  * **Fica visível sobre a besta antes do disparo**.
  * Cadência calibrada com tempo de recarga visual (1.0 segundo). Após o disparo, o dardo é lançado e um novo dardo reaparece sendo armado na besta durante a recarga.

---

### 5. Ambiente (12 Pontos)
* **Ponte da Parte Externa (2 pontos)**:
  * Acesso externo monumental baseado na referência histórica do Castelo de Bodiam.
  * Tanto o castelo quanto o acesso estão elevados em relação ao plano base de água (água a `y = 0.0`, ilha a `y = 1.8`, ponte a `y = 2.12`).
  * Cores areia (`materials.path`) e verde (`materials.islandGrass`) com alturas em Y propositalmente distintas (`y = 2.12` vs `y = 2.05`) para **eliminar completamente Z-fighting**.
  * Ilha/píer octogonal no fosso com parapeitos de pedra e pilares submersos.
* **Seteiras e Pórtico via CSG (5 pontos)**:
  * **Seteiras**: aberturas estreitas nas muralhas externas esculpidas via operações booleanas `CSG.subtract()` com **parte inferior plana e superior arredondada em arco pleno**.
  * **Pórtico do Portão Principal**: portal de entrada monumental esculpido no bloco central da muralha via CSG em arco pleno.
* **Torres Cilíndricas Acessíveis via CSG (5 pontos)**:
  * As 4 torres cilíndricas de canto têm o interior superior esvaziado via CSG (`innerRadius = 7.6`), mantendo uma mureta de proteção ao redor do topo.
  * Um portal de entrada em arco foi esculpido via CSG conectando diretamente o passadiço da muralha (`y = 17.5`) ao deck superior da torre.
  * O jogador pode caminhar livremente da muralha para dentro de qualquer uma das 4 torres cilíndricas e contemplar o horizonte.

---

### 6. Iluminação e Materiais (9 Pontos)
* **Iluminação Dia e Noite + Chaves (4 pontos)**:
  * **Dia (10h)**: Sol posicionado no quadrante leste a 45°, luz dourada brilhante, céu azul claro, sombras proporcionais (não alongadas).
  * **Noite (18h)**: Lua prateada/azulada fria, céu estrelado escuro, sombras noturnas nítidas.
  * Monstros e fantasmas visíveis e ativos apenas no modo noturno.
  * Chaves nos pedestais e no chão com luzes pontuais ciano ativas.
* **Sombras (3 pontos)**:
  * Luz direcional principal configurada com `castShadow = true` e `PCFSoftShadowMap`.
  * Projeta sombras em todos os elementos do castelo, muros, torres, prédios, pedestais, inimigos e arma.
  * Segunda luz direcional oposta de preenchimento de menor intensidade **sem sombras** para evitar áreas pretas irrealistas e garantir excelente estética e desempenho.
* **Materiais (2 pontos)**:
  * **Todos os objetos do cenário, prédios, muralhas, torres, armas e monstros utilizam estritamente `MeshLambertMaterial`**.
  * **As chaves mágicas utilizam estritamente `MeshPhongMaterial`** com parâmetro `emissive` e brilho especular.

---

## 📁 Estrutura de Arquivos em `T2/`

```text
T2/
├── assets/
│   ├── ghost.glb          # Modelo 3D do Fantasma flutuante
│   └── slime.glb          # Modelo 3D do Monstro Slime rastejante
├── basicScene.html        # Página HTML de execução do jogo
├── basicScene.js          # Módulo principal e loop de renderização
├── cameraControls.js      # Controles FPAA, sprint (Shift), pulo e atalhos (H, K, C)
├── castle.js              # Castelo, Ponte externa, Seteiras e Torres com CSG
├── enemies.js             # 4 Inimigos, barras de vida, opacidade e chaves
├── gameState.js           # Estado global, HUD e notificações
├── index.html             # Ponto de entrada padrão
├── lighting.js            # Sistema Dia (10h) / Noite (18h) e sombras suaves
├── materials.js           # LambertMaterials para cenário e PhongMaterial para chaves
├── portal.js              # Escotilha circular animada, pedestais e efeitos
├── shootingSystem.js      # Balística do dardo, colisão e recarga
├── weapon.js              # Besta medieval detalhada e dardo visível
└── README.md              # Documentação completa do trabalho
```
