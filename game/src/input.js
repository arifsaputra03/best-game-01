// LUMEN DRIFT — keyboard and mouse input.
//
// One object owns every control: arrow keys / WASD to steer, the pointer to
// guide the lantern, and edge-triggered "just pressed" actions (start,
// pause, restart, mute) so a held key never fires twice.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    // Keys pressed since the last frame; cleared by endFrame().
    this.pressed = new Set();
    // Pointer in canvas coordinates (the canvas is 1280x720 logical).
    this.pointer = { x: 640, y: 560, down: false, active: false };
    this._onKeyDown = (event) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      if (!this.keys.has(key)) this.pressed.add(key);
      this.keys.add(key);
    };
    this._onKeyUp = (event) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      this.keys.delete(key);
    };
    this._onPointerMove = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * this.canvas.width;
      this.pointer.y = ((event.clientY - rect.top) / rect.height) * this.canvas.height;
      this.pointer.active = true;
    };
    this._onPointerDown = (event) => {
      this._onPointerMove(event);
      this.pointer.down = true;
      this.pressed.add('pointer');
    };
    this._onPointerUp = () => {
      this.pointer.down = false;
    };
    this._onBlur = () => {
      this.keys.clear();
      this.pointer.down = false;
    };
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.canvas.addEventListener('pointermove', this._onPointerMove);
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('blur', this._onBlur);
  }

  // True while the key is held down.
  held(...names) {
    return names.some((name) => this.keys.has(name));
  }

  // True only on the frame the key (or pointer click) went down.
  justPressed(...names) {
    return names.some((name) => this.pressed.has(name));
  }

  // Steering as a unit-ish vector from the keys: x in [-1, 1], y in [-1, 1].
  steerVector() {
    let x = 0;
    let y = 0;
    if (this.held('ArrowLeft', 'a')) x -= 1;
    if (this.held('ArrowRight', 'd')) x += 1;
    if (this.held('ArrowUp', 'w')) y -= 1;
    if (this.held('ArrowDown', 's')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  // Call once per frame, after the game has read the input.
  endFrame() {
    this.pressed.clear();
  }
}
