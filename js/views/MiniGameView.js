/**
 * @file MiniGameView.js
 * @description Six HTML5 Canvas/DOM mini-games with mouse/touch + keyboard support.
 * Rarity scaling: Common=1 chapter, Mid=2, Rare=3, Mythic=4 (each chapter = one mini-game).
 * Games: dino_runner, green_zone_timing, puzzle_unlock, rhythm_catcher, mash_clash, lockpick_dial
 *
 * Each mini-game now receives mission context:
 * - missionTitle: story-specific headline referencing character's lore & player's choice
 * - objectiveHint: 1-sentence explanation of what success/failure does to the mission
 * - characterImg: character's portrait for the header banner
 * - winConsequence / loseConsequence: specific plot outcomes injected into next chapter
 */

export class MiniGameView {
  constructor() {
    this.$ = s => document.querySelector(s);
    this.arena = this.$('#minigameArena');
    this.canvas = this.$('#minigameCanvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.titleEl = this.$('#minigameTitle');
    this.badgeEl = this.$('#minigameBadge');
    this.scoreEl = this.$('#minigameScore');
    this.timerEl = this.$('#minigameTimer');
    this.hintEl = this.$('#minigameHint');
    this.missionTitleEl = this.$('#minigameMissionTitle');
    this.objectiveHintEl = this.$('#minigameObjectiveHint');
    this.missionAvatarEl = this.$('#minigameMissionAvatar');
    this.startBtn = this.$('#minigameStart');
    this.skipBtn = this.$('#minigameSkip');

    this.currentGame = null;
    this.gameInstance = null;
    this.onComplete = null;
    this.onSkip = null;

    this._bindUI();
  }

  _bindUI() {
    if (this.startBtn) {
      this.startBtn.onclick = () => this._startCurrentGame();
    }
    if (this.skipBtn) {
      this.skipBtn.onclick = () => this._handleSkip();
    }
  }

  // Public API: start a mini-game by key with mission context
  start(gameKey, opts = {}) {
    this.currentGame = gameKey;
    this.onComplete = opts.onComplete || (() => {});
    this.onSkip = opts.onSkip || (() => {});

    const meta = GAME_META[gameKey] || GAME_META.dino_runner;
    const missionTitle = opts.missionTitle || meta.title;
    const objectiveHint = opts.objectiveHint || meta.hint;
    const characterImg = opts.characterImg || null;
    this._missionWinConsequence = opts.winConsequence || '';
    this._missionLoseConsequence = opts.loseConsequence || '';

    if (this.arena) this.arena.hidden = false;
    if (this.badgeEl) this.badgeEl.textContent = `🎯 ${meta.label}`;
    if (this.titleEl) this.titleEl.textContent = missionTitle;
    if (this.hintEl) this.hintEl.textContent = meta.controls;
    if (this.scoreEl) this.scoreEl.textContent = 'Score: 0';
    if (this.timerEl) this.timerEl.textContent = 'Time: 0s';

    // Render mission context banner
    this._renderMissionBanner(missionTitle, objectiveHint, characterImg);

    // Ensure canvas is sized for CSS pixels
    this._resizeCanvas();
    window.addEventListener('resize', this._resizeCanvas.bind(this));

    // Show start screen (game hasn't begun yet)
    this._showStartScreen(meta);
  }

  _renderMissionBanner(missionTitle, objectiveHint, characterImg) {
    if (this.missionTitleEl) {
      this.missionTitleEl.textContent = missionTitle;
    }
    if (this.objectiveHintEl) {
      this.objectiveHintEl.textContent = objectiveHint;
    }
    if (this.missionAvatarEl && characterImg) {
      this.missionAvatarEl.innerHTML = `
        <img src="${characterImg}" alt="" referrerpolicy="no-referrer"
             style="width:100%;height:100%;object-fit:cover;object-position:center 15%;border-radius:inherit;">
      `;
      this.missionAvatarEl.hidden = false;
    } else if (this.missionAvatarEl) {
      this.missionAvatarEl.hidden = true;
    }
  }

  _showStartScreen(meta) {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.ctx.clearRect(0, 0, w, h);
    // Background
    this.ctx.fillStyle = 'rgba(18,18,28,0.95)';
    this.ctx.fillRect(0, 0, w, h);
    // Title
    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 28px Quicksand, Be Vietnam Pro, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.titleEl?.textContent || meta.title, w / 2, h * 0.22);
    // Objective hint
    this.ctx.fillStyle = '#4ade80';
    this.ctx.font = '15px Be Vietnam Pro, sans-serif';
    this.ctx.fillText(this.objectiveHintEl?.textContent || meta.hint, w / 2, h * 0.32);
    // Controls hint
    this.ctx.fillStyle = '#888';
    this.ctx.font = '14px Be Vietnam Pro, sans-serif';
    this.ctx.fillText(meta.controls, w / 2, h * 0.45);
    // Start prompt
    this.ctx.fillStyle = '#4ade80';
    this.ctx.font = 'bold 20px Quicksand, Be Vietnam Pro, sans-serif';
    this.ctx.fillText('Press ▶ Start or [Space] to begin', w / 2, h * 0.65);

    // Listen for Space to start
    this._startKeyHandler = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        this._startCurrentGame();
      }
    };
    window.addEventListener('keydown', this._startKeyHandler, { once: true });
  }

  _resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  _showStartScreen(meta) {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.ctx.clearRect(0, 0, w, h);
    // Background
    this.ctx.fillStyle = 'rgba(18,18,28,0.95)';
    this.ctx.fillRect(0, 0, w, h);
    // Title
    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 28px Quicksand, Be Vietnam Pro, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(meta.title, w / 2, h * 0.28);
    // Description
    this.ctx.fillStyle = '#ccc';
    this.ctx.font = '16px Be Vietnam Pro, sans-serif';
    this.ctx.fillText(meta.desc, w / 2, h * 0.38);
    // Controls hint
    this.ctx.fillStyle = '#888';
    this.ctx.font = '14px Be Vietnam Pro, sans-serif';
    this.ctx.fillText(meta.controls, w / 2, h * 0.52);
    // Start prompt
    this.ctx.fillStyle = '#4ade80';
    this.ctx.font = 'bold 20px Quicksand, Be Vietnam Pro, sans-serif';
    this.ctx.fillText('Press ▶ Start or [Space] to begin', w / 2, h * 0.7);

    // Listen for Space to start
    this._startKeyHandler = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        this._startCurrentGame();
      }
    };
    window.addEventListener('keydown', this._startKeyHandler, { once: true });
  }

  _startCurrentGame() {
    if (this._startKeyHandler) {
      window.removeEventListener('keydown', this._startKeyHandler);
      this._startKeyHandler = null;
    }
    if (this.startBtn) this.startBtn.hidden = true;
    if (this.skipBtn) this.skipBtn.hidden = false;

    const Ctor = GAME_CLASSES[this.currentGame] || DinoRunner;
    this.gameInstance = new Ctor(this.canvas, this.ctx, {
      onScore: (s) => { if (this.scoreEl) this.scoreEl.textContent = 'Score: ' + s; },
      onTime: (t) => { if (this.timerEl) this.timerEl.textContent = 'Time: ' + t + 's'; },
      onEnd: (result) => this._handleGameEnd(result)
    });
    this.gameInstance.start();
  }

  _handleGameEnd(result) {
    // result: { success: boolean, score: number, perfect: boolean }
    this._cleanup();
    if (this.arena) this.arena.hidden = true;
    this.onComplete(result);
  }

  _handleSkip() {
    this._cleanup();
    if (this.arena) this.arena.hidden = true;
    this.onSkip({ skipped: true });
  }

  _cleanup() {
    if (this._startKeyHandler) {
      window.removeEventListener('keydown', this._startKeyHandler);
      this._startKeyHandler = null;
    }
    if (this.gameInstance && typeof this.gameInstance.destroy === 'function') {
      this.gameInstance.destroy();
      this.gameInstance = null;
    }
    window.removeEventListener('resize', this._resizeCanvas.bind(this));
    if (this.startBtn) this.startBtn.hidden = false;
    if (this.skipBtn) this.skipBtn.hidden = true;
  }
}

