const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const messageEl = document.getElementById("message");
const speedButtons = Array.from(document.querySelectorAll(".speed-button"));
const speedLabel = document.getElementById("speed-label");
const levelNameEl = document.getElementById("level-name");
const sidebarCard = document.querySelector(".sidebar-card");

const tileSize = 24;
const levels = [
  {
    name: "Selva Alpes",
    map: [
      "1111111111111111111",
      "1000000001000000001",
      "1011111101011111101",
      "1030000100001000301",
      "1010110101110101101",
      "1000100001000100001",
      "1110101111011101011",
      "1000101000000101001",
      "1011101011110101111",
      "1000001002001000001",
      "1111101011111011111",
      "1000001010001010001",
      "1011111010111011101",
      "1000000000000000001",
      "1011111110111111101",
      "1000000001000000001",
      "1011111101011111101",
      "1000000000000000001",
      "1111111111111111111",
    ],
  },
  {
    name: "Selva Himalayas",
    map: [
      "1111111111111111111",
      "1000000010000000001",
      "1011110101111110101",
      "1030000100000100031",
      "1010111010111011011",
      "1000100001010100001",
      "1110101110011101011",
      "1000101000100101001",
      "1011101010110101111",
      "1000001002001000001",
      "1111101010111011111",
      "1000001010001010001",
      "1011111010111011101",
      "1000000010100000001",
      "1011111110111111101",
      "1000000001000000001",
      "1011111101011111101",
      "1000000000000000001",
      "1111111111111111111",
    ],
  },
];

const ghostPalette = ["#ff9fbc", "#9fe7c4", "#ffd38a"];
const defaultGhostStarts = [
  { x: 9, y: 8, dir: { x: -1, y: 0 } },
  { x: 9, y: 10, dir: { x: 1, y: 0 } },
  { x: 8, y: 9, dir: { x: 0, y: -1 } },
];

let currentLevelIndex = 0;
let currentMap = levels[currentLevelIndex].map;
let rows = currentMap.length;
let cols = currentMap[0].length;
let pacmanStart = { x: 9, y: 9 };
let ghostStarts = defaultGhostStarts;

function resizeCanvas() {
  canvas.width = cols * tileSize;
  canvas.height = rows * tileSize;
}

resizeCanvas();

const directions = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const speedIntervals = [240, 210, 180, 150, 120];
let speedIndex = 2;
let stepInterval = speedIntervals[speedIndex];
let audioContext;

const pellets = new Set();
let powerPellets = new Set();
let pacman;
let ghosts;
let score = 0;
let lives = 3;
let powerTimer = 0;
let gameOver = false;
let win = false;
let lastStep = 0;
let levelAdvanceTimer = null;
let victoryStartTime = null;
let lastVictoryTime = 0;
let confetti = [];

function initLevel() {
  pellets.clear();
  powerPellets = new Set();
  pacmanStart = { x: 9, y: 9 };
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const cell = currentMap[y][x];
      if (cell === "0" || cell === "3") {
        const key = `${x},${y}`;
        pellets.add(key);
        if (cell === "3") {
          powerPellets.add(key);
        }
      }
      if (cell === "2") {
        pacmanStart = { x, y };
      }
    }
  }

  pacman = {
    x: pacmanStart.x,
    y: pacmanStart.y,
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
  };
  ghosts = ghostStarts.map((ghost, index) => ({
    x: ghost.x,
    y: ghost.y,
    dir: { ...ghost.dir },
    color: ghostPalette[index % ghostPalette.length],
  }));
  powerTimer = 0;
  gameOver = false;
  win = false;
  messageEl.classList.remove("show");
}

function loadLevel(index) {
  currentLevelIndex = index;
  currentMap = levels[currentLevelIndex].map;
  rows = currentMap.length;
  cols = currentMap[0].length;
  ghostStarts = levels[currentLevelIndex].ghostStarts || defaultGhostStarts;
  resizeCanvas();
  if (levelNameEl) {
    levelNameEl.textContent = levels[currentLevelIndex].name;
  }
  initLevel();
}

function startVictoryScene() {
  victoryStartTime = null;
  lastVictoryTime = 0;
  confetti = [];
}

