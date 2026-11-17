// LUMEN DRIFT — a headless self-test (?selftest=1).
//
// Runs the real game logic (no rendering, no sound) through the full loop:
// title → playing → collect → hit → game over → restart → pause. The
// results are written into the page and into document.title, so a headless
// browser run can report them with --dump-dom. This file is a development
// tool; it changes nothing about the game itself.

import { CONFIG } from './config.js';
import { KINDS } from './entities.js';
import { World } from './world.js';
import { makeRng } from './random.js';

function check(name, condition, results) {
  results.push({ name, pass: Boolean(condition) });
  return Boolean(condition);
}

export function runSelfTest(game) {
  const results = [];
  const dt = 1 / 60;
  const steerNone = { x: 0, y: 0 };
  const pointerNone = { active: false, x: 640, y: 560 };

  // 1. A fresh world starts with 3 lives, no score, level 1.
  const world = new World(makeRng(42));
  check('fresh world: 3 lives, 0 score, level 1', world.lives === 3 && world.score === 0 && world.level === 1, results);

  // 2. Stepping the world advances time and spawns entities.
  for (let i = 0; i < 120; i += 1) world.step(dt, steerNone, pointerNone);
  check('world steps and spawns entities', world.timeAlive > 1.9 && world.entities.length > 0, results);

  // 3. A firefly placed on the lantern is collected and scores.
  const before = world.score;
  world.entities.push({
    kind: KINDS.FIREFLY, x: world.lantern.x, y: world.lantern.y, radius: 11,
    vy: 0, swayAmp: 0, swaySpeed: 1, phase: 0, glow: 1, age: 0, dead: false,
  });
  world.step(dt, steerNone, pointerNone);
  check('firefly collected, score rises', world.score > before && world.combo === 1, results);

  // 4. A rock placed on the lantern costs a life and grants invulnerability.
  const livesBefore = world.lives;
  world.entities.push({
    kind: KINDS.ROCK, x: world.lantern.x, y: world.lantern.y, radius: 30,
    vy: 0, bumps: [1, 1, 1, 1, 1, 1, 1], rotation: 0, age: 0, dead: false,
  });
  world.step(dt, steerNone, pointerNone);
  check('rock hit costs a life and invulnerability starts', world.lives === livesBefore - 1 && world.invulnerable, results);

  // 5. While invulnerable, a second rock does not cost another life.
  const livesAfterHit = world.lives;
  world.entities.push({
    kind: KINDS.ROCK, x: world.lantern.x, y: world.lantern.y, radius: 30,
    vy: 0, bumps: [1, 1, 1, 1, 1, 1, 1], rotation: 0, age: 0, dead: false,
  });
  world.step(dt, steerNone, pointerNone);
  check('invulnerability blocks the second hit', world.lives === livesAfterHit, results);

  // 6. Losing the last life ends the run.
  world.lives = 1;
  world.invulnerableUntil = -1;
  world.entities.push({
    kind: KINDS.ROCK, x: world.lantern.x, y: world.lantern.y, radius: 30,
    vy: 0, bumps: [1, 1, 1, 1, 1, 1, 1], rotation: 0, age: 0, dead: false,
  });
  world.step(dt, steerNone, pointerNone);
  check('last life lost ends the run', world.over === true && world.lives === 0, results);

  // 7. A new world starts clean (restart).
  const fresh = new World(makeRng(7));
  check('restart starts clean', fresh.lives === CONFIG.lives && fresh.score === 0 && fresh.over === false, results);

  // 8. Level up: 20 fireflies raise the level and pay a bonus.
  const levelWorld = new World(makeRng(9));
  levelWorld.firefliesThisLevel = CONFIG.levelUpFireflies - 1;
  levelWorld.collectFirefly({ x: 0, y: 0 });
  const scoreBeforeLevel = levelWorld.score;
  levelWorld.updateLevels();
  check('20 fireflies level up with a bonus', levelWorld.level === 2 && levelWorld.score > scoreBeforeLevel, results);

  // 9. The summary reports the run's numbers.
  const summary = world.summary();
  check('summary reports score and time', summary.score === world.score && typeof summary.time === 'string', results);

  // 10. The lantern never leaves the water.
  const clampWorld = new World(makeRng(11));
  clampWorld.lantern.x = -500;
  clampWorld.lantern.y = 9999;
  clampWorld.steer(0, steerNone, pointerNone);
  check(
    'lantern stays inside the water',
    clampWorld.lantern.x >= CONFIG.bankLeft && clampWorld.lantern.x <= CONFIG.bankRight
      && clampWorld.lantern.y >= 90 && clampWorld.lantern.y <= CONFIG.height - 60,
    results,
  );

  // 11-15. The Game's own state machine, driven by real key events on the
  // live game instance (window.__game), not by calling internals. Each tap
  // is a keydown followed by a keyup, as a real keyboard sends them.
  const live = window.__game;
  if (live) {
    const tap = (key) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key }));
      live.update(dt);
      live.input.endFrame();
      window.dispatchEvent(new KeyboardEvent('keyup', { key }));
    };
    check('game starts at the title screen', live.state === 'title', results);
    tap('Enter');
    check('Enter starts the run', live.state === 'playing', results);
    tap('p');
    check('P pauses the run', live.state === 'paused', results);
    tap('p');
    check('P resumes the run', live.state === 'playing', results);
    // Force the last life away, then restart with R.
    live.world.lives = 1;
    live.world.invulnerableUntil = -1;
    live.world.hit({ x: 0, y: 0 });
    live.update(dt);
    live.input.endFrame();
    check('losing the last lantern shows game over', live.state === 'over', results);
    tap('r');
    check(
      'R after game over starts a clean run',
      live.state === 'playing' && live.world.score === 0 && live.world.lives === CONFIG.lives,
      results,
    );
  } else {
    check('live game instance exists', false, results);
  }

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  const allPass = passed === total;
  const lines = results.map((r) => `${r.pass ? 'PASS' : 'FAIL'} ${r.name}`);
  const report = `SELFTEST ${allPass ? 'PASS' : 'FAIL'} ${passed}/${total}\n${lines.join('\n')}`;
  document.title = `SELFTEST ${allPass ? 'PASS' : 'FAIL'} ${passed}/${total}`;
  const pre = document.createElement('pre');
  pre.id = 'selftest';
  pre.textContent = report;
  document.body.appendChild(pre);
  window.__selfTestDone = true;
  window.__selfTestPass = allPass;
}