/* ========================================================================
 * BASE MINI-GAME CLASS
 * ========================================================================*/
class BaseMiniGame {
  constructor(canvas, ctx, callbacks) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.running = false;
    this.score = 0;
    this.time = 0;
    this.startTime = 0;
    this.animId = null;
    this._boundLoop = this._loop.bind(this);
    this._boundResize = this._resize.bind(this);
    this._boundKeyDown = this._onKeyDown.bind(this);
    this._boundKeyUp = this._onKeyUp.bind(this);
    this._boundTouch = this._onTouch.bind(this);
    this._boundMouse = this._onMouse.bind(this);
    this.keys = new Set();
    this.touchActive = false;
  }

  start() {
    this.running = true;
    this.score = 0;
    this.time = 0;
    this.startTime = performance.now();
    this._init();
    window.addEventListener('resize', this._boundResize);
    window.addEventListener('keydown', this._boundKeyDown);
    window.addEventListener('keyup', this._boundKeyUp);
    this.canvas.addEventListener('touchstart', this._boundTouch, { passive: false });
    this.canvas.addEventListener('touchend', this._boundTouch, { passive: false });
    this.canvas.addEventListener('mousedown', this._boundMouse);
    this.canvas.addEventListener('mouseup', this._boundMouse);
    this.animId = requestAnimationFrame(this._boundLoop);
  }

  destroy() {
    this.running = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this._boundResize);
    window.removeEventListener('keydown', this._boundKeyDown);
    window.removeEventListener('keyup', this._boundKeyUp);
    this.canvas.removeEventListener('touchstart', this._boundTouch);
    this.canvas.removeEventListener('touchend', this._boundTouch);
    this.canvas.removeEventListener('mousedown', this._boundMouse);
    this.canvas.removeEventListener('mouseup', this._boundMouse);
  }

  _init() {}
  _update(dt) {}
  _draw() {}
  _onKeyDown(e) { this.keys.add(e.code); if (e.code === 'Space') e.preventDefault(); }
  _onKeyUp(e) { this.keys.delete(e.code); }
  _onTouch(e) {
    e.preventDefault();
    this.touchActive = e.type === 'touchstart';
  }
  _onMouse(e) {
    this.touchActive = e.type === 'mousedown';
  }
  _resize() {}
  _loop(now) {
    if (!this.running) return;
    const dt = (now - (this.lastNow || now)) / 1000;
    this.lastNow = now;
    this.time = (now - this.startTime) / 1000;
    if (this.callbacks.onTime) this.callbacks.onTime(Math.floor(this.time));
    this._update(dt);
    this._draw();
    this.animId = requestAnimationFrame(this._boundLoop);
  }

  _end(success, perfect = false) {
    this.running = false;
    if (this.callbacks.onEnd) {
      this.callbacks.onEnd({ success, score: this.score, perfect });
    }
  }
}

