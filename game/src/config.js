// LUMEN DRIFT — tuning and palette.
// One place for every number that shapes how the game feels, so balancing is
// a matter of editing values here, never hunting through the logic.

export const CONFIG = {
  // Logical playfield. The canvas is fixed at this size; CSS scales it.
  width: 1280,
  height: 720,

  // The river's banks. Playable water lies between bankLeft and bankRight.
  bankLeft: 96,
  bankRight: 1184,

  // The lantern (the player).
  lantern: {
    radius: 26,
    // How fast the lantern answers the keys, in px/s.
    speed: 460,
    // How fast it chases the pointer, as a fraction of the gap per second.
    pointerChase: 14,
    startX: 640,
    startY: 560,
  },

  // The river's current: how fast the world scrolls down, in px/s.
  scroll: {
    base: 130,
    // Each level multiplies the scroll speed by this.
    perLevel: 1.1,
  },

  // Lives and difficulty.
  lives: 3,
  // Seconds of invulnerability after a hit.
  invulnerableSeconds: 1.6,
  // Fireflies caught (or seconds survived) to reach the next level.
  levelUpFireflies: 20,
  levelUpSeconds: 25,

  // Spawning, in seconds between spawns at level 1. Each level multiplies
  // the interval by spawnTighten (never below the floor).
  spawn: {
    fireflyEvery: 0.65,
    rockEvery: 1.5,
    whirlpoolEvery: 7.0,
    mothEvery: 18.0,
    tightenPerLevel: 0.92,
    minInterval: 0.28,
  },

  // Scoring.
  score: {
    firefly: 10,
    moth: 100,
    // One multiplier step per comboStep consecutive fireflies, capped.
    comboStep: 6,
    maxMultiplier: 5,
    levelBonus: 50,
  },

  // The palette: one dusk river, one warm lantern.
  colors: {
    skyTop: '#0a0e24',
    skyBottom: '#1a2450',
    waterTop: '#131c3f',
    waterBottom: '#0a1030',
    bank: '#0d1526',
    bankEdge: '#233058',
    reed: '#1d2f4d',
    reedTip: '#3f6b4f',
    moon: '#f4f1de',
    moonGlow: 'rgba(244, 241, 222, 0.35)',
    moonPath: 'rgba(244, 241, 222, 0.10)',
    lanternCore: '#ffe9a8',
    lanternMid: '#ffb347',
    lanternGlow: 'rgba(255, 179, 71, 0.45)',
    lanternFrame: '#7a4a21',
    firefly: '#8df5e3',
    fireflyGlow: 'rgba(141, 245, 227, 0.5)',
    moth: '#ffd166',
    mothGlow: 'rgba(255, 209, 102, 0.55)',
    rock: '#2a3352',
    rockTop: '#46537e',
    foam: 'rgba(190, 220, 255, 0.5)',
    whirlpool: '#4d6fa8',
    whirlpoolDark: '#1c2b4d',
    text: '#f4f1de',
    textDim: '#aab4d6',
    danger: '#ff6b6b',
    panel: 'rgba(8, 12, 30, 0.72)',
    panelBorder: 'rgba(244, 241, 222, 0.25)',
  },
};
