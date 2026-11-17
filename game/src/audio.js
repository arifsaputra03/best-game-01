// LUMEN DRIFT — synthesized sound.
//
// Every sound is generated with the Web Audio API: short oscillator blips and
// filtered noise, no audio files at all. The engine is created lazily and
// stays silent until the first user gesture (browsers require that), so
// calling any play method before then is a harmless no-op.

export class SoundEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.ambientTimer = null;
  }

  // Create the AudioContext on the first gesture. Safe to call repeatedly.
  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.context.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  // A short tone: frequency slides from `from` to `to` over `seconds`.
  tone({ from, to = from, seconds = 0.12, type = 'sine', volume = 0.5, when = 0 }) {
    if (!this.context || this.muted) return;
    const t0 = this.context.currentTime + when;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + seconds);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  // A burst of filtered noise (splashes, thuds).
  noise({ seconds = 0.2, volume = 0.4, frequency = 800, when = 0 }) {
    if (!this.context || this.muted) return;
    const t0 = this.context.currentTime + when;
    const length = Math.max(1, Math.floor(this.context.sampleRate * seconds));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(t0);
  }

  // A firefly caught. The pitch climbs with the combo, so a long chain
  // sounds like a little ascending scale.
  collect(combo) {
    const step = Math.min(combo, 24);
    const base = 520 * Math.pow(2, step / 12);
    this.tone({ from: base, to: base * 1.5, seconds: 0.14, type: 'sine', volume: 0.4 });
    this.tone({ from: base * 2, seconds: 0.08, type: 'triangle', volume: 0.12, when: 0.02 });
  }

  // The rare moon moth: a bright two-note chime.
  moth() {
    this.tone({ from: 880, to: 1320, seconds: 0.22, type: 'sine', volume: 0.45 });
    this.tone({ from: 1320, to: 1760, seconds: 0.3, type: 'sine', volume: 0.3, when: 0.09 });
  }

  // A hit: a low thud and a splash of noise.
  hit() {
    this.tone({ from: 160, to: 55, seconds: 0.3, type: 'sawtooth', volume: 0.4 });
    this.noise({ seconds: 0.25, volume: 0.35, frequency: 500 });
  }

  // A level up: a rising three-note arpeggio.
  levelUp() {
    [523, 659, 784].forEach((freq, i) => {
      this.tone({ from: freq, seconds: 0.16, type: 'triangle', volume: 0.35, when: i * 0.09 });
    });
  }

  // A soft click for buttons and the title screen.
  click() {
    this.tone({ from: 660, to: 880, seconds: 0.07, type: 'triangle', volume: 0.3 });
  }

  // Game over: a short descending phrase.
  gameOver() {
    [392, 330, 262, 196].forEach((freq, i) => {
      this.tone({ from: freq, seconds: 0.28, type: 'sine', volume: 0.35, when: i * 0.16 });
    });
  }
}

// The one shared engine. Import it anywhere; it stays silent until unlock().
export const sound = new SoundEngine();