/* ========================================================================
 * 1. DINO RUNNER — Endless runner, jump over obstacles
 * ========================================================================*/
class DinoRunner extends BaseMiniGame {
  _init() {
    this.dino = { x: 60, y: 0, vy: 0, h: 44, w: 30, onGround: true };
    this.obstacles = [];
    this.spawnTimer = 0;
    this.speed = 280;
    this.groundY = this.canvas.clientHeight - 40;
    this.dino.y = this.groundY - this.dino.h;
    this.bgOffset = 0;
  }

  _update(dt) {
    if (!this.running) return;
    this.bgOffset = (this.bgOffset + this.speed * dt * 0.3) % 100;

    // Dino physics
    const gravity = 900;
    const jumpForce = -420;
    if (this.keys.has('Space') || this.keys.has('ArrowUp') || this.keys.has('KeyW') || this.touchActive) {
      if (this.dino.onGround) {
        this.dino.vy = jumpForce;
        this.dino.onGround = false;
      }
    }
    this.dino.vy += gravity * dt;
    this.dino.y += this.dino.vy * dt;
    if (this.dino.y >= this.groundY - this.dino.h) {
      this.dino.y = this.groundY - this.dino.h;
      this.dino.vy = 0;
      this.dino.onGround = true;
    }

    // Spawn obstacles
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const h = 30 + Math.random() * 30;
      this.obstacles.push({ x: this.canvas.clientWidth + 20, y: this.groundY - h, w: 20, h, passed: false });
      this.spawnTimer = 1.0 + Math.random() * 1.2;
    }

    // Move obstacles
    for (const obs of this.obstacles) {
      obs.x -= this.speed * dt;
      if (!obs.passed && obs.x + obs.w < this.dino.x) {
        obs.passed = true;
        this.score++;
        if (this.callbacks.onScore) this.callbacks.onScore(this.score);
      }
    }
    this.obstacles = this.obstacles.filter(o => o.x + o.w > -50);

    // Collision
    for (const obs of this.obstacles) {
      if (this._aabb(this.dino, obs)) {
        this._end(false);
        return;
      }
    }

    // Speed up over time
    this.speed += dt * 12;

    // Win condition: survive 20s (Common), 30s (Mid), 40s (Rare), 50s (Mythic)
    const winTime = 20; // base; scaled externally via opts
    if (this.time >= winTime) {
      this._end(true, this.time >= winTime + 10);
    }
  }

  _draw() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#0f0f1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 30; i++) {
      const x = (i * 37 + this.bgOffset * 0.5) % w;
      const y = (i * 13) % (h * 0.6);
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(0, this.groundY, w, h - this.groundY);
    ctx.fillStyle = '#3a3a4e';
    ctx.fillRect(0, this.groundY, w, 4);

    // Obstacles
    ctx.fillStyle = '#e04040';
    for (const obs of this.obstacles) {
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      // spike tip
      ctx.beginPath();
      ctx.moveTo(obs.x, obs.y);
      ctx.lineTo(obs.x + obs.w / 2, obs.y - 8);
      ctx.lineTo(obs.x + obs.w, obs.y);
      ctx.fillStyle = '#ff6060';
      ctx.fill();
    }

    // Dino
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(this.dino.x, this.dino.y, this.dino.w, this.dino.h);
    // Eye
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(this.dino.x + 20, this.dino.y + 8, 6, 6);
    // Leg animation
    const legPhase = Math.floor(performance.now() / 120) % 2;
    ctx.fillStyle = '#3ac870';
    ctx.fillRect(this.dino.x + 6, this.dino.y + this.dino.h - 8, 6, 8);
    ctx.fillRect(this.dino.x + 18, this.dino.y + this.dino.h - (legPhase ? 8 : 12), 6, legPhase ? 8 : 12);

    // Score
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px Quicksand, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + this.score, 16, 36);
  }

  _aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
}

