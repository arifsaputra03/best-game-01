// LUMEN DRIFT — a small seeded random number generator.
//
// The game's live runs use Math.random through `live()`. The deterministic
// screenshot scenes use a seeded generator so every render of a shot is
// identical, run after run.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A tiny wrapper so call sites read like plain English.
export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    // A float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // An integer in [min, max] inclusive.
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    // One element of an array.
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
  };
}
