const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const livesEl = document.getElementById("lives");
const enemiesEl = document.getElementById("enemies");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");
const overlayEl = document.getElementById("overlay");
const overlayTitleEl = document.getElementById("overlay-title");
const overlayTextEl = document.getElementById("overlay-text");
const restartBtn = document.getElementById("restart-btn");

const DIRECTIONS = ["up", "down", "left", "right"];
const KEY_MAP = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

let tankIdSeed = 0;

function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function randomDirection() {
  return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

class Tank {
  constructor(options) {
    this.id = ++tankIdSeed;
    this.team = options.team;
    this.x = options.x;
    this.y = options.y;
    this.spawnX = options.x;
    this.spawnY = options.y;
    this.width = 32;
    this.height = 32;
    this.direction = options.direction || "up";
    this.speed = options.speed;
    this.color = options.color;
    this.hp = options.hp;
    this.maxBullets = options.maxBullets;
    this.fireCooldown = options.fireCooldown;
    this.cooldownRemaining = 0;
    this.invulnerableTime = 0;
    this.turnTimer = randomRange(0.7, 1.4);
    this.shotTimer = randomRange(0.9, 1.7);
  }

  rect(x = this.x, y = this.y) {
    return { x, y, width: this.width, height: this.height };
  }

  updateTimers(dt) {
    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining = Math.max(0, this.cooldownRemaining - dt);
    }

    if (this.invulnerableTime > 0) {
      this.invulnerableTime = Math.max(0, this.invulnerableTime - dt);
    }
  }

  draw(ctx) {
    if (this.invulnerableTime > 0 && Math.floor(this.invulnerableTime * 14) % 2 === 0) {
      return;
    }

    const trackColor = this.team === "player" ? "#1d7f47" : "#932f2f";
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    ctx.save();

    ctx.fillStyle = trackColor;
    ctx.fillRect(this.x, this.y, 6, this.height);
    ctx.fillRect(this.x + this.width - 6, this.y, 6, this.height);

    ctx.fillStyle = this.color;
    ctx.fillRect(this.x + 6, this.y + 4, this.width - 12, this.height - 8);

    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fillRect(this.x + 9, this.y + 7, this.width - 18, 6);

    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
    ctx.fillStyle = this.team === "player" ? "#d7ffe1" : "#ffe2e2";
    ctx.fill();

    ctx.fillStyle = this.team === "player" ? "#d7ffe1" : "#ffe2e2";
    switch (this.direction) {
      case "up":
        ctx.fillRect(centerX - 2, this.y - 10, 4, 18);
        break;
      case "down":
        ctx.fillRect(centerX - 2, this.y + this.height - 8, 4, 18);
        break;
      case "left":
        ctx.fillRect(this.x - 10, centerY - 2, 18, 4);
        break;
      default:
        ctx.fillRect(this.x + this.width - 8, centerY - 2, 18, 4);
        break;
    }

    ctx.restore();
  }
}

class Bullet {
  constructor(options) {
    this.x = options.x;
    this.y = options.y;
    this.width = 8;
    this.height = 8;
    this.direction = options.direction;
    this.speed = options.speed;
    this.ownerId = options.ownerId;
    this.ownerTeam = options.ownerTeam;
    this.color = options.color;
    this.active = true;
  }

  rect() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  update(dt) {
    const distance = this.speed * dt;

    switch (this.direction) {
      case "up":
        this.y -= distance;
        break;
      case "down":
        this.y += distance;
        break;
      case "left":
        this.x -= distance;
        break;
      default:
        this.x += distance;
        break;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.restore();
  }
}

class Wall {
  constructor(options) {
    this.x = options.x;
    this.y = options.y;
    this.width = options.width;
    this.height = options.height;
    this.type = options.type;
    this.hp = this.type === "brick" ? 1 : Number.POSITIVE_INFINITY;
  }

  rect() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  hit() {
    if (this.type === "brick") {
      this.hp -= 1;
    }
  }

  isDestroyed() {
    return this.hp <= 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.type === "brick" ? "#ba6b34" : "#8b99b8";
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.strokeStyle = this.type === "brick" ? "rgba(83, 34, 12, 0.45)" : "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 2;

    if (this.type === "brick") {
      for (let offsetY = this.y + 10; offsetY < this.y + this.height; offsetY += 10) {
        ctx.beginPath();
        ctx.moveTo(this.x, offsetY);
        ctx.lineTo(this.x + this.width, offsetY);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + this.width, this.y + this.height);
      ctx.moveTo(this.x + this.width, this.y);
      ctx.lineTo(this.x, this.y + this.height);
      ctx.stroke();
    }

    ctx.restore();
  }
}

class Game {
  constructor() {
    this.width = canvas.width;
    this.height = canvas.height;
    this.playerSpawn = { x: 384, y: 520 };
    this.enemySpawns = [
      { x: 72, y: 56 },
      { x: 384, y: 56 },
      { x: 696, y: 56 },
      { x: 696, y: 140 },
    ];
    this.input = { up: false, down: false, left: false, right: false, fire: false };
    this.status = "战斗中";
    this.lastTime = 0;
    this.gameOver = false;

    this.loop = this.loop.bind(this);
    this.bindEvents();
    this.reset();
    window.requestAnimationFrame(this.loop);
  }

