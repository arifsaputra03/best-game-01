// LUMEN DRIFT — the world: spawning, collisions, scoring and levels.
//
// The world owns the lantern, every entity on the river, the score, the
// combo, the lives and the level. It knows nothing about drawing or sound;
// it reports what happened (collected, hit, level up, game over) through
// small event flags the game loop reads and turns into sound and particles.

import { CONFIG } from './config.js';
import {
  KINDS,
  burst,
  makeFirefly,
  makeMoth,
  makeRock,
  makeWhirlpool,
  stepEntity,
} from './entities.js';

export class World {
  constructor(rng) {
    this.rng = rng;
    this.reset();
  }

  reset() {
    const { lantern, lives } = CONFIG;
    this.lantern = {
      x: lantern.startX,
      y: lantern.startY,
      radius: lantern.radius,
      // Velocity while steering with the keys.
      vx: 0,
      vy: 0,
    };
    this.entities = [];
    this.particles = [];
    this.score = 0;
    this.best = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.multiplier = 1;
    this.lives = lives;
    this.level = 1;
    this.firefliesCaught = 0;
    this.timeAlive = 0;
    this.firefliesThisLevel = 0;
    this.secondsThisLevel = 0;
    this.invulnerableUntil = -1;
    this.shake = 0;
    this.banner = null; // { text, sub, until }
    this.events = [];
    this.spawnTimers = {
      firefly: 0.4,
      rock: 1.2,
      whirlpool: 5.0,
      moth: 9.0,
    };
    this.over = false;
    this.overAt = 0;
  }

  get scrollSpeed() {
    return CONFIG.scroll.base * Math.pow(CONFIG.scroll.perLevel, this.level - 1);
  }

  get invulnerable() {
    return this.timeAlive < this.invulnerableUntil;
  }

  // The spawn interval for one kind at the current level.
  spawnInterval(kind) {
    const base = CONFIG.spawn[`${kind}Every`];
    const tightened = base * Math.pow(CONFIG.spawn.tightenPerLevel, this.level - 1);
    return Math.max(CONFIG.spawn.minInterval, tightened);
  }

  // A random x inside the water, keeping `margin` clear of the banks.
  waterX(margin = 30) {
    return this.rng.range(CONFIG.bankLeft + margin, CONFIG.bankRight - margin);
  }

  spawn(kind) {
    const y = -50;
    switch (kind) {
      case KINDS.FIREFLY:
        this.entities.push(makeFirefly(this.rng, this.waterX(), y, this.scrollSpeed));
        break;
      case KINDS.ROCK:
        this.entities.push(makeRock(this.rng, this.waterX(46), y, this.scrollSpeed));
        break;
      case KINDS.WHIRLPOOL:
        this.entities.push(makeWhirlpool(this.rng, this.waterX(60), y, this.scrollSpeed));
        break;
      case KINDS.MOTH:
        this.entities.push(makeMoth(this.rng, this.waterX(), y, this.scrollSpeed));
        break;
      default:
        break;
    }
  }

  // Move the lantern: keys give it velocity, the pointer pulls it toward
  // itself. The lantern never leaves the water.
  steer(dt, steerVector, pointer) {
    const { lantern } = CONFIG;
    const L = this.lantern;
    if (steerVector.x !== 0 || steerVector.y !== 0) {
      L.x += steerVector.x * lantern.speed * dt;
      L.y += steerVector.y * lantern.speed * dt;
    } else if (pointer.active) {
      const dx = pointer.x - L.x;
      const dy = pointer.y - L.y;
      const k = Math.min(1, lantern.pointerChase * dt);
      L.x += dx * k;
      L.y += dy * k;
    }
    const minX = CONFIG.bankLeft + L.radius;
    const maxX = CONFIG.bankRight - L.radius;
    const minY = 90;
    const maxY = CONFIG.height - 60;
    L.x = Math.max(minX, Math.min(maxX, L.x));
    L.y = Math.max(minY, Math.min(maxY, L.y));
  }

  // One fixed step of the simulation.
  step(dt, steerVector, pointer) {
    if (this.over) return;
    this.timeAlive += dt;
    this.secondsThisLevel += dt;
    this.events = [];
    if (this.banner && this.timeAlive > this.banner.until) this.banner = null;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3);