/* ========================================================================
 * 2. GREEN ZONE TIMING — Press when needle hits the green zone
 * ========================================================================*/
class GreenZoneTiming extends BaseMiniGame {
  _init() {
    this.needleAngle = -Math.PI / 2;
    this.needleSpeed = Math.PI * 1.5;
    this.greenZone = { start: -0.4, end: 0.4 }; // radians around center
    this.targetAngle = 0;
    this.round = 0;
    this.maxRounds = 5;
    this.successCount = 0;
    this.waiting = false;
    this.cooldown = 0;
  }

  _update(dt) {
    if (!this.running) return;
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      return;
    }
    this.needleAngle += this.needleSpeed * dt;
    if (this.needleAngle > Math.PI * 1.5) this.needleAngle = -Math.PI / 2;

    const pressed = this.keys.has('Space') || this.touchActive;
    if (pressed && !this.waiting) {
      this.waiting = true;
      // Check if in green zone
      const diff = Math.abs(this.needleAngle - this.targetAngle);
      const inZone = diff < 0.35;
      if (inZone) {
        this.successCount++;
        this.score += 100;
        if (this.callbacks.onScore) this.callbacks.onScore(this.score);
      }
      this.round++;
      this.cooldown = 0.8;
      this.needleSpeed += 0.3; // speed up each round

      if (this.round >= this.maxRounds) {
        const perfect = this.successCount === this.maxRounds;
        this._end(this.successCount >= 3, perfect);
      }
    }
    if (!pressed) this.waiting = false;
  }

  _draw() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const cx = w / 2;
    const cy = h * 0.55;
    const r = Math.min(w, h) * 0.35;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Circle track
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#2a2a4a';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();

    // Green zone
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(cx, cy, r, this.targetAngle + this.greenZone.start, this.targetAngle + this.greenZone.end);
    ctx.stroke();

    // Needle
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.needleAngle);
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(0, -r - 8);
    ctx.lineTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // UI
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GREEN ZONE', cx, 50);
    ctx.font = '18px Be Vietnam Pro, sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`Round ${this.round + 1} / ${this.maxRounds}`, cx, 80);
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 22px Quicksand, sans-serif';
    ctx.fillText(`Hits: ${this.successCount} / ${this.maxRounds}`, cx, h - 40);
    ctx.fillStyle = '#888';
    ctx.font = '14px Be Vietnam Pro, sans-serif';
    ctx.fillText('Press [Space] / Tap when needle hits GREEN', cx, h - 16);
  }
}

/* ========================================================================
 * 3. PUZZLE UNLOCK — Slide puzzle (3x3) to form the image
 * ========================================================================*/
class PuzzleUnlock extends BaseMiniGame {
  _init() {
    this.gridSize = 3;
    this.tileSize = 0;
    this.tiles = [];
    this.emptyIndex = 8;
    this.solved = false;
    this.moves = 0;
    this.startTime = performance.now();
  }

