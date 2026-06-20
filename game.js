const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SNAKE_LENGTH = 3;
const SCORE_PER_FOOD = 10;
const SPEED_LEVELS = [
  { minScore: 0, interval: 200, level: 1 },
  { minScore: 50, interval: 150, level: 2 },
  { minScore: 100, interval: 100, level: 3 }
];
const STORAGE_KEY = 'snake_high_score';

const DIRECTION_VECTORS = {
  up:    { x: 0, y: -1 },
  down:  { x: 0, y: 1 },
  left:  { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const OPPOSITE_DIRECTION = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left'
};

const KEY_TO_DIRECTION = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right'
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const highScoreEl = document.getElementById('highScore');
const speedLevelEl = document.getElementById('speedLevel');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreEl = document.getElementById('finalScore');
const finalTimeEl = document.getElementById('finalTime');
const newRecordHint = document.getElementById('newRecordHint');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const canvasWrapper = document.querySelector('.canvas-wrapper');

let snake = {
  body: [],
  direction: 'right',
  nextDirection: 'right'
};

let food = { x: 0, y: 0 };
let gameState = {
  score: 0,
  highScore: 0,
  startTime: null,
  isRunning: false,
  isGameOver: false,
  currentSpeed: 200,
  moveTimerId: null,
  renderTimerId: null,
  timerUpdateId: null
};

let foodPulsePhase = 0;

function init() {
  loadHighScore();
  initGame();
  bindEvents();
  render();
}

function loadHighScore() {
  const saved = localStorage.getItem(STORAGE_KEY);
  gameState.highScore = saved ? parseInt(saved, 10) : 0;
  highScoreEl.textContent = gameState.highScore;
}

function saveHighScore() {
  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem(STORAGE_KEY, gameState.highScore.toString());
    highScoreEl.textContent = gameState.highScore;
    return true;
  }
  return false;
}

function initGame() {
  const startX = Math.floor(GRID_SIZE / 2);
  const startY = Math.floor(GRID_SIZE / 2);

  snake.body = [];
  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
    snake.body.push({ x: startX - i, y: startY });
  }

  snake.direction = 'right';
  snake.nextDirection = 'right';

  gameState.score = 0;
  gameState.isRunning = false;
  gameState.isGameOver = false;
  gameState.currentSpeed = SPEED_LEVELS[0].interval;
  gameState.startTime = null;

  scoreEl.textContent = '0';
  timerEl.textContent = '00:00';
  speedLevelEl.textContent = '1';

  generateFood();

  startOverlay.classList.remove('hidden');
  gameOverOverlay.classList.add('hidden');
  newRecordHint.classList.remove('visible');
  canvasWrapper.classList.remove('game-over');

  startBtn.disabled = false;
  restartBtn.disabled = true;
}

function startGame() {
  if (gameState.isRunning) return;

  gameState.isRunning = true;
  gameState.isGameOver = false;
  gameState.startTime = Date.now();

  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');

  startBtn.disabled = true;
  restartBtn.disabled = true;

  gameState.moveTimerId = setInterval(moveSnake, gameState.currentSpeed);
  gameState.renderTimerId = setInterval(render, 16);
  gameState.timerUpdateId = setInterval(updateTimer, 200);
}

function stopTimers() {
  if (gameState.moveTimerId) {
    clearInterval(gameState.moveTimerId);
    gameState.moveTimerId = null;
  }
  if (gameState.renderTimerId) {
    clearInterval(gameState.renderTimerId);
    gameState.renderTimerId = null;
  }
  if (gameState.timerUpdateId) {
    clearInterval(gameState.timerUpdateId);
    gameState.timerUpdateId = null;
  }
}

function updateTimer() {
  if (!gameState.startTime) return;
  const elapsed = Date.now() - gameState.startTime;
  timerEl.textContent = formatDuration(elapsed);
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function moveSnake() {
  snake.direction = snake.nextDirection;

  const head = snake.body[0];
  const vec = DIRECTION_VECTORS[snake.direction];
  const newHead = {
    x: head.x + vec.x,
    y: head.y + vec.y
  };

  if (checkCollision(newHead)) {
    endGame();
    return;
  }

  snake.body.unshift(newHead);

  if (newHead.x === food.x && newHead.y === food.y) {
    gameState.score += SCORE_PER_FOOD;
    scoreEl.textContent = gameState.score;
    updateSpeed();
    generateFood();
  } else {
    snake.body.pop();
  }
}

function checkCollision(head) {
  if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
    return true;
  }

  for (let i = 0; i < snake.body.length; i++) {
    if (snake.body[i].x === head.x && snake.body[i].y === head.y) {
      return true;
    }
  }

  return false;
}

function changeDirection(newDir) {
  if (!DIRECTION_VECTORS[newDir]) return;
  if (OPPOSITE_DIRECTION[snake.direction] === newDir) return;
  if (snake.direction !== newDir) {
    snake.nextDirection = newDir;
  }
}

function updateSpeed() {
  let newSpeed = gameState.currentSpeed;
  let newLevel = 1;

  for (let i = SPEED_LEVELS.length - 1; i >= 0; i--) {
    if (gameState.score >= SPEED_LEVELS[i].minScore) {
      newSpeed = SPEED_LEVELS[i].interval;
      newLevel = SPEED_LEVELS[i].level;
      break;
    }
  }

  if (newSpeed !== gameState.currentSpeed) {
    gameState.currentSpeed = newSpeed;
    speedLevelEl.textContent = newLevel;

    if (gameState.moveTimerId) {
      clearInterval(gameState.moveTimerId);
    }
    gameState.moveTimerId = setInterval(moveSnake, gameState.currentSpeed);
  }
}