    this.steer(dt, steerVector, pointer);
    this.updateSpawns(dt);
    this.updateEntities(dt);
    this.updateLevels(dt);
  }

  updateSpawns(dt) {
    const timers = this.spawnTimers;
    timers.firefly -= dt;
    timers.rock -= dt;
    timers.whirlpool -= dt;
    timers.moth -= dt;
    if (timers.firefly <= 0) {
      this.spawn(KINDS.FIREFLY);
      timers.firefly = this.spawnInterval('firefly') * this.rng.range(0.7, 1.3);
    }
    if (timers.rock <= 0) {
      this.spawn(KINDS.ROCK);
      timers.rock = this.spawnInterval('rock') * this.rng.range(0.7, 1.3);
    }
    if (timers.whirlpool <= 0 && this.level >= 2) {
      this.spawn(KINDS.WHIRLPOOL);
      timers.whirlpool = this.spawnInterval('whirlpool') * this.rng.range(0.8, 1.2);
    }
    if (timers.moth <= 0) {
      this.spawn(KINDS.MOTH);
      timers.moth = this.spawnInterval('moth') * this.rng.range(0.8, 1.3);
    }
  }

  updateEntities(dt) {
    const L = this.lantern;
    for (const entity of this.entities) {
      if (entity.dead) continue;
      // A whirlpool drags the lantern toward its centre.
      if (entity.kind === KINDS.WHIRLPOOL && !this.invulnerable) {
        const dx = entity.x - L.x;
        const dy = entity.y - L.y;
        const dist = Math.hypot(dx, dy);
        const reach = entity.radius + 130;
        if (dist > 1 && dist < reach) {
          const pull = (1 - dist / reach) * 150 * dt;
          L.x += (dx / dist) * pull;
          L.y += (dy / dist) * pull;
        }
      }
      stepEntity(entity, dt);
      // Off the bottom of the screen: gone.
      if (entity.y - entity.radius > CONFIG.height + 20) {
        entity.dead = true;
        continue;
      }
      this.collide(entity);
    }
    // Particles are cosmetic; they fade on their own.
    for (const particle of this.particles) stepEntity(particle, dt);
    this.entities = this.entities.filter((entity) => !entity.dead);
    this.particles = this.particles.filter((particle) => !particle.dead);
  }

  collide(entity) {
    const L = this.lantern;
    const dx = entity.x - L.x;
    const dy = entity.y - L.y;
    const dist = Math.hypot(dx, dy);
    switch (entity.kind) {
      case KINDS.FIREFLY: {
        if (dist < entity.radius + L.radius * 0.8) {
          entity.dead = true;
          this.collectFirefly(entity);
        }
        break;
      }
      case KINDS.MOTH: {
        if (dist < entity.radius + L.radius * 0.8) {
          entity.dead = true;
          this.collectMoth(entity);
        }
        break;
      }
      case KINDS.ROCK:
      case KINDS.WHIRLPOOL: {
        if (!this.invulnerable && dist < entity.radius * 0.85 + L.radius * 0.7) {
          entity.dead = true;
          this.hit(entity);
        }
        break;
      }
      default:
        break;
    }
  }

  collectFirefly(entity) {
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.multiplier = 1 + Math.min(
      CONFIG.score.maxMultiplier - 1,
      Math.floor(this.combo / CONFIG.score.comboStep),
    );
    const points = CONFIG.score.firefly * this.multiplier;
    this.score += points;
    this.firefliesCaught += 1;
    this.firefliesThisLevel += 1;
    this.particles.push(
      ...burst(entity.x, entity.y, CONFIG.colors.firefly, 10, 130, 0.5, 3),
    );
    this.events.push({ type: 'collect', combo: this.combo, points, x: entity.x, y: entity.y });
  }

  collectMoth(entity) {
    const points = CONFIG.score.moth * this.multiplier;
    this.score += points;
    this.particles.push(
      ...burst(entity.x, entity.y, CONFIG.colors.moth, 18, 180, 0.7, 4),
    );
    this.events.push({ type: 'moth', points, x: entity.x, y: entity.y });
  }

  hit(entity) {
    this.lives -= 1;
    this.combo = 0;
    this.multiplier = 1;
    this.invulnerableUntil = this.timeAlive + CONFIG.invulnerableSeconds;
    this.shake = 1;
    this.particles.push(
      ...burst(this.lantern.x, this.lantern.y, CONFIG.colors.danger, 22, 260, 0.7, 4),
    );
    this.events.push({ type: 'hit', lives: this.lives });
    if (this.lives <= 0) {
      this.over = true;
      this.overAt = this.timeAlive;
      this.events.push({ type: 'gameover', score: this.score });
    }
  }

  updateLevels() {
    const leveled =
      this.firefliesThisLevel >= CONFIG.levelUpFireflies ||
      this.secondsThisLevel >= CONFIG.levelUpSeconds;
    if (!leveled) return;
    this.level += 1;
    this.firefliesThisLevel = 0;
    this.secondsThisLevel = 0;
    const bonus = CONFIG.score.levelBonus * this.level;
    this.score += bonus;
    this.banner = {
      text: `Level ${this.level}`,
      sub: `The current quickens  ·  +${bonus} bonus`,
      until: this.timeAlive + 2.2,
    };
    this.events.push({ type: 'levelup', level: this.level, bonus });
  }

  // A short summary for the game-over screen.
  summary() {
    const minutes = Math.floor(this.timeAlive / 60);
    const seconds = Math.floor(this.timeAlive % 60);
    return {
      score: this.score,
      best: Math.max(this.best, this.score),
      level: this.level,
      fireflies: this.firefliesCaught,
      maxCombo: this.maxCombo,
      time: `${minutes}:${String(seconds).padStart(2, '0')}`,
    };
  }
}