  _resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.tileSize = Math.min(w, h * 0.7) / this.gridSize;
    this._shuffle();
  }

  _shuffle() {
    this.tiles = [...Array(9).keys()];
    // Fisher-Yates shuffle ensuring solvable parity
    do {
      for (let i = this.tiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
      }
      this.emptyIndex = this.tiles.indexOf(8);
    } while (!this._isSolvable());
    this.solved = false;
    this.moves = 0;
  }

  _isSolvable() {
    let inv = 0;
    for (let i = 0; i < 9; i++) {
      for (let j = i + 1; j < 9; j++) {
        if (this.tiles[i] !== 8 && this.tiles[j] !== 8 && this.tiles[i] > this.tiles[j]) inv++;
      }
    }
    const row = Math.floor(this.emptyIndex / 3);
    return (inv + row) % 2 === 0;
  }

  _update(dt) {
    if (this.solved) return;
  }

  _draw() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    const ts = this.tileSize;
    const offsetX = (w - ts * 3) / 2;
    const offsetY = (h * 0.7 - ts * 3) / 2 + 40;

    // Draw a "target" reference image (simple pattern)
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(ts / 100, ts / 100);
    // Reference pattern
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const idx = y * 3 + x;
        if (idx === 8) continue;
        const hue = (idx * 40) % 360;
        ctx.fillStyle = `hsl(${hue}, 60%, 50%)`;
        ctx.fillRect(x * 100, y * 100, 100, 100);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(idx + 1, x * 100 + 50, y * 100 + 50);
      }
    }
    ctx.restore();

    // Draw current tiles
    for (let i = 0; i < 9; i++) {
      const val = this.tiles[i];
      if (val === 8) continue; // empty
      const srcX = (val % 3) * ts;
      const srcY = Math.floor(val / 3) * ts;
      const dstX = offsetX + (i % 3) * ts;
      const dstY = offsetY + Math.floor(i / 3) * ts;

      // Tile background
      const hue = (val * 40) % 360;
      ctx.fillStyle = `hsl(${hue}, 60%, 50%)`;
      ctx.fillRect(dstX, dstY, ts - 4, ts - 4);
      // Number
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px Quicksand, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(val + 1, dstX + ts / 2, dstY + ts / 2);
    }

    // UI
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PUZZLE UNLOCK', w / 2, 40);
    ctx.font = '18px Be Vietnam Pro, sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`Moves: ${this.moves}`, w / 2, 70);
    ctx.fillStyle = '#888';
    ctx.font = '14px Be Vietnam Pro, sans-serif';
    ctx.fillText('Click/Tap a tile next to the empty space to slide. Arrows also work.', w / 2, h - 16);

    if (this._checkSolved()) {
      this.solved = true;
      const perfect = this.moves <= 20;
      this._end(true, perfect);
    }
  }

  _checkSolved() {
    for (let i = 0; i < 9; i++) {
      if (this.tiles[i] !== i) return false;
    }
    return true;
  }

  _onKeyDown(e) {
    super._onKeyDown(e);
    if (this.solved) return;
    let moved = false;
    const dirs = {
      ArrowUp: { dx: 0, dy: -1 },
      ArrowDown: { dx: 0, dy: 1 },
      ArrowLeft: { dx: -1, dy: 0 },
      ArrowRight: { dx: 1, dy: 0 },
      KeyW: { dx: 0, dy: -1 },
      KeyS: { dx: 0, dy: 1 },
      KeyA: { dx: -1, dy: 0 },
      KeyD: { dx: 1, dy: 0 }
    };
    const d = dirs[e.code];
    if (d) {
      const ex = this.emptyIndex % 3;
      const ey = Math.floor(this.emptyIndex / 3);
      const tx = ex + d.dx;
      const ty = ey + d.dy;
      if (tx >= 0 && tx < 3 && ty >= 0 && ty < 3) {
        const ti = ty * 3 + tx;
        [this.tiles[this.emptyIndex], this.tiles[ti]] = [this.tiles[ti], this.tiles[this.emptyIndex]];
        this.emptyIndex = ti;
        this.moves++;
        moved = true;
      }
    }
    if (moved && this.callbacks.onScore) this.callbacks.onScore(this.moves);
  }

  _onTouch(e) {
    e.preventDefault();
    if (this.solved) return;
    const rect = this.canvas.getBoundingClientRect();
    const ts = this.tileSize;
    const offsetX = (rect.width - ts * 3) / 2;
    const offsetY = (rect.height * 0.7 - ts * 3) / 2 + 40;
    const x = e.touches[0] ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = e.touches[0] ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    const gx = Math.floor((x - offsetX) / ts);
    const gy = Math.floor((y - offsetY) / ts);
    if (gx >= 0 && gx < 3 && gy >= 0 && gy < 3) {
      const ti = gy * 3 + gx;
      const ex = this.emptyIndex % 3;
      const ey = Math.floor(this.emptyIndex / 3);
      if (Math.abs(gx - ex) + Math.abs(gy - ey) === 1) {
        [this.tiles[this.emptyIndex], this.tiles[ti]] = [this.tiles[ti], this.tiles[this.emptyIndex]];
        this.emptyIndex = ti;
        this.moves++;
        if (this.callbacks.onScore) this.callbacks.onScore(this.moves);
      }
    }
  }

  _onMouse(e) {
    this._onTouch(e);
  }
}

/* ========================================================================
 * 4. RHYTHM CATCHER — Falling notes, press key when they hit the line
 * ========================================================================*/
class RhythmCatcher extends BaseMiniGame {
  _init() {
    this.lanes = 4;
    this.keys = ['KeyD', 'KeyF', 'KeyJ', 'KeyK']; // D F J K
    this.notes = [];
    this.spawnTimer = 0;
    this.noteSpeed = 300;
    this.hitLineY = this.canvas.clientHeight * 0.75;
    this.hits = 0;
    this.misses = 0;
    this.maxNotes = 20;
    this.spawned = 0;
    this.judgement = '';
    this.judgementTimer = 0;
  }

