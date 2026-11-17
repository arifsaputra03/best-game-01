// LUMEN DRIFT — the things that drift down the river.
//
// Every entity is a plain object with a kind, a position, a radius and a
// little phase for its wobble. This file only knows how to make them and how
// they move; the world decides when they appear and what they do on contact.

export const KINDS = {
  FIREFLY: 'firefly',
  ROCK: 'rock',
  WHIRLPOOL: 'whirlpool',
  MOTH: 'moth',
  PARTICLE: 'particle',
};

// A firefly: drifts down with the current, swaying side to side, glowing.
export function makeFirefly(rng, x, y, scrollSpeed) {
  return {
    kind: KINDS.FIREFLY,
    x,
    y,
    radius: 11,
    // Slightly slower than the current, so it hangs in the water.
    vy: scrollSpeed * rng.range(0.85, 1.0),
    swayAmp: rng.range(14, 34),
    swaySpeed: rng.range(1.2, 2.4),
    phase: rng.range(0, Math.PI * 2),
    glow: rng.range(0.6, 1),
    age: 0,
    dead: false,
  };
}

// A rock: a solid hazard. It rides the current straight down.
export function makeRock(rng, x, y, scrollSpeed) {
  const radius = rng.range(24, 40);
  return {
    kind: KINDS.ROCK,
    x,
    y,
    radius,
    vy: scrollSpeed * rng.range(0.95, 1.05),
    // A few bumps so no two rocks share a silhouette.
    bumps: Array.from({ length: 7 }, () => rng.range(0.82, 1.18)),
    rotation: rng.range(0, Math.PI * 2),
    age: 0,
    dead: false,
  };
}

// A whirlpool: a hazard that also drags the lantern toward its centre.
export function makeWhirlpool(rng, x, y, scrollSpeed) {
  return {
    kind: KINDS.WHIRLPOOL,
    x,
    y,
    radius: rng.range(34, 46),
    vy: scrollSpeed * 0.9,
    spin: rng.range(2.2, 3.2),
    phase: rng.range(0, Math.PI * 2),
    age: 0,
    dead: false,
  };
}

// A moon moth: rare, golden, worth far more than a firefly. It flutters
// across the river instead of drifting straight down.
export function makeMoth(rng, x, y, scrollSpeed) {
  return {
    kind: KINDS.MOTH,
    x,
    y,
    radius: 15,
    vy: scrollSpeed * 0.55,
    vx: rng.range(-50, 50),
    flap: rng.range(6, 9),
    phase: rng.range(0, Math.PI * 2),
    age: 0,
    dead: false,
  };
}

// A sparkle or a splash: short-lived, purely cosmetic.
export function makeParticle(x, y, color, speed, life, size) {
  const angle = Math.random() * Math.PI * 2;
  return {
    kind: KINDS.PARTICLE,
    x,
    y,
    radius: size,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 20,
    color,
    life,
    maxLife: life,
    age: 0,
    dead: false,
  };
}

export function burst(x, y, color, count, speed, life, size) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(makeParticle(x, y, color, speed * (0.4 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.7), size * (0.7 + Math.random() * 0.6)));
  }
  return out;
}

// Advance one entity by dt seconds. Returns nothing; mutates in place.
export function stepEntity(entity, dt) {
  entity.age += dt;
  switch (entity.kind) {
    case KINDS.FIREFLY:
      entity.y += entity.vy * dt;
      entity.x += Math.sin(entity.age * entity.swaySpeed + entity.phase) * entity.swayAmp * dt;
      break;
    case KINDS.ROCK:
      entity.y += entity.vy * dt;
      break;
    case KINDS.WHIRLPOOL:
      entity.y += entity.vy * dt;
      entity.phase += entity.spin * dt;
      break;
    case KINDS.MOTH: {
      entity.y += entity.vy * dt;
      entity.x += entity.vx * dt + Math.sin(entity.age * entity.flap + entity.phase) * 26 * dt;
      break;
    }
    case KINDS.PARTICLE:
      entity.x += entity.vx * dt;
      entity.y += entity.vy * dt;
      entity.vx *= 1 - 2.2 * dt;
      entity.vy *= 1 - 2.2 * dt;
      entity.life -= dt;
      if (entity.life <= 0) entity.dead = true;
      break;
    default:
      break;
  }
}
