// audio.js — lightweight synthesized engine note, no audio files needed

export class EngineAudio {
  constructor() {
    this.ctx = null;
    this.started = false;
  }

  start() {
    if (this.started) return;
    this.started = true;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'square';

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 800;

    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.0;

    this.osc1.connect(this.filter);
    this.osc2.connect(this.filter);
    this.filter.connect(this.gain);
    this.gain.connect(this.ctx.destination);

    this.osc1.start();
    this.osc2.start();
  }

  update(rpm, throttle, minRpm, maxRpm) {
    if (!this.started || !this.ctx) return;
    const frac = Math.max(0, Math.min(1, (rpm - minRpm) / (maxRpm - minRpm)));
    const baseFreq = 32 + frac * 140;
    const now = this.ctx.currentTime;
    this.osc1.frequency.setTargetAtTime(baseFreq, now, 0.03);
    this.osc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.03);
    this.filter.frequency.setTargetAtTime(400 + frac * 3200, now, 0.05);
    const vol = 0.05 + frac * 0.09 + throttle * 0.03;
    this.gain.gain.setTargetAtTime(vol, now, 0.05);
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
}