  bindEvents() {
    window.addEventListener("keydown", (event) => {
      const mappedKey = KEY_MAP[event.key];

      if (mappedKey) {
        this.input[mappedKey] = true;
        event.preventDefault();
      }

      if (event.code === "Space") {
        this.input.fire = true;
        event.preventDefault();
      }
    });

    window.addEventListener("keyup", (event) => {
      const mappedKey = KEY_MAP[event.key];

      if (mappedKey) {
        this.input[mappedKey] = false;
      }

      if (event.code === "Space") {
        this.input.fire = false;
      }
    });

    window.addEventListener("blur", () => {
      this.clearInput();
    });

    restartBtn.addEventListener("click", () => {
      this.reset();
    });
  }

  clearInput() {
    this.input.up = false;
    this.input.down = false;
    this.input.left = false;
    this.input.right = false;
    this.input.fire = false;
  }

  reset() {
    this.clearInput();
    this.status = "战斗中";
    this.gameOver = false;
    this.lastTime = 0;
    this.score = 0;
    this.walls = this.createWalls();
    this.player = new Tank({
      team: "player",
      x: this.playerSpawn.x,
      y: this.playerSpawn.y,
      direction: "up",
      speed: 180,
      color: "#3ee388",
      hp: 3,
      maxBullets: 2,
      fireCooldown: 0.28,
    });
    this.enemies = this.enemySpawns.map((spawn) =>
      new Tank({
        team: "enemy",
        x: spawn.x,
        y: spawn.y,
        direction: "down",
        speed: 120,
        color: "#ff6b6b",
        hp: 1,
        maxBullets: 1,
        fireCooldown: 0.9,
      }),
    );
    this.bullets = [];
    this.hideOverlay();
    this.updateHud();
  }

  createWalls() {
    const wallData = [
      { x: 120, y: 110, width: 110, height: 38, type: "brick" },
      { x: 350, y: 110, width: 100, height: 38, type: "steel" },
      { x: 570, y: 110, width: 110, height: 38, type: "brick" },
      { x: 70, y: 240, width: 120, height: 42, type: "brick" },
      { x: 255, y: 240, width: 88, height: 42, type: "steel" },
      { x: 458, y: 240, width: 88, height: 42, type: "steel" },
      { x: 610, y: 240, width: 120, height: 42, type: "brick" },
      { x: 170, y: 390, width: 100, height: 38, type: "brick" },
      { x: 350, y: 390, width: 100, height: 38, type: "steel" },
      { x: 530, y: 390, width: 100, height: 38, type: "brick" },
      { x: 28, y: 340, width: 38, height: 130, type: "brick" },
      { x: 734, y: 340, width: 38, height: 130, type: "brick" },
    ];

    return wallData.map((wall) => new Wall(wall));
  }

  loop(timestamp) {
    if (!this.lastTime) {
      this.lastTime = timestamp;
    }

    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (!this.gameOver) {
      this.update(deltaTime);
    }

    this.render();
    window.requestAnimationFrame(this.loop);
  }

  update(dt) {
    this.player.updateTimers(dt);

    for (const enemy of this.enemies) {
      enemy.updateTimers(dt);
    }

    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
    this.walls = this.walls.filter((wall) => !wall.isDestroyed());
    this.resolveGameState();
    this.updateHud();
  }

  updatePlayer(dt) {
    const movement = this.getPlayerMovement();

    if (movement) {
      this.player.direction = movement.direction;
      this.moveTank(this.player, movement.dx * this.player.speed * dt, movement.dy * this.player.speed * dt);
    }

    if (this.input.fire) {
      this.tryShoot(this.player);
    }
  }

  getPlayerMovement() {
    if (this.input.up) {
      return { dx: 0, dy: -1, direction: "up" };
    }

    if (this.input.down) {
      return { dx: 0, dy: 1, direction: "down" };
    }

    if (this.input.left) {
      return { dx: -1, dy: 0, direction: "left" };
    }

    if (this.input.right) {
      return { dx: 1, dy: 0, direction: "right" };
    }

    return null;
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      enemy.turnTimer -= dt;
      enemy.shotTimer -= dt;

      if (enemy.turnTimer <= 0) {
        enemy.direction = randomDirection();
        enemy.turnTimer = randomRange(0.8, 1.6);
      }

      const move = this.directionVector(enemy.direction);
      const moved = this.moveTank(enemy, move.dx * enemy.speed * dt, move.dy * enemy.speed * dt);

      if (!moved) {
        enemy.direction = randomDirection();
        enemy.turnTimer = randomRange(0.4, 1.1);
      }

      if (enemy.shotTimer <= 0) {
        this.tryShoot(enemy);
        enemy.shotTimer = randomRange(0.9, 1.8);
      }
    }
  }