function generateFood() {
  const available = [];
  const occupied = new Set(snake.body.map(s => `${s.x},${s.y}`));

  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      if (!occupied.has(`${x},${y}`)) {
        available.push({ x, y });
      }
    }
  }

  if (available.length === 0) {
    endGame();
    return;
  }

  const idx = Math.floor(Math.random() * available.length);
  food = available[idx];
}

function endGame() {
  gameState.isRunning = false;
  gameState.isGameOver = true;

  stopTimers();

  const isNewRecord = saveHighScore();

  const duration = gameState.startTime ? Date.now() - gameState.startTime : 0;

  finalScoreEl.textContent = gameState.score;
  finalTimeEl.textContent = formatDuration(duration);

  if (isNewRecord) {
    newRecordHint.classList.add('visible');
  } else {
    newRecordHint.classList.remove('visible');
  }

  gameOverOverlay.classList.remove('hidden');
  canvasWrapper.classList.add('game-over');

  startBtn.disabled = true;
  restartBtn.disabled = false;
}

function render() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  drawFood();
  drawSnake();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(136, 132, 255, 0.1)';
  ctx.lineWidth = 1;

  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath();
    ctx.setLineDash([2, 3]);
    ctx.moveTo(i * CELL_SIZE, 0);
    ctx.lineTo(i * CELL_SIZE, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * CELL_SIZE);
    ctx.lineTo(canvas.width, i * CELL_SIZE);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawSnake() {
  for (let i = snake.body.length - 1; i >= 0; i--) {
    const segment = snake.body[i];
    const isHead = i === 0;

    const x = segment.x * CELL_SIZE;
    const y = segment.y * CELL_SIZE;

    if (isHead) {
      const gradient = ctx.createRadialGradient(
        x + CELL_SIZE / 2, y + CELL_SIZE / 2, 0,
        x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE
      );
      gradient.addColorStop(0, '#00ffaa');
      gradient.addColorStop(1, '#00cc6a');

      ctx.fillStyle = gradient;
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 15;

      const padding = 1;
      ctx.fillRect(x + padding, y + padding, CELL_SIZE - padding * 2, CELL_SIZE - padding * 2);

      ctx.shadowBlur = 0;

      drawSnakeEyes(x, y);
    } else {
      const alpha = 1 - (i / snake.body.length) * 0.5;
      const gradient = ctx.createRadialGradient(
        x + CELL_SIZE / 2, y + CELL_SIZE / 2, 0,
        x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE
      );
      gradient.addColorStop(0, `rgba(0, 255, 136, ${alpha})`);
      gradient.addColorStop(1, `rgba(0, 150, 80, ${alpha * 0.7})`);

      ctx.fillStyle = gradient;
      const padding = 2;
      ctx.fillRect(x + padding, y + padding, CELL_SIZE - padding * 2, CELL_SIZE - padding * 2);
    }
  }
}

function drawSnakeEyes(x, y) {
  const eyeSize = 3;
  const eyeOffset = 5;

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 3;

  switch (snake.direction) {
    case 'right':
      ctx.fillRect(x + CELL_SIZE - eyeOffset, y + 4, eyeSize, eyeSize);
      ctx.fillRect(x + CELL_SIZE - eyeOffset, y + CELL_SIZE - 7, eyeSize, eyeSize);
      break;
    case 'left':
      ctx.fillRect(x + eyeOffset - 2, y + 4, eyeSize, eyeSize);
      ctx.fillRect(x + eyeOffset - 2, y + CELL_SIZE - 7, eyeSize, eyeSize);
      break;
    case 'down':
      ctx.fillRect(x + 4, y + CELL_SIZE - eyeOffset, eyeSize, eyeSize);
      ctx.fillRect(x + CELL_SIZE - 7, y + CELL_SIZE - eyeOffset, eyeSize, eyeSize);
      break;
    case 'up':
      ctx.fillRect(x + 4, y + eyeOffset - 2, eyeSize, eyeSize);
      ctx.fillRect(x + CELL_SIZE - 7, y + eyeOffset - 2, eyeSize, eyeSize);
      break;
  }

  ctx.shadowBlur = 0;
}

function drawFood() {
  foodPulsePhase += 0.08;
  const pulse = 0.7 + Math.sin(foodPulsePhase) * 0.3;

  const x = food.x * CELL_SIZE + CELL_SIZE / 2;
  const y = food.y * CELL_SIZE + CELL_SIZE / 2;

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, CELL_SIZE * pulse);
  gradient.addColorStop(0, 'rgba(255, 46, 99, 0.8)');
  gradient.addColorStop(0.5, 'rgba(255, 46, 99, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 46, 99, 0)');

  ctx.fillStyle = gradient;
  ctx.shadowColor = '#ff2e63';
  ctx.shadowBlur = 20 * pulse;
  ctx.beginPath();
  ctx.arc(x, y, CELL_SIZE * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff2e63';
  ctx.shadowBlur = 10;
  const foodSize = CELL_SIZE * 0.6;
  ctx.beginPath();
  ctx.arc(x, y, foodSize / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff8fa3';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(x - 2, y - 2, foodSize / 6, 0, Math.PI * 2);
  ctx.fill();
}

function bindEvents() {
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!gameState.isRunning && !gameState.isGameOver) {
        startGame();
      } else if (gameState.isGameOver) {
        initGame();
        startGame();
      }
      return;
    }

    if (!gameState.isRunning) return;

    if (KEY_TO_DIRECTION[e.code]) {
      e.preventDefault();
      changeDirection(KEY_TO_DIRECTION[e.code]);
    }
  });

  startBtn.addEventListener('click', () => {
    if (!gameState.isRunning && !gameState.isGameOver) {
      startGame();
    }
  });

  restartBtn.addEventListener('click', () => {
    initGame();
    startGame();
  });
}

init();