  _update(dt) {
    if (!this.running) return;

    if (this.judgementTimer > 0) this.judgementTimer -= dt;

    // Spawn notes
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.spawned < this.maxNotes) {
      const lane = Math.floor(Math.random() * this.lanes);
      this.notes.push({ lane, y: -50, hit: false, missed: false });
      this.spawned++;
      this.spawnTimer = 0.6 + Math.random() * 0.5;
    }

    // Update notes
    for (const note of this.notes) {
      if (note.hit || note.missed) continue;
      note.y += this.noteSpeed * dt;

      // Check miss
      if (note.y > this.hitLineY + 40) {
        note.missed = true;
        this.misses++;
        this.judgement = 'MISS';
        this.judgementTimer = 0.5;
      }
    }

    // Check key presses
    for (let i = 0; i < this.lanes; i++) {
      if (this.keys.has(this.keys[i])) {
        // Find closest note in this lane
        for (const note of this.notes) {
          if (note.lane === i && !note.hit && !note.missed) {
            const dist = Math.abs(note.y - this.hitLineY);
            if (dist < 35) {
              note.hit = true;
              this.hits++;
              this.score += Math.max(50, 100 - Math.floor(dist * 2));
              if (this.callbacks.onScore) this.callbacks.onScore(this.score);
              this.judgement = dist < 15 ? 'PERFECT' : 'GOOD';
              this.judgementTimer = 0.3;
            }
            break; // Only hit one note per press
          }
        }
      }
    }

    this.notes = this.notes.filter(n => !(n.hit || n.missed) || n.y < this.hitLineY + 60);

    if (this.spawned >= this.maxNotes && this.notes.length === 0) {
      const perfect = this.misses === 0;
      this._end(this.hits >= this.maxNotes * 0.6, perfect);
    }
  }

  _draw() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, w, h);

    const laneW = w / this.lanes;

    // Lanes
    for (let i = 0; i < this.lanes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#1a1a3a' : '#14142a';
      ctx.fillRect(i * laneW, 0, laneW, h);
      // Divider
      ctx.strokeStyle = '#2a2a4a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(i * laneW, 0);
      ctx.lineTo(i * laneW, h);
      ctx.stroke();
    }

    // Hit line
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(0, this.hitLineY);
    ctx.lineTo(w, this.hitLineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Key hints
    ctx.fillStyle = '#444';
    ctx.font = 'bold 16px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < this.lanes; i++) {
      const keyLabel = this.keys[i].replace('Key', '');
      ctx.fillText(keyLabel, i * laneW + laneW / 2, h - 12);
    }

    // Notes
    for (const note of this.notes) {
      if (note.hit || note.missed) continue;
      const x = note.lane * laneW + laneW / 2;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(x, note.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0d0d1a';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.keys[note.lane].replace('Key', ''), x, note.y);
    }

    // Judgement text
    if (this.judgementTimer > 0) {
      ctx.fillStyle = this.judgement === 'PERFECT' ? '#4ade80' : this.judgement === 'GOOD' ? '#ffd700' : '#f87171';
      ctx.font = 'bold 36px Quicksand, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.judgement, w / 2, this.hitLineY - 50);
    }

    // UI
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RHYTHM CATCHER', w / 2, 40);
    ctx.font = '18px Be Vietnam Pro, sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`Hits: ${this.hits} / ${this.maxNotes}  Misses: ${this.misses}`, w / 2, 70);
    ctx.fillStyle = '#888';
    ctx.font = '14px Be Vietnam Pro, sans-serif';
    ctx.fillText('Press D F J K when notes hit the green line', w / 2, h - 40);
  }
}

/* ========================================================================
 * 5. MASH CLASH — Rapid tap/key mash to fill the bar
 * ========================================================================*/
class MashClash extends BaseMiniGame {
  _init() {
    this.targetTaps = 60; // base taps needed
    this.taps = 0;
    this.maxTime = 8; // seconds
    this.lastPress = 0;
    this.combo = 0;
  }

  _update(dt) {
    if (!this.running) return;
    this.time = (performance.now() - this.startTime) / 1000;
    if (this.callbacks.onTime) this.callbacks.onTime(Math.floor(this.time));

    if (this.time >= this.maxTime) {
      const success = this.taps >= this.targetTaps;
      const perfect = this.taps >= this.targetTaps * 1.5;
      this._end(success, perfect);
    }
  }

  _draw() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    const progress = Math.min(1, this.taps / this.targetTaps);
    const barW = w * 0.7;
    const barH = 36;
    const barX = (w - barW) / 2;
    const barY = h * 0.5;