  updateBullets(dt) {
    for (const bullet of this.bullets) {
      bullet.update(dt);

      if (this.isOutOfBounds(bullet.rect())) {
        bullet.active = false;
        continue;
      }

      const hitWall = this.walls.find((wall) => intersects(bullet.rect(), wall.rect()));
      if (hitWall) {
        hitWall.hit();
        bullet.active = false;
        continue;
      }

      if (bullet.ownerTeam === "player") {
        const enemy = this.enemies.find((target) => intersects(bullet.rect(), target.rect()));
        if (enemy) {
          enemy.hp = 0;
          this.score += 100;
          bullet.active = false;
          continue;
        }
      }

      if (bullet.ownerTeam === "enemy" && intersects(bullet.rect(), this.player.rect())) {
        bullet.active = false;
        this.damagePlayer();
      }
    }

    this.bullets = this.bullets.filter((bullet) => bullet.active);
  }

  damagePlayer() {
    if (this.player.invulnerableTime > 0) {
      return;
    }

    this.player.hp -= 1;
    this.player.invulnerableTime = 1.2;
    this.player.x = this.player.spawnX;
    this.player.y = this.player.spawnY;
    this.player.direction = "up";
  }

  resolveGameState() {
    if (this.player.hp <= 0) {
      this.status = "失败";
      this.gameOver = true;
      this.showOverlay("任务失败", `最终得分 ${this.score}。敌军火力太猛了，再试一次。`);
      return;
    }

    if (this.enemies.length === 0) {
      this.status = "胜利";
      this.gameOver = true;
      this.showOverlay("胜利！", `你摧毁了所有敌方坦克，最终得分 ${this.score}。`);
      return;
    }

    this.status = "战斗中";
  }

  tryShoot(tank) {
    if (tank.cooldownRemaining > 0) {
      return;
    }

    const ownedBulletCount = this.bullets.filter((bullet) => bullet.ownerId === tank.id).length;
    if (ownedBulletCount >= tank.maxBullets) {
      return;
    }

    this.bullets.push(this.createBullet(tank));
    tank.cooldownRemaining = tank.fireCooldown;
  }

  createBullet(tank) {
    const bulletSize = 8;
    const centerX = tank.x + tank.width / 2 - bulletSize / 2;
    const centerY = tank.y + tank.height / 2 - bulletSize / 2;
    let x = centerX;
    let y = centerY;

    switch (tank.direction) {
      case "up":
        y = tank.y - bulletSize - 6;
        break;
      case "down":
        y = tank.y + tank.height - 2;
        break;
      case "left":
        x = tank.x - bulletSize - 6;
        break;
      default:
        x = tank.x + tank.width - 2;
        break;
    }

    return new Bullet({
      x,
      y,
      direction: tank.direction,
      speed: 340,
      ownerId: tank.id,
      ownerTeam: tank.team,
      color: tank.team === "player" ? "#f8ff78" : "#ffd4d4",
    });
  }

  directionVector(direction) {
    switch (direction) {
      case "up":
        return { dx: 0, dy: -1 };
      case "down":
        return { dx: 0, dy: 1 };
      case "left":
        return { dx: -1, dy: 0 };
      default:
        return { dx: 1, dy: 0 };
    }
  }

  moveTank(tank, deltaX, deltaY) {
    const nextRect = tank.rect(tank.x + deltaX, tank.y + deltaY);

    if (this.isOutOfBounds(nextRect)) {
      return false;
    }

    for (const wall of this.walls) {
      if (intersects(nextRect, wall.rect())) {
        return false;
      }
    }

    for (const otherTank of [this.player, ...this.enemies]) {
      if (otherTank.id !== tank.id && otherTank.hp > 0 && intersects(nextRect, otherTank.rect())) {
        return false;
      }
    }

    tank.x += deltaX;
    tank.y += deltaY;
    return true;
  }

  isOutOfBounds(rect) {
    return rect.x < 0 || rect.y < 0 || rect.x + rect.width > this.width || rect.y + rect.height > this.height;
  }

  updateHud() {
    livesEl.textContent = Math.max(this.player.hp, 0);
    enemiesEl.textContent = this.enemies.length;
    scoreEl.textContent = this.score;
    statusEl.textContent = this.status;
  }

  showOverlay(title, text) {
    overlayTitleEl.textContent = title;
    overlayTextEl.textContent = text;
    overlayEl.classList.add("visible");
  }

  hideOverlay() {
    overlayEl.classList.remove("visible");
  }

  render() {
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground();

    for (const wall of this.walls) {
      wall.draw(ctx);
    }

    for (const bullet of this.bullets) {
      bullet.draw(ctx);
    }

    this.player.draw(ctx);

    for (const enemy of this.enemies) {
      enemy.draw(ctx);
    }
  }

  drawBackground() {
    ctx.fillStyle = "#0a1020";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    for (let y = 0; y <= this.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(94, 234, 212, 0.06)";
    ctx.fillRect(0, this.height - 78, this.width, 78);
  }
}

new Game();
