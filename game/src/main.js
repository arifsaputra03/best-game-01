// LUMEN DRIFT — the game loop and the state machine.
//
// States: title → playing ⇄ paused → over → playing (restart).
// The loop runs on requestAnimationFrame with a clamped delta so a tab
// that was hidden for a while never jumps the world forward. The best score
// is kept in localStorage; everything else lives in the World.

import { CONFIG } from './config.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { sound } from './audio.js';
import { World } from './world.js';
import { makeRng } from './random.js';
import { setupShots } from './shots.js';

const BEST_KEY = 'lumen-drift-best';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas);
    this.world = new World(makeRng((Math.random() * 1e9) | 0));
    this.world.best = this.loadBest();
    this.state = 'title';
    this.time = 0;
    this.lastTimestamp = 0;
    this.muted = false;
    this.shotMode = false;
  }

  loadBest() {
    try {
      return Number(window.localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  saveBest() {
    try {
      window.localStorage.setItem(BEST_KEY, String(Math.max(this.world.best, this.world.score)));
    } catch {
      // Private mode or no storage: the best score simply does not persist.
    }
  }

  start() {
    this.input.attach();
    // Shot mode (deterministic screenshots) renders one frame and stops.
    this.shotMode = setupShots(this);
    if (this.shotMode) return;
    // Self-test mode (?selftest=1) runs its checks and reports in the DOM.
    const params = new URLSearchParams(window.location.search);
    if (params.get('selftest') === '1') {
      import('./selftest.js').then(({ runSelfTest }) => runSelfTest(this));
      return;
    }
    this.lastTimestamp = performance.now();
    requestAnimationFrame((timestamp) => this.loop(timestamp));
  }

  loop(timestamp) {
    const dt = Math.min(0.05, Math.max(0, (timestamp - this.lastTimestamp) / 1000));
    this.lastTimestamp = timestamp;
    this.time += dt;
    this.update(dt);
    this.renderer.render(this.world, this.state, this.time, this.muted);
    this.input.endFrame();
    requestAnimationFrame((next) => this.loop(next));
  }

  update(dt) {
    const input = this.input;
    if (input.justPressed('m')) {
      this.muted = sound.toggleMute();
    }
    switch (this.state) {
      case 'title': {
        if (input.justPressed('Enter', ' ', 'pointer')) {
          sound.unlock();
          sound.click();
          this.beginRun();
        }
        break;
      }
      case 'playing': {
        if (input.justPressed('p', 'Escape')) {
          this.state = 'paused';
          break;
        }
        if (input.justPressed('r')) {
          this.beginRun();
          break;
        }
        this.world.step(dt, input.steerVector(), input.pointer);
        this.handleEvents();
        if (this.world.over) {
          this.state = 'over';
          this.saveBest();
          sound.gameOver();
        }
        break;
      }
      case 'paused': {
        if (input.justPressed('p', 'Escape', 'pointer')) {
          this.state = 'playing';
        }
        if (input.justPressed('r')) {
          this.beginRun();
        }
        break;
      }
      case 'over': {
        if (input.justPressed('r', 'Enter', ' ', 'pointer')) {
          sound.click();
          this.beginRun();
        }
        break;
      }
      default:
        break;
    }
  }

  // Turn the world's event flags into sound. Particles are already added
  // by the world itself.
  handleEvents() {
    for (const event of this.world.events) {
      if (event.type === 'collect') sound.collect(event.combo);
      if (event.type === 'moth') sound.moth();
      if (event.type === 'hit') sound.hit();
      if (event.type === 'levelup') sound.levelUp();
    }
  }

  beginRun() {
    const best = Math.max(this.world.best, this.world.score);
    this.world = new World(makeRng((Math.random() * 1e9) | 0));
    this.world.best = best;
    this.state = 'playing';
  }
}