    // Bar background
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(barX, barY, barW, barH);
    // Progress
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, '#f43f5e');
    grad.addColorStop(0.5, '#fbbf24');
    grad.addColorStop(1, '#4ade80');
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW * progress, barH);

    // Target marker
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(barX + barW, barY - 6);
    ctx.lineTo(barX + barW, barY + barH + 6);
    ctx.stroke();
    ctx.setLineDash([]);

    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MASH CLASH', w / 2, 60);
    ctx.font = '24px Be Vietnam Pro, sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`${this.taps} / ${this.targetTaps} TAPS`, w / 2, barY - 16);
    ctx.font = 'bold 20px Quicksand, sans-serif';
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`${Math.ceil(this.maxTime - this.time)}s`, w / 2, barY + barH + 36);
    ctx.fillStyle = '#888';
    ctx.font = '14px Be Vietnam Pro, sans-serif';
    ctx.fillText('Mash [Space] / Tap as fast as you can!', w / 2, h - 20);

    // Particles on tap
    if (this.lastPress && performance.now() - this.lastPress < 100) {
      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 10 + Math.random() * 20;
        const px = w / 2 + Math.cos(angle) * dist;
        const py = barY + barH / 2 + Math.sin(angle) * dist;
        ctx.fillStyle = `hsl(${Math.random() * 60 + 30}, 100%, 60%)`;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _onKeyDown(e) {
    super._onKeyDown(e);
    if (e.code === 'Space' && this.running) {
      this.taps++;
      this.lastPress = performance.now();
      if (this.callbacks.onScore) this.callbacks.onScore(this.taps);
    }
  }

  _onTouch(e) {
    e.preventDefault();
    if (e.type === 'touchstart' && this.running) {
      this.taps++;
      this.lastPress = performance.now();
      if (this.callbacks.onScore) this.callbacks.onScore(this.taps);
    }
  }

  _onMouse(e) {
    if (e.type === 'mousedown' && this.running) {
      this.taps++;
      this.lastPress = performance.now();
      if (this.callbacks.onScore) this.callbacks.onScore(this.taps);
    }
  }
}

/* ========================================================================
 * 6. LOCKPICK DIAL — Rotate dial to find the sweet spot (click when aligned)
 * ========================================================================*/
class LockpickDial extends BaseMiniGame {
  _init() {
    this.dialAngle = 0;
    this.targetAngle = (Math.random() - 0.5) * Math.PI * 0.5; // -45° to 45°
    this.tension = 0;
    this.maxTension = 100;
    this.pickAngle = 0;
    this.turning = false;
    this.unlocked = false;
    this.attempts = 0;
    this.maxAttempts = 3;
  }

  _update(dt) {
    if (this.unlocked) return;

    // Auto-rotate dial slowly
    this.dialAngle += 0.8 * dt;
    if (this.dialAngle > Math.PI) this.dialAngle = -Math.PI;

    // Tension decay
    if (this.tension > 0) this.tension -= 5 * dt;

    // Check unlock
    if (this.tension >= this.maxTension) {
      this.unlocked = true;
      this._end(true, this.attempts === 1);
    }
  }

