// controls.js — keyboard state + gear-shift key handling

export class Controls {
  constructor(car, onShift) {
    this.car = car;
    this.onShift = onShift || (() => {});
    this.keys = new Set();

    window.addEventListener('keydown', (e) => this._keydown(e));
    window.addEventListener('keyup', (e) => this._keyup(e));
    window.addEventListener('blur', () => this.keys.clear());
  }

  _keydown(e) {
    // Avoid interfering with browser shortcuts when a modifier is held
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    this.keys.add(e.code);

    switch (e.code) {
      case 'Digit1': case 'Numpad1': this._shift(1); break;
      case 'Digit2': case 'Numpad2': this._shift(2); break;
      case 'Digit3': case 'Numpad3': this._shift(3); break;
      case 'Digit4': case 'Numpad4': this._shift(4); break;
      case 'Digit5': case 'Numpad5': this._shift(5); break;
      case 'Digit6': case 'Numpad6': this._shift(6); break;
      case 'Digit0': case 'Numpad0': this._shift('N'); break;
      case 'KeyR': this._shift('R'); break;
      case 'KeyN': this._shift('N'); break;
    }

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  }

  _keyup(e) {
    this.keys.delete(e.code);
  }

  _shift(gear) {
    const ok = this.car.requestGear(gear);
    this.onShift(gear, ok);
  }

  has(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  // Reads current input and returns the normalized control frame for Car.update()
  readInput() {
    const throttle = this.has('ArrowUp', 'KeyW') ? 1 : 0;
    const brake = this.has('ArrowDown', 'KeyS') ? 1 : 0;
    const handbrake = this.has('Space');
    let steer = 0;
    if (this.has('ArrowLeft', 'KeyA')) steer -= 1;
    if (this.has('ArrowRight', 'KeyD')) steer += 1;
    return { throttle, brake, handbrake, steer };
  }
}
