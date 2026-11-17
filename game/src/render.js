// LUMEN DRIFT — everything the player sees.
//
// One renderer draws the river, the banks, the moon, every entity, the
// lantern and every screen (title, HUD, pause, game over). Glow is drawn
// from small offscreen sprites made once, so a busy river stays fast.

import { CONFIG } from './config.js';
import { KINDS } from './entities.js';

// A soft radial glow, drawn once into a sprite and stamped where needed.
function makeGlowSprite(rgba, size = 64) {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  const [r, g, b] = match ? match.slice(1).map(Number) : [255, 255, 255];
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.9)`);
  gradient.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, 0.35)`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

function glowColor(rgba, alpha) {
  const match = rgba.match(/rgba?\(([^)]+)\)/);
  if (!match) return rgba;
  const parts = match[1].split(',').map((part) => part.trim());
  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sprites = {
      firefly: makeGlowSprite('rgba(141, 245, 227, 1)'),
      moth: makeGlowSprite('rgba(255, 209, 102, 1)'),
      lantern: makeGlowSprite('rgba(255, 179, 71, 1)', 128),
      moon: makeGlowSprite('rgba(244, 241, 222, 1)', 128),
    };
    // Reeds along both banks, placed once so they never jump around.
    this.reeds = [];
    for (let side = 0; side < 2; side += 1) {
      for (let i = 0; i < 26; i += 1) {
        const baseX = side === 0
          ? 8 + ((i * 37) % 78)
          : CONFIG.width - 8 - ((i * 53) % 78);
        this.reeds.push({
          x: baseX,
          y: (i * 173) % CONFIG.height,
          height: 34 + ((i * 29) % 46),
          lean: ((i % 5) - 2) * 4,
          phase: i * 0.7,
        });
      }
    }
    // Stars in the sky strip above the river's top edge.
    this.stars = Array.from({ length: 70 }, (_, i) => ({
      x: ((i * 197) % CONFIG.width) + 10,
      y: ((i * 89) % 110) + 8,
      radius: 0.6 + ((i * 7) % 10) / 10,
      phase: i * 1.3,
    }));
  }

  // The whole frame: background, entities, lantern, HUD and the current
  // screen's overlay. `state` is one of title, playing, paused, over.
  render(world, state, time, muted) {
    const { ctx } = this;
    ctx.save();
    if (world.shake > 0) {
      const magnitude = world.shake * 7;
      ctx.translate((Math.random() - 0.5) * magnitude, (Math.random() - 0.5) * magnitude);
    }
    this.drawSkyAndWater(time);
    this.drawBanks(time);
    for (const entity of world.entities) this.drawEntity(entity, time);
    for (const particle of world.particles) this.drawParticle(particle);
    this.drawLantern(world, time);
    ctx.restore();
    if (state === 'playing' || state === 'paused') this.drawHUD(world, muted);
    if (state === 'title') this.drawTitle(world);
    if (state === 'paused') this.drawPaused();
    if (state === 'over') this.drawGameOver(world);
  }

  drawSkyAndWater(time) {
    const { ctx } = this;
    const { width, height } = CONFIG;
    // The water: a deep indigo that lightens toward the top.
    const water = ctx.createLinearGradient(0, 0, 0, height);
    water.addColorStop(0, CONFIG.colors.waterTop);
    water.addColorStop(1, CONFIG.colors.waterBottom);
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, width, height);
    // The moon's path: a shimmering column down the middle of the river.
    const pathWidth = 150 + Math.sin(time * 0.4) * 14;
    const path = ctx.createLinearGradient(0, 0, 0, height);
    path.addColorStop(0, CONFIG.colors.moonPath);
    path.addColorStop(1, 'rgba(244, 241, 222, 0.02)');
    ctx.fillStyle = path;
    ctx.fillRect(640 - pathWidth / 2, 0, pathWidth, height);
    // Drifting ripple lines, brighter where the moon path runs.
    ctx.strokeStyle = 'rgba(150, 190, 255, 0.10)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i += 1) {
      const y = ((i * 97 + time * 26) % (height + 60)) - 30;
      const x = 180 + ((i * 211) % 920);
      const len = 46 + ((i * 31) % 60);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
    }
    // Stars.
    for (const star of this.stars) {
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.8 + star.phase));
      ctx.fillStyle = `rgba(244, 241, 222, ${0.25 + 0.55 * twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    // The moon, high on the right.
    ctx.drawImage(this.sprites.moon, 1050 - 70, 26 - 70, 140, 140);
    ctx.fillStyle = CONFIG.colors.moon;
    ctx.beginPath();
    ctx.arc(1050, 26 + 34, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180, 180, 200, 0.5)';
    ctx.beginPath();
    ctx.arc(1042, 52, 5, 0, Math.PI * 2);
    ctx.arc(1058, 66, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBanks(time) {
    const { ctx } = this;
    const { height } = CONFIG;
    // The banks: dark earth on both sides, edged with a lit rim.
    ctx.fillStyle = CONFIG.colors.bank;
    ctx.fillRect(0, 0, CONFIG.bankLeft, height);
    ctx.fillRect(CONFIG.bankRight, 0, CONFIG.width - CONFIG.bankRight, height);
    ctx.fillStyle = CONFIG.colors.bankEdge;
    ctx.fillRect(CONFIG.bankLeft - 3, 0, 3, height);
    ctx.fillRect(CONFIG.bankRight, 0, 3, height);
    // Reeds swaying on the banks.
    for (const reed of this.reeds) {
      const sway = Math.sin(time * 0.9 + reed.phase) * 5;
      ctx.strokeStyle = CONFIG.colors.reed;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(reed.x, reed.y + reed.height);
      ctx.quadraticCurveTo(
        reed.x + reed.lean + sway,
        reed.y + reed.height / 2,
        reed.x + reed.lean * 2 + sway,
        reed.y,
      );
      ctx.stroke();
      ctx.fillStyle = CONFIG.colors.reedTip;
      ctx.beginPath();
      ctx.arc(reed.x + reed.lean * 2 + sway, reed.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawEntity(entity, time) {
    switch (entity.kind) {
      case KINDS.FIREFLY:
        this.drawFirefly(entity, time);
        break;
      case KINDS.ROCK:
        this.drawRock(entity);
        break;
      case KINDS.WHIRLPOOL:
        this.drawWhirlpool(entity, time);
        break;
      case KINDS.MOTH:
        this.drawMoth(entity, time);
        break;
      default:
        break;
    }
  }

  drawFirefly(entity, time) {
    const { ctx } = this;
    const pulse = 0.75 + 0.25 * Math.sin(time * 3 + entity.phase);
    const size = 44 * pulse * entity.glow;
    ctx.drawImage(this.sprites.firefly, entity.x - size / 2, entity.y - size / 2, size, size);
    ctx.fillStyle = '#eafffa';
    ctx.beginPath();
    ctx.arc(entity.x, entity.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawRock(entity) {
    const { ctx } = this;
    ctx.fillStyle = CONFIG.colors.rock;
    ctx.beginPath();
    for (let i = 0; i < entity.bumps.length; i += 1) {
      const angle = (i / entity.bumps.length) * Math.PI * 2 + entity.rotation;
      const r = entity.radius * entity.bumps[i];
      const x = entity.x + Math.cos(angle) * r;
      const y = entity.y + Math.sin(angle) * r * 0.8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    // A lit top edge and a foam ring where the water meets the stone.
    ctx.fillStyle = CONFIG.colors.rockTop;
    ctx.beginPath();
    ctx.ellipse(entity.x, entity.y - entity.radius * 0.35, entity.radius * 0.55, entity.radius * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = CONFIG.colors.foam;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(entity.x, entity.y + entity.radius * 0.45, entity.radius * 0.9, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  drawWhirlpool(entity, time) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.fillStyle = CONFIG.colors.whirlpoolDark;
    ctx.beginPath();
    ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = CONFIG.colors.whirlpool;
    ctx.lineWidth = 4;
    for (let arm = 0; arm < 3; arm += 1) {
      ctx.beginPath();
      for (let t = 0; t <= 1.001; t += 0.08) {
        const angle = entity.phase + arm * (Math.PI * 2 / 3) + t * 4.2;
        const r = entity.radius * (1 - t * 0.75);
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  drawMoth(entity, time) {
    const { ctx } = this;
    const flap = Math.sin(time * entity.flap + entity.phase) * 0.6;
    const size = 34;
    ctx.drawImage(this.sprites.moth, entity.x - size, entity.y - size, size * 2, size * 2);
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.fillStyle = CONFIG.colors.moth;
    // Two wings, flapping.
    ctx.save();
    ctx.rotate(-0.5 - flap);
    ctx.beginPath();
    ctx.ellipse(-9, -4, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.rotate(0.5 + flap);
    ctx.beginPath();
    ctx.ellipse(9, -4, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Body.
    ctx.fillStyle = '#8a6d2f';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawParticle(particle) {
    const { ctx } = this;
    const alpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = glowColor(particle.color, alpha);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius * alpha + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawLantern(world, time) {
    const { ctx } = this;
    const L = world.lantern;
    const flicker = 1 + Math.sin(time * 7) * 0.05 + Math.sin(time * 13.7) * 0.03;
    const glowSize = 190 * flicker;
    // The glow, then the paper lantern itself.
    ctx.drawImage(this.sprites.lantern, L.x - glowSize / 2, L.y - glowSize / 2, glowSize, glowSize);
    const blink = world.invulnerable && Math.floor(time * 10) % 2 === 0;
    ctx.save();
    ctx.globalAlpha = blink ? 0.45 : 1;
    ctx.translate(L.x, L.y);
    // Tassel.
    ctx.strokeStyle = CONFIG.colors.lanternFrame;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(0, 30 + Math.sin(time * 3) * 2);
    ctx.stroke();
    ctx.fillStyle = CONFIG.colors.danger;
    ctx.beginPath();
    ctx.arc(0, 32 + Math.sin(time * 3) * 2, 3, 0, Math.PI * 2);
    ctx.fill();
    // Body: a rounded paper lantern.
    const body = ctx.createLinearGradient(-20, -22, 20, 22);
    body.addColorStop(0, CONFIG.colors.lanternCore);
    body.addColorStop(1, CONFIG.colors.lanternMid);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    // Frame ribs.
    ctx.strokeStyle = CONFIG.colors.lanternFrame;
    ctx.lineWidth = 2;
    for (const offset of [-10, 0, 10]) {
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.abs(offset) + 4, 22, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();
    // Cap and base.
    ctx.fillStyle = CONFIG.colors.lanternFrame;
    ctx.fillRect(-7, -26, 14, 5);
    ctx.fillRect(-7, 21, 14, 5);
    // The flame's heart.
    ctx.fillStyle = 'rgba(255, 250, 220, 0.95)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 6, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawHUD(world, muted) {
    const { ctx } = this;
    const { width } = CONFIG;
    // Top-left: score, best and level.
    ctx.textAlign = 'left';
    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = '700 34px system-ui, sans-serif';
    ctx.fillText(String(world.score).padStart(5, '0'), 24, 46);
    ctx.fillStyle = CONFIG.colors.textDim;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(`BEST ${Math.max(world.best, world.score)}`, 24, 70);
    ctx.fillText(`LEVEL ${world.level}`, 24, 92);
    // Top-right: lives as little lanterns, and the mute state.
    for (let i = 0; i < CONFIG.lives; i += 1) {
      const x = width - 36 - i * 34;
      const lit = i < world.lives;
      ctx.fillStyle = lit ? CONFIG.colors.lanternMid : 'rgba(120, 130, 160, 0.35)';
      ctx.beginPath();
      ctx.ellipse(x, 38, 9, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lit ? CONFIG.colors.lanternCore : 'rgba(120, 130, 160, 0.25)';
      ctx.beginPath();
      ctx.ellipse(x, 38, 4, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = CONFIG.colors.textDim;
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(muted ? 'M — sound off' : 'M — sound on', width - 24, 70);
    ctx.fillText('P — pause', width - 24, 92);
    // Combo meter under the score, when a chain is going.
    if (world.combo >= 2) {
      const barWidth = 150;
      const fraction = Math.min(1, world.combo / (CONFIG.score.comboStep * (CONFIG.score.maxMultiplier - 1)));
      ctx.fillStyle = 'rgba(8, 12, 30, 0.6)';
      ctx.fillRect(24, 104, barWidth, 10);
      ctx.fillStyle = CONFIG.colors.firefly;
      ctx.fillRect(24, 104, barWidth * fraction, 10);
      ctx.fillStyle = CONFIG.colors.text;
      ctx.font = '700 16px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`COMBO x${world.multiplier}  ·  ${world.combo}`, 24, 134);
    }
    // Level banner.
    if (world.banner) {
      ctx.textAlign = 'center';
      ctx.fillStyle = CONFIG.colors.text;
      ctx.font = '700 44px Georgia, serif';
      ctx.fillText(world.banner.text, width / 2, 210);
      ctx.fillStyle = CONFIG.colors.textDim;
      ctx.font = '600 18px system-ui, sans-serif';
      ctx.fillText(world.banner.sub, width / 2, 242);
    }
  }

  drawPanel(x, y, width, height) {
    const { ctx } = this;
    ctx.fillStyle = CONFIG.colors.panel;
    ctx.strokeStyle = CONFIG.colors.panelBorder;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 18);
    ctx.fill();
    ctx.stroke();
  }

  drawTitle(world) {
    const { ctx } = this;
    const { width, height } = CONFIG;
    // A soft veil so the title reads over the river.
    const veil = ctx.createLinearGradient(0, 0, 0, height);
    veil.addColorStop(0, 'rgba(8, 12, 30, 0.25)');
    veil.addColorStop(0.5, 'rgba(8, 12, 30, 0.45)');
    veil.addColorStop(1, 'rgba(8, 12, 30, 0.25)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, width, height);
    this.drawPanel(width / 2 - 330, 120, 660, 460);
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.colors.moth;
    ctx.font = '600 19px system-ui, sans-serif';
    ctx.fillText('A LANTERN RIVER RUN', width / 2, 168);
    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = '700 72px Georgia, serif';
    ctx.fillText('LUMEN DRIFT', width / 2, 244);
    ctx.fillStyle = CONFIG.colors.textDim;
    ctx.font = '400 19px Georgia, serif';
    ctx.fillText('Guide the last lantern down the dusk river.', width / 2, 282);
    ctx.fillText('Catch fireflies. Dodge the rocks. Fear the whirlpools.', width / 2, 310);
    // How to play, in three short lines.
    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.fillText('Move — mouse or arrow keys / WASD', width / 2, 362);
    ctx.fillText('Firefly +10  ·  Moon moth +100  ·  Combo builds your multiplier', width / 2, 392);
    ctx.fillText('3 lanterns  ·  P pauses  ·  M mutes  ·  R restarts', width / 2, 422);
    if (world.best > 0) {
      ctx.fillStyle = CONFIG.colors.moth;
      ctx.font = '700 19px system-ui, sans-serif';
      ctx.fillText(`Best score: ${world.best}`, width / 2, 462);
    }
    // The pulsing call to action.
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 350);
    ctx.fillStyle = `rgba(244, 241, 222, ${pulse})`;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('Click or press Enter to set sail', width / 2, 536);
  }

  drawPaused() {
    const { ctx } = this;
    const { width, height } = CONFIG;
    ctx.fillStyle = 'rgba(8, 12, 30, 0.55)';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = '700 56px Georgia, serif';
    ctx.fillText('Paused', width / 2, height / 2 - 8);
    ctx.fillStyle = CONFIG.colors.textDim;
    ctx.font = '600 19px system-ui, sans-serif';
    ctx.fillText('Press P or click to keep drifting', width / 2, height / 2 + 34);
  }

  drawGameOver(world) {
    const { ctx } = this;
    const { width } = CONFIG;
    const summary = world.summary();
    ctx.fillStyle = 'rgba(8, 12, 30, 0.55)';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    this.drawPanel(width / 2 - 300, 130, 600, 440);
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = '700 52px Georgia, serif';
    ctx.fillText('The light goes out', width / 2, 200);
    ctx.fillStyle = CONFIG.colors.moth;
    ctx.font = '700 30px system-ui, sans-serif';
    ctx.fillText(`Score  ${summary.score}`, width / 2, 256);
    ctx.fillStyle = CONFIG.colors.textDim;
    ctx.font = '600 18px system-ui, sans-serif';
    const rows = [
      `Best  ${summary.best}`,
      `Reached level ${summary.level}  ·  drifted ${summary.time}`,
      `Fireflies caught  ${summary.fireflies}  ·  best combo x${Math.max(1, Math.min(CONFIG.score.maxMultiplier, 1 + Math.floor(summary.maxCombo / CONFIG.score.comboStep)))} (${summary.maxCombo})`,
    ];
    rows.forEach((row, i) => {
      ctx.fillText(row, width / 2, 302 + i * 32);
    });
    if (summary.score >= summary.best && summary.score > 0) {
      ctx.fillStyle = CONFIG.colors.moth;
      ctx.font = '700 20px system-ui, sans-serif';
      ctx.fillText('A new best — the river remembers.', width / 2, 414);
    }
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 350);
    ctx.fillStyle = `rgba(244, 241, 222, ${pulse})`;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('Press R or click to light another lantern', width / 2, 524);
  }
}