function initConfetti() {
  const colors = ["#ffe7b3", "#9be5ff", "#ffb4c8", "#b9ffe6", "#c7ff7c"];
  const count = 140;
  confetti = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    vx: (Math.random() - 0.5) * 0.6,
    vy: 1.2 + Math.random() * 1.8,
    size: 3 + Math.random() * 4,
    rot: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.1,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

function flashSidebar() {
  if (!sidebarCard) return;
  sidebarCard.classList.remove("pulse");
  void sidebarCard.offsetWidth;
  sidebarCard.classList.add("pulse");
}

function playSpeedTone(level) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  if (!audioContext) {
    audioContext = new AudioCtx();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(220 + level * 50, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

function setSpeed(index, options = {}) {
  const nextIndex = Number(index);
  if (Number.isNaN(nextIndex) || speedIntervals[nextIndex] == null) return;
  speedIndex = nextIndex;
  stepInterval = speedIntervals[speedIndex];
  speedButtons.forEach((button, buttonIndex) => {
    const active = buttonIndex === speedIndex;
    button.classList.toggle("active", active);
    button.setAttribute("aria-checked", active ? "true" : "false");
  });
  if (speedLabel) {
    speedLabel.textContent = `Nivel ${speedIndex + 1}`;
  }
  if (!options.silent) {
    flashSidebar();
    playSpeedTone(speedIndex);
  }
  lastStep = 0;
}

if (sidebarCard) {
  sidebarCard.addEventListener("animationend", () => {
    sidebarCard.classList.remove("pulse");
  });
}

function isWall(x, y) {
  if (x < 0 || y < 0 || x >= cols || y >= rows) return true;
  return currentMap[y][x] === "1";
}

function resetPositions() {
  pacman.x = pacmanStart.x;
  pacman.y = pacmanStart.y;
  pacman.dir = { x: 1, y: 0 };
  pacman.nextDir = { x: 1, y: 0 };
  ghosts.forEach((ghost, index) => {
    const start = ghostStarts[index] || ghostStarts[0];
    ghost.x = start.x;
    ghost.y = start.y;
    ghost.dir = { ...start.dir };
  });
}

function tryTurn() {
  const nx = pacman.x + pacman.nextDir.x;
  const ny = pacman.y + pacman.nextDir.y;
  if (!isWall(nx, ny)) {
    pacman.dir = { ...pacman.nextDir };
  }
}

function movePacman() {
  tryTurn();
  const nx = pacman.x + pacman.dir.x;
  const ny = pacman.y + pacman.dir.y;
  if (!isWall(nx, ny)) {
    pacman.x = nx;
    pacman.y = ny;
  }

  const key = `${pacman.x},${pacman.y}`;
  if (pellets.has(key)) {
    pellets.delete(key);
    score += 10;
    if (powerPellets.has(key)) {
      powerPellets.delete(key);
      powerTimer = 120;
      score += 40;
    }
  }

  if (pellets.size === 0) {
    handleLevelClear();
  }
}

function handleLevelClear() {
  if (currentLevelIndex < levels.length - 1) {
    const nextIndex = currentLevelIndex + 1;
    gameOver = true;
    showMessage(`Selva limpa! Proximo campo: ${levels[nextIndex].name}`);
    if (levelAdvanceTimer) {
      clearTimeout(levelAdvanceTimer);
    }
    levelAdvanceTimer = setTimeout(() => {
      loadLevel(nextIndex);
      gameOver = false;
      levelAdvanceTimer = null;
      requestAnimationFrame(update);
    }, 1200);
    return;
  }

  win = true;
  gameOver = true;
  startVictoryScene();
  showMessage("Selva limpa! Domaste a selva gelada.");
}

function availableDirections(entity) {
  const options = [];
  for (const dir of directions) {
    const nx = entity.x + dir.x;
    const ny = entity.y + dir.y;
    if (!isWall(nx, ny)) {
      options.push(dir);
    }
  }
  return options;
}

function pickDirection(entity, frightened) {
  const options = availableDirections(entity);
  if (options.length === 0) return entity.dir;
  if (options.length === 1) return options[0];

  const reverse = { x: -entity.dir.x, y: -entity.dir.y };
  const filtered = options.filter(
    (dir) => dir.x !== reverse.x || dir.y !== reverse.y
  );
  const choices = filtered.length ? filtered : options;

  if (frightened) {
    return choices[Math.floor(Math.random() * choices.length)];
  }

  let best = choices[0];
  let bestScore = Infinity;
  for (const dir of choices) {
    const nx = entity.x + dir.x;
    const ny = entity.y + dir.y;
    const dist = Math.abs(nx - pacman.x) + Math.abs(ny - pacman.y);
    if (dist < bestScore) {
      bestScore = dist;
      best = dir;
    }
  }
  return best;
}

function moveGhosts() {
  for (const ghost of ghosts) {
    ghost.dir = pickDirection(ghost, powerTimer > 0);
    ghost.x += ghost.dir.x;
    ghost.y += ghost.dir.y;
  }
}

function handleCollisions() {
  ghosts.forEach((ghost, index) => {
    if (ghost.x === pacman.x && ghost.y === pacman.y) {
      if (powerTimer > 0) {
        score += 200;
        const start = ghostStarts[index] || ghostStarts[0];
        ghost.x = start.x;
        ghost.y = start.y;
      } else {
        lives -= 1;
        if (lives <= 0) {
          gameOver = true;
          showMessage("A selva apanhou-te");
        } else {
          resetPositions();
        }
      }
    }
  });
}

function showMessage(text) {
  messageEl.textContent = text;
  messageEl.classList.add("show");
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#071911");
  gradient.addColorStop(0.55, "#0f2b1c");
  gradient.addColorStop(1, "#071911");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawWalls() {
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (currentMap[y][x] === "1") {
        const px = x * tileSize;
        const py = y * tileSize;
        ctx.fillStyle = "#0f3b24";
        roundRect(px + 1, py + 1, tileSize - 2, tileSize - 2, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(185, 255, 230, 0.35)";
        ctx.stroke();
      }
    }
  }
}

function drawPellets(time) {
  for (const key of pellets) {
    const [x, y] = key.split(",").map(Number);
    const px = x * tileSize + tileSize / 2;
    const py = y * tileSize + tileSize / 2;
    const isPower = powerPellets.has(key);
    const size = isPower ? 6 : 3;
    const pulse = isPower ? 0.6 + Math.sin(time / 150) * 0.4 : 1;
    ctx.beginPath();
    ctx.shadowColor = isPower
      ? "rgba(155, 229, 255, 0.7)"
      : "rgba(255, 255, 255, 0.4)";
    ctx.shadowBlur = isPower ? 10 : 4;
    ctx.fillStyle = isPower
      ? `rgba(255, 231, 179, ${pulse})`
      : "rgba(185, 255, 230, 0.8)";
    ctx.arc(px, py, size * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawPacman(time) {
  const centerX = pacman.x * tileSize + tileSize / 2;
  const centerY = pacman.y * tileSize + tileSize / 2;
  const mouth = Math.abs(Math.sin(time / 120)) * 0.35 + 0.1;
  const angle = Math.atan2(pacman.dir.y, pacman.dir.x);
  ctx.fillStyle = "#ffe7b3";
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(
    centerX,
    centerY,
    tileSize / 2 - 2,
    angle + mouth,
    angle + Math.PI * 2 - mouth
  );
  ctx.closePath();
  ctx.fill();
}

function drawGhost(ghost) {
  const x = ghost.x * tileSize + tileSize / 2;
  const y = ghost.y * tileSize + tileSize / 2;
  const radius = tileSize / 2 - 2;
  ctx.fillStyle = powerTimer > 0 ? "#2b3b36" : ghost.color;
  ctx.beginPath();
  ctx.arc(x, y - 2, radius, Math.PI, 0);
  ctx.lineTo(x + radius, y + radius - 2);
  ctx.lineTo(x - radius, y + radius - 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fef9ed";
  ctx.beginPath();
  ctx.arc(x - 5, y - 2, 3, 0, Math.PI * 2);
  ctx.arc(x + 5, y - 2, 3, 0, Math.PI * 2);
  ctx.fill();
}

function update(time) {
  if (gameOver) {
    draw(time);
    if (win) {
      requestAnimationFrame(update);
    }
    return;
  }

  if (time - lastStep > stepInterval) {
    movePacman();
    moveGhosts();
    handleCollisions();
    if (powerTimer > 0) powerTimer -= 1;
    lastStep = time;
  }

  scoreEl.textContent = score;
  livesEl.textContent = lives;

  draw(time);
  requestAnimationFrame(update);
}

function draw(time) {
  if (win) {
    drawVictoryScene(time);
    return;
  }
  drawBackground();
  drawWalls();
  drawPellets(time);
  drawPacman(time);
  for (const ghost of ghosts) {
    drawGhost(ghost);
  }
}

function drawVictoryScene(time) {
  drawBackground();

  if (victoryStartTime === null) {
    victoryStartTime = time;
    lastVictoryTime = time;
  }
  if (confetti.length === 0) {
    initConfetti();
  }

  const dt = Math.min(time - lastVictoryTime, 40);
  lastVictoryTime = time;
  confetti.forEach((piece) => {
    piece.x += piece.vx * dt;
    piece.y += piece.vy * dt;
    piece.rot += piece.spin * dt;
    if (piece.y > canvas.height + 30) {
      piece.y = -30;
      piece.x = Math.random() * canvas.width;
    }
    if (piece.x < -30) piece.x = canvas.width + 30;
    if (piece.x > canvas.width + 30) piece.x = -30;
  });

  ctx.save();
  confetti.forEach((piece) => {
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.rot);
    ctx.fillStyle = piece.color;
    ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 1.4);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  });
  ctx.restore();

  const centerX = canvas.width / 2;
  const baseY = canvas.height * 0.78;
  const podiumWidth = canvas.width * 0.7;
  const podiumHeight = canvas.height * 0.22;
  const stepWidth = podiumWidth * 0.58;
  const stepHeight = podiumHeight * 0.75;
  const pulse = 0.85 + Math.sin(time / 420) * 0.15;

  ctx.save();
  ctx.fillStyle = "rgba(255, 231, 179, 0.18)";
  ctx.beginPath();
  ctx.ellipse(centerX, baseY + 22, podiumWidth * 0.72, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#123423";
  roundRect(
    centerX - podiumWidth / 2,
    baseY - podiumHeight / 2,
    podiumWidth,
    podiumHeight,
    16
  );
  ctx.fill();

  ctx.fillStyle = "#1a4b32";
  roundRect(
    centerX - stepWidth / 2,
    baseY - podiumHeight / 2 - stepHeight + 4,
    stepWidth,
    stepHeight,
    16
  );
  ctx.fill();

  ctx.fillStyle = `rgba(255, 231, 179, ${0.5 + pulse * 0.4})`;
  ctx.font = "bold 44px 'Trebuchet MS', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("1", centerX, baseY - podiumHeight / 2 - stepHeight / 2 + 4);
  ctx.restore();

  drawTrophy(centerX + podiumWidth * 0.3, baseY - podiumHeight * 0.78, time);
  drawPacmanChampion(centerX - podiumWidth * 0.1, baseY - podiumHeight * 0.75, time);
}

function drawTrophy(x, y, time) {
  ctx.save();
  const glow = 0.5 + Math.sin(time / 260) * 0.35;
  const glowRadius = 40 + Math.sin(time / 180) * 6;
  const gradient = ctx.createRadialGradient(x, y + 10, 4, x, y + 10, glowRadius);
  gradient.addColorStop(0, `rgba(255, 231, 179, ${0.45 * glow})`);
  gradient.addColorStop(1, "rgba(255, 231, 179, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y + 10, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffd38a";
  ctx.strokeStyle = "rgba(255, 231, 179, 0.5)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x - 18, y);
  ctx.lineTo(x + 18, y);
  ctx.lineTo(x + 12, y + 26);
  ctx.lineTo(x - 12, y + 26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x - 20, y + 10, 8, Math.PI * 0.2, Math.PI * 1.8);
  ctx.arc(x + 20, y + 10, 8, Math.PI * 1.2, Math.PI * 2.8);
  ctx.stroke();

  ctx.fillStyle = "#c38b3a";
  roundRect(x - 6, y + 26, 12, 12, 4);
  ctx.fill();
  roundRect(x - 14, y + 38, 28, 8, 4);
  ctx.fill();
  ctx.restore();
}

function drawPacmanChampion(x, y, time) {
  const mouth = Math.abs(Math.sin(time / 120)) * 0.35 + 0.1;
  const radius = 24;
  const bob = Math.sin(time / 260) * 4;
  ctx.save();
  ctx.fillStyle = "#ffe7b3";
  ctx.beginPath();
  ctx.moveTo(x, y + bob);
  ctx.arc(x, y + bob, radius, mouth, Math.PI * 2 - mouth);
  ctx.closePath();
  ctx.fill();

  const coneX = x + radius + 14;
  const coneY = y + 10 + bob;
  ctx.fillStyle = "#c38b3a";
  ctx.beginPath();
  ctx.moveTo(coneX, coneY);
  ctx.lineTo(coneX + 12, coneY + 24);
  ctx.lineTo(coneX - 12, coneY + 24);
  ctx.closePath();
  ctx.fill();

  const scoopY = coneY - 4;
  ctx.fillStyle = "#9be5ff";
  ctx.beginPath();
  ctx.arc(coneX, scoopY, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  const bite = 4 + Math.abs(Math.sin(time / 180)) * 3;
  ctx.beginPath();
  ctx.arc(coneX + 6, scoopY - 2, bite, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function restart() {
  if (levelAdvanceTimer) {
    clearTimeout(levelAdvanceTimer);
    levelAdvanceTimer = null;
  }
  score = 0;
  lives = 3;
  win = false;
  gameOver = false;
  loadLevel(0);
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  requestAnimationFrame(update);
}

speedButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setSpeed(button.dataset.speed);
  });
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
    pacman.nextDir = { x: 0, y: -1 };
  }
  if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
    pacman.nextDir = { x: 0, y: 1 };
  }
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    pacman.nextDir = { x: -1, y: 0 };
  }
  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    pacman.nextDir = { x: 1, y: 0 };
  }
  if (event.key === "r" || event.key === "R") {
    restart();
  }
});

loadLevel(0);
setSpeed(speedIndex, { silent: true });
requestAnimationFrame(update);