  _draw() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const cx = w / 2;
    const cy = h * 0.5;
    const r = 100;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, w, h);

    // Lock body
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx, cy + 20, r + 20, 0, Math.PI * 2);
    ctx.fill();

    // Dial
    ctx.save();
    ctx.translate(cx, cy + 20);
    ctx.rotate(this.dialAngle);

    // Dial markings
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.strokeStyle = i % 3 === 0 ? '#4ade80' : '#3a3a5a';
      ctx.lineWidth = i % 3 === 0 ? 3 : 1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (r - 10), Math.sin(a) * (r - 10));
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }

    // Dial center
    ctx.fillStyle = '#2a2a4a';
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Tension bar
    const barW = 240;
    const barH = 16;
    const barX = (w - barW) / 2;
    const barY = cy + r + 50;
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(barX, barY, barW, barH);
    const tProg = Math.min(1, this.tension / this.maxTension);
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, '#f43f5e');
    grad.addColorStop(0.5, '#fbbf24');
    grad.addColorStop(1, '#4ade80');
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW * tProg, barH);

    // Pick indicator (mouse/touch rotates pick)
    ctx.save();
    ctx.translate(cx, cy + 20);
    ctx.rotate(this.pickAngle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -r - 10);
    ctx.lineTo(0, -r - 40);
    ctx.stroke();
    // Pick handle
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(0, -r - 40, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Sweet spot marker (hidden - player must feel it)
    // Visual hint: subtle glow at top when near sweet spot
    const diff = Math.abs(this.dialAngle - this.targetAngle);
    if (diff < 0.15) {
      const glow = 1 - diff / 0.15;
      ctx.save();
      ctx.translate(cx, cy + 20);
      ctx.rotate(this.targetAngle);
      ctx.strokeStyle = `rgba(74, 222, 128, ${glow * 0.6})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -r - 5, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // UI
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOCKPICK DIAL', w / 2, 40);
    ctx.font = '18px Be Vietnam Pro, sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`Attempt ${this.attempts + 1} / ${this.maxAttempts}`, w / 2, 70);
    ctx.fillStyle = '#888';
    ctx.font = '14px Be Vietnam Pro, sans-serif';
    ctx.fillText('Rotate dial (←/→ or drag). Press [Space]/Click when aligned.', w / 2, h - 20);
  }

  _onKeyDown(e) {
    super._onKeyDown(e);
    if (!this.running || this.unlocked) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.pickAngle -= 0.12;
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.pickAngle += 0.12;
    } else if (e.code === 'Space') {
      this._tryUnlock();
    }
  }

  _onTouch(e) {
    e.preventDefault();
    if (!this.running || this.unlocked) return;
    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height * 0.5 + 20;
    const x = e.touches[0] ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = e.touches[0] ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    this.pickAngle = Math.atan2(y - cy, x - cx) - Math.PI / 2;

    if (e.type === 'touchend' || e.type === 'click') {
      this._tryUnlock();
    }
  }

  _onMouse(e) {
    if (!this.running || this.unlocked) return;
    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height * 0.5 + 20;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (e.type === 'mousedown' || e.type === 'mousemove') {
      this.pickAngle = Math.atan2(y - cy, x - cx) - Math.PI / 2;
    }
    if (e.type === 'mouseup') {
      this._tryUnlock();
    }
  }

  _tryUnlock() {
    const diff = Math.abs(this.pickAngle - this.targetAngle);
    if (diff < 0.15) {
      // Success - add tension
      this.tension += 30 + (0.15 - diff) * 200;
      this.attempts = 0; // reset attempts on success
    } else {
      this.attempts++;
      this.tension = Math.max(0, this.tension - 20);
      if (this.attempts >= this.maxAttempts) {
        this._end(false);
      }
    }
    // New target
    this.targetAngle = (Math.random() - 0.5) * Math.PI * 0.5;
  }
}

/* ========================================================================
 * REGISTRY
 * ========================================================================*/
const GAME_CLASSES = {
  dino_runner: DinoRunner,
  green_zone_timing: GreenZoneTiming,
  puzzle_unlock: PuzzleUnlock,
  rhythm_catcher: RhythmCatcher,
  mash_clash: MashClash,
  lockpick_dial: LockpickDial
};

const GAME_META = {
  dino_runner: {
    label: 'Dino Runner',
    title: '🦖 DINO RUNNER',
    desc: 'Jump over obstacles and survive the timeline!',
    hint: 'Press [Space] / Tap to jump. Survive 20s to win.',
    controls: '[Space] / Tap = Jump'
  },
  green_zone_timing: {
    label: 'Green Zone Timing',
    title: '🎯 GREEN ZONE TIMING',
    desc: 'Stop the needle in the green zone. 5 rounds.',
    hint: 'Press [Space] / Tap when needle hits GREEN.',
    controls: '[Space] / Tap = Stop Needle'
  },
  puzzle_unlock: {
    label: 'Puzzle Unlock',
    title: '🧩 PUZZLE UNLOCK',
    desc: 'Slide tiles to restore the image. Fewer moves = better.',
    hint: 'Click/Tap a tile next to the gap. Arrows also work.',
    controls: 'Click/Tap / Arrows = Slide Tile'
  },
  rhythm_catcher: {
    label: 'Rhythm Catcher',
    title: '🎵 RHYTHM CATCHER',
    desc: 'Catch falling notes on the beat. D F J K lanes.',
    hint: 'Press D F J K when notes hit the green line.',
    controls: 'D F J K = Catch Notes'
  },
  mash_clash: {
    label: 'Mash Clash',
    title: '💥 MASH CLASH',
    desc: 'Mash the button as fast as possible! 60 taps in 8s.',
    hint: 'Mash [Space] / Tap rapidly.',
    controls: '[Space] / Tap = Mash'
  },
  lockpick_dial: {
    label: 'Lockpick Dial',
    title: '🔐 LOCKPICK DIAL',
    desc: 'Rotate the dial to find the sweet spot. 3 attempts.',
    hint: '←/→ or Drag to turn pick. [Space]/Click to try.',
    controls: '←/→ / Drag = Turn Pick, [Space]/Click = Try'
  }
};

export default MiniGameView;
export { GAME_CLASSES, GAME_META };