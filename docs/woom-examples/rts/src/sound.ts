/**
 * EXAMPLES/rts — sound.ts — §6 procedural audio (zero assets).
 *
 * A tiny WebAudio synth: oscillator + gain envelope, per-sound throttle
 * gate so a burst of events doesn't machine-gun. Driven by real kernel
 * events (Cavewright law: the world only makes sound for things that
 * actually happened). Mute persists in localStorage; the AudioContext is
 * created lazily and resumed on the first user gesture (autoplay policy).
 */

import type { GameEvent } from '../../../kernel/src/events.js';

type Wave = 'sine' | 'square' | 'triangle';

export class Sound {
  private ctx: AudioContext | null = null;
  private muted: boolean;
  private readonly last: Record<string, number> = {};

  constructor() {
    this.muted = localStorage.getItem('overseer.muted') === '1';
    // Resume/create on first gesture — required by browser autoplay policy.
    const kick = () => this.ensure();
    addEventListener('pointerdown', kick, { once: true });
    addEventListener('keydown', kick, { once: true });
  }

  get isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem('overseer.muted', this.muted ? '1' : '0');
    return this.muted;
  }

  private ensure(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private beep(freq: number, dur: number, type: Wave, vol: number, slide = 0): void {
    if (this.muted) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private gate(key: string, gapMs: number): boolean {
    const now = performance.now();
    if (now - (this.last[key] ?? 0) < gapMs) return false;
    this.last[key] = now;
    return true;
  }

  /** One kernel event → at most one sound (throttled per kind). */
  on(e: GameEvent): void {
    switch (e.type) {
      case 'hero_summoned':
        this.chord([523, 659, 784], 0.16); // rising triad
        break;
      case 'item_touched':
        if (this.gate('touch', 60)) this.beep(180, 0.06, 'square', 0.05);
        break;
      case 'error_raised':
        if (this.gate('error', 120)) this.beep(110, 0.2, 'square', 0.06, -40);
        break;
      case 'command_issued':
        this.beep(740, 0.09, 'sine', 0.06);
        break;
      case 'unit_finished':
        if (this.gate('finish', 100)) this.beep(880, 0.25, 'sine', 0.05);
        break;
      case 'object_made':
        this.chord(e.objectKind === 'monument' ? [392, 587, 784] : [440, 660], 0.18);
        break;
      default:
        break;
    }
  }

  /** UI click (selection). */
  click(): void {
    if (this.gate('click', 30)) this.beep(320, 0.04, 'triangle', 0.04);
  }

  private chord(freqs: number[], dur: number): void {
    freqs.forEach((f, i) => setTimeout(() => this.beep(f, dur, 'sine', 0.05), i * 60));
  }
}
