const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.querySelector("#score");
const bestScoreEl = document.querySelector("#bestScore");
const snakeLengthEl = document.querySelector("#snakeLength");
const levelEl = document.querySelector("#level");
const overlay = document.querySelector("#overlay");
const overlayKicker = document.querySelector("#overlayKicker");
const overlayTitle = document.querySelector("#overlayTitle");
const overlayAction = document.querySelector("#overlayAction");
const startBtn = document.querySelector("#startBtn");
const pauseBtn = document.querySelector("#pauseBtn");
const speedRange = document.querySelector("#speedRange");
const speedLabel = document.querySelector("#speedLabel");

const gridSize = 24;
const cellSize = canvas.width / gridSize;
const speedNames = ["悠闲", "轻快", "标准", "迅捷", "极速"];
const tickRates = [170, 140, 112, 88, 68];

let snake;
let food;
let direction;
let queuedDirection;
let score;
let level;
let gameTimer;
let state = "ready";
let bestScore = Number(localStorage.getItem("snake-best-score") || 0);

function resetGame() {
  const center = Math.floor(gridSize / 2);
  snake = [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];
  direction = { x: 1, y: 0 };
  queuedDirection = { ...direction };
  score = 0;
  level = 1;
  food = createFood();
  state = "playing";
  updateStats();
  hideOverlay();
  restartLoop();
  draw();
}

function createFood() {
  let nextFood;

  do {
    nextFood = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize),
    };
  } while (snake.some((part) => part.x === nextFood.x && part.y === nextFood.y));

  return nextFood;
}

function restartLoop() {
  clearInterval(gameTimer);
  gameTimer = setInterval(step, tickRates[Number(speedRange.value) - 1]);
}

function step() {
  direction = queuedDirection;

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  if (hasCollision(head)) {
    endGame();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    level = Math.floor(score / 50) + 1;
    food = createFood();
  } else {
    snake.pop();
  }

  updateStats();
  draw();
}

function hasCollision(head) {
  const hitsWall = head.x < 0 || head.y < 0 || head.x >= gridSize || head.y >= gridSize;
  const hitsSelf = snake.some((part) => part.x === head.x && part.y === head.y);
  return hitsWall || hitsSelf;
}

function endGame() {
  clearInterval(gameTimer);
  state = "ended";

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("snake-best-score", String(bestScore));
  }

  updateStats();
  showOverlay("游戏结束", `最终得分 ${score}`, "再来一局");
}

function pauseGame() {
  if (state === "playing") {
    clearInterval(gameTimer);
    state = "paused";
    pauseBtn.textContent = "继续";
    showOverlay("已暂停", "稍微喘口气", "继续游戏");
    return;
  }

  if (state === "paused") {
    state = "playing";
    pauseBtn.textContent = "暂停";
    hideOverlay();
    restartLoop();
  }
}

function changeDirection(next) {
  if (state !== "playing") return;

  const vectors = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const nextDirection = vectors[next];
  const reversing =
    nextDirection.x + direction.x === 0 && nextDirection.y + direction.y === 0;

  if (!reversing) {
    queuedDirection = nextDirection;
  }
}

function draw() {
  drawBoard();
  drawFood();
  drawSnake();
}

function drawBoard() {
  ctx.fillStyle = "#102018";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < gridSize; i += 1) {
    for (let j = 0; j < gridSize; j += 1) {
      if ((i + j) % 2 === 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.025)";
        ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
      }
    }
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridSize; i += 1) {
    const point = i * cellSize;
    ctx.beginPath();
    ctx.moveTo(point, 0);
    ctx.lineTo(point, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, point);
    ctx.lineTo(canvas.width, point);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((part, index) => {
    const inset = index === 0 ? 2 : 3;
    const x = part.x * cellSize + inset;
    const y = part.y * cellSize + inset;
    const size = cellSize - inset * 2;

    ctx.fillStyle = index === 0 ? "#8af38e" : "#62d46e";
    roundedRect(x, y, size, size, 7);
    ctx.fill();

    if (index === 0) {
      drawEyes(part);
    }
  });
}

function drawEyes(head) {
  const eyeOffset = cellSize * 0.22;
  const centerX = head.x * cellSize + cellSize / 2;
  const centerY = head.y * cellSize + cellSize / 2;
  const perpendicular = { x: -direction.y, y: direction.x };
  const forward = { x: direction.x * eyeOffset, y: direction.y * eyeOffset };

  ctx.fillStyle = "#07110b";
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.arc(
      centerX + perpendicular.x * eyeOffset * side + forward.x,
      centerY + perpendicular.y * eyeOffset * side + forward.y,
      3.5,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });
}

function drawFood() {
  const centerX = food.x * cellSize + cellSize / 2;
  const centerY = food.y * cellSize + cellSize / 2;
  const pulse = 1 + Math.sin(Date.now() / 120) * 0.08;

  ctx.fillStyle = "#ff6b5f";
  ctx.beginPath();
  ctx.arc(centerX, centerY, cellSize * 0.34 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(centerX - 4, centerY - 5, cellSize * 0.09, 0, Math.PI * 2);
  ctx.fill();
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function updateStats() {
  scoreEl.textContent = score;
  bestScoreEl.textContent = bestScore;
  snakeLengthEl.textContent = snake.length;
  levelEl.textContent = level;
  speedLabel.textContent = speedNames[Number(speedRange.value) - 1];
}

function showOverlay(kicker, title, action) {
  overlayKicker.textContent = kicker;
  overlayTitle.textContent = title;
  overlayAction.textContent = action;
  overlay.classList.add("is-visible");
}

function hideOverlay() {
  overlay.classList.remove("is-visible");
  pauseBtn.textContent = "暂停";
}

function handleOverlayAction() {
  if (state === "paused") {
    pauseGame();
  } else {
    resetGame();
  }
}

document.addEventListener("keydown", (event) => {
  const keys = {
    ArrowUp: "up",
    KeyW: "up",
    ArrowDown: "down",
    KeyS: "down",
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
  };

  if (keys[event.code]) {
    event.preventDefault();
    changeDirection(keys[event.code]);
  }

  if (event.code === "Space") {
    event.preventDefault();
    pauseGame();
  }

  if (event.code === "Enter" && state !== "playing") {
    resetGame();
  }
});

document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => changeDirection(button.dataset.direction));
});

startBtn.addEventListener("click", resetGame);
pauseBtn.addEventListener("click", pauseGame);
overlayAction.addEventListener("click", handleOverlayAction);
speedRange.addEventListener("input", () => {
  updateStats();
  if (state === "playing") {
    restartLoop();
  }
});

resetPreview();

function resetPreview() {
  snake = [
    { x: 12, y: 12 },
    { x: 11, y: 12 },
    { x: 10, y: 12 },
  ];
  direction = { x: 1, y: 0 };
  queuedDirection = { ...direction };
  score = 0;
  level = 1;
  food = { x: 16, y: 12 };
  updateStats();
  draw();
}
