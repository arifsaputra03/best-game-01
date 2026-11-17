[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/arifsaputra03/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/arifsaputra03/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# LUMEN DRIFT — a lantern river run

Entry for [best-game-01](https://make.fun/bounty/best-game-01) on make.fun: *make the best game*. A complete, original arcade game that plays offline in a desktop browser from static files.

## The game

Guide the last paper lantern down a dusk river. Catch fireflies to build your combo, dodge the rocks, fear the whirlpools — and catch the rare golden moon moth when it flutters by. The current quickens every level; three lanterns stand between you and the dark.

- **Move** — mouse or arrow keys / WASD
- **Firefly** +10 · **Moon moth** +100 · **Combo** builds your multiplier (up to x5)
- **3 lives** · **P** pauses · **M** mutes · **R** restarts · **Enter** starts

Every sound is synthesized live with the Web Audio API — no audio files. All art is drawn in code on a 2D canvas — no image files. The best score is kept in `localStorage`.

## Play it

```sh
node serve.ts   # serves game/ on http://localhost:8080
```

Or open `game/index.html` from any static server. No build step, no network requests.

## Layout

```
game/
  index.html            the page: a 1280x720 canvas, nothing else
  src/
    config.js           every tuning number and the palette
    random.js           seeded RNG (deterministic screenshot scenes)
    audio.js            synthesized sound: collect, hit, level, game over
    input.js            keyboard + pointer, with edge-triggered actions
    entities.js         fireflies, rocks, whirlpools, moths, particles
    world.js            spawning, collisions, scoring, combo, levels
    render.js           the river, the lantern, the HUD, every screen
    shots.js            deterministic scenes for the screenshots
    selftest.js         headless self-test (?selftest=1)
    main.js             game loop and the title/playing/paused/over states
main.ts                 the entrypoint: writes /output + dossier.json
vendor/makefun-game.ts  the kit's dossier library, unchanged
screenshots/           4 real renders of the game's own code
```

## Verify it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/dossier.json
```

Screenshots are deterministic scenes (`shots.json`): `?shot=start`, `?shot=play`, `?shot=action`, `?shot=over`, each with `&seed=7`. The headless self-test runs at `?selftest=1` and reports PASS/FAIL in the page.
