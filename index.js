import {
  playSound,
  createAudioContext,
  createExplosionSound,
  createShootSound,
  createPowerUpSound,
  createSpaceAmbience,
} from 'https://lsong.org/scripts/audio.js';

const audioContext = createAudioContext();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const scoreDisplay = document.getElementById('scoreDisplay');

const baseWidth = 400;
const baseHeight = 400;
const ratio = 2;

const canvasWidth = baseWidth * ratio;
const canvasHeight = baseHeight * ratio;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

const playerSize = 20 * ratio;
const enemySize = 15 * ratio;
const projectileSize = 5 * ratio;
const enemyRows = 4;
const enemiesPerRow = 8;

let gameState = 'start';
let score = 0;
let level = 1;
let enemies = [];
let projectiles = [];
let playerPosition = { x: canvasWidth / 2, y: canvasHeight - playerSize };
let stars = [];

function createStars() {
  return Array.from({ length: 100 }, () => ({
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    size: (Math.random() * 2 + 1) * ratio,
    baseSpeed: Math.random() * 0.5 + 0.5
  }));
}

function updateStars() {
  const speedMultiplier = 1 + (level - 1) * 0.1;
  stars.forEach(star => {
    star.y += star.baseSpeed * speedMultiplier * ratio;
    if (star.y > canvasHeight) {
      star.y = 0;
      star.x = Math.random() * canvasWidth;
    }
  });
}

function createEnemyFormation() {
  enemies = [];
  for (let row = 0; row < enemyRows; row++) {
    for (let col = 0; col < enemiesPerRow; col++) {
      enemies.push({
        x: col * (enemySize + 10 * ratio) + 50 * ratio,
        y: row * (enemySize + 10 * ratio) + 50 * ratio,
        row: row,
        col: col,
      });
    }
  }
}

function shootProjectile() {
  projectiles.push({
    x: playerPosition.x + playerSize / 2,
    y: playerPosition.y,
  });
  playSound(audioContext, createShootSound);
}

function updateGame() {
  if (gameState !== 'playing') return;

  updateStars();

  let enemyDirection = 1 * ratio;
  const leftmostEnemy = enemies.reduce((min, enemy) => enemy.x < min.x ? enemy : min);
  const rightmostEnemy = enemies.reduce((max, enemy) => enemy.x > max.x ? enemy : max);

  if (leftmostEnemy.x <= 0 || rightmostEnemy.x >= canvasWidth - enemySize) {
    enemyDirection *= -1;
    enemies.forEach(enemy => enemy.y += 5 * ratio);
  }

  enemies.forEach(enemy => {
    enemy.x += enemyDirection * (0.5 + level * 0.1);
  });

  projectiles = projectiles.filter(projectile => {
    projectile.y -= 5 * ratio;
    return projectile.y > 0;
  });

  enemies = enemies.filter(enemy => {
    const hit = projectiles.some(projectile =>
      Math.abs(enemy.x - projectile.x) < enemySize &&
      Math.abs(enemy.y - projectile.y) < enemySize
    );
    if (hit) {
      score += 10 * level;
      playSound(audioContext, createExplosionSound);
    }
    return !hit;
  });

  if (enemies.length === 0) {
    level++;
    createEnemyFormation();
    playSound(audioContext, createPowerUpSound);
  }

  enemies.forEach(enemy => {
    if (enemy.y + enemySize >= canvasHeight) {
      enemy.y = 0;
      enemy.x = Math.random() * (canvasWidth - enemySize);
    }
  });

  drawGame();
  scoreDisplay.textContent = `Score: ${score} | Level: ${level}`;
  requestAnimationFrame(updateGame);
}

function drawGame() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = '#000033';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = 'white';
  stars.forEach(star => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#00FFFF';
  ctx.beginPath();
  ctx.moveTo(playerPosition.x + playerSize / 2, playerPosition.y);
  ctx.lineTo(playerPosition.x, playerPosition.y + playerSize);
  ctx.lineTo(playerPosition.x + playerSize, playerPosition.y + playerSize);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FF00FF';
  enemies.forEach(enemy => {
    ctx.fillRect(enemy.x, enemy.y, enemySize, enemySize);
  });

  ctx.strokeStyle = '#FFFF00';
  ctx.lineWidth = 2 * ratio;
  projectiles.forEach(projectile => {
    ctx.beginPath();
    ctx.moveTo(projectile.x, projectile.y);
    ctx.lineTo(projectile.x, projectile.y - projectileSize * 2);
    ctx.stroke();
  });
}

async function initializeGame() {
  await audioContext.resume();
  gameState = 'playing';
  score = 0;
  level = 1;
  projectiles = [];
  playerPosition = { x: canvasWidth / 2, y: canvasHeight - playerSize };
  stars = createStars();
  createEnemyFormation();
  startButton.style.display = 'none';
  // playSound(audioContext, createSpaceAmbience);
  const spaceAmbience = createSpaceAmbience(audioContext);
  spaceAmbience.oscillators.forEach(osc => osc.start());
  updateGame();
}

startButton.addEventListener('click', initializeGame);

document.addEventListener('keydown', (e) => {
  if (gameState !== 'playing') return;
  switch (e.key) {
    case 'ArrowLeft':
      playerPosition.x = Math.max(0, playerPosition.x - 10 * ratio);
      break;
    case 'ArrowRight':
      playerPosition.x = Math.min(canvasWidth - playerSize, playerPosition.x + 10 * ratio);
      break;
    case ' ':
      e.preventDefault();
      shootProjectile();
      break;
  }
});

drawGame();