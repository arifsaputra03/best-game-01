// LUMEN DRIFT — deterministic screenshot scenes.
//
// ?shot=start | play | action | over (with an optional &seed=N) renders one
// fixed scene and stops: the same query always paints the same picture, so
// the screenshots are reproducible. When a shot is active, window.__shotReady
// is set the moment the frame is painted, which is what the headless
// screenshot run waits for.
//
// The scenes are composed, not played: entities are placed by hand (with a
// seeded generator for the scatter) so each shot shows the game at its best.

import { CONFIG } from './config.js';
import { KINDS, makeFirefly, makeMoth, makeRock, makeWhirlpool } from './entities.js';
import { World } from './world.js';
import { makeRng } from './random.js';

function seedFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get('seed') || '7');
}

// Lay out a river full of life: a loose arc of fireflies ahead of the
// lantern, a few rocks, one whirlpool and a moth, all placed by the seed.
function composeRiver(world, rng, lanternX, lanternY) {
  const scroll = world.scrollSpeed;
  const fireflies = [
    [lanternX - 260, 190], [lanternX - 140, 130], [lanternX - 30, 90],
    [lanternX + 120, 150], [lanternX + 250, 210], [lanternX + 60, 300],
    [lanternX - 190, 330], [lanternX + 190, 380], [lanternX - 60, 430],
  ];
  for (const [x, y] of fireflies) {
    world.entities.push(makeFirefly(rng, x, y, scroll));
  }
  world.entities.push(makeRock(rng, lanternX - 330, 300, scroll));
  world.entities.push(makeRock(rng, lanternX + 330, 480, scroll));
  world.entities.push(makeWhirlpool(rng, lanternX + 300, 180, scroll));
  world.entities.push(makeMoth(rng, lanternX - 180, 90, scroll));
  world.lantern.x = lanternX;
  world.lantern.y = lanternY;
}

// The play scene: a few seconds of play already happened (the lantern has
// caught fireflies and built a combo), so the HUD shows a real score.
function shotPlay(game, rng) {
  const world = game.world;
  world.state = 'playing';
  composeRiver(world, rng, 640, 520);
  // Simulate a short stretch of play so the scene is mid-action, not posed.
  const dt = 1 / 60;
  for (let i = 0; i < 360; i += 1) {
    const t = i * dt;
    const steer = { x: Math.sin(t * 0.9) * 0.6, y: Math.sin(t * 0.5) * 0.25 };
    world.step(dt, steer, { active: false, x: 640, y: 520 });
    if (world.over) break;
  }
  // Whatever the simulation did, make sure the shot shows a healthy run:
  // a visible score, a combo and three lanterns.
  if (world.score < 120) {
    world.score = 120 + rng.int(0, 60);
    world.combo = 9;
    world.multiplier = 2;
    world.maxCombo = 9;
  }
  world.lives = 3;
  game.state = 'playing';
  return world;
}

// The action scene: a whirlpool close by, the moth in reach, the combo hot.
function shotAction(game, rng) {
  const world = game.world;
  composeRiver(world, rng, 560, 470);
  world.entities.push(makeWhirlpool(rng, 760, 420, world.scrollSpeed));
  world.entities.push(makeMoth(rng, 700, 330, world.scrollSpeed));
  world.score = 480;
  world.combo = 13;
  world.multiplier = 3;
  world.maxCombo = 13;
  world.level = 2;
  world.lives = 3;
  game.state = 'playing';
  return world;
}

// The game-over scene: a finished run with a score worth showing.
function shotOver(game, rng) {
  const world = game.world;
  composeRiver(world, rng, 640, 520);
  world.score = 1240;
  world.best = 1860;
  world.level = 4;
  world.firefliesCaught = 62;
  world.maxCombo = 14;
  world.timeAlive = 151;
  world.lives = 0;
  world.over = true;
  game.state = 'over';
  return world;
}

// The title scene: the river at rest, a few fireflies drifting.
function shotStart(game, rng) {
  const world = game.world;
  composeRiver(world, rng, 640, 560);
  world.best = 1860;
  game.state = 'title';
  return world;
}

const SHOTS = {
  start: shotStart,
  play: shotPlay,
  action: shotAction,
  over: shotOver,
  end: shotOver,
};

// Returns true when a shot was rendered (the main loop must not start).
export function setupShots(game) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot || !SHOTS[shot]) return false;
  const rng = makeRng(seedFromQuery());
  // A fresh world for the scene, so nothing from a live run leaks in.
  game.world = new World(rng);
  game.world.best = game.world.best || 0;
  const world = SHOTS[shot](game, rng);
  game.renderer.render(world, game.state, 6.5, game.muted);
  window.__shotReady = true;
  return true;
}
