/**
 * SoundManager - Web Audio API sound effects
 *
 * Generates sounds programmatically using OscillatorNode + GainNode.
 * No audio files needed.
 */

type SoundName = 'snap' | 'rotate' | 'slide' | 'invalid' | 'complete' | 'undo' | 'select';

class SoundManager {
  private static instance: SoundManager;
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.5;

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private getContext(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  play(sound: SoundName): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    switch (sound) {
      case 'snap':
        this.playTone(ctx, { freq: 800, duration: 0.05, type: 'sine' });
        break;
      case 'rotate':
        this.playSweep(ctx, 400, 600, 0.03);
        break;
      case 'slide':
        this.playTone(ctx, { freq: 300, duration: 0.15, type: 'sine', decay: 0.12 });
        break;
      case 'invalid':
        this.playTone(ctx, { freq: 200, duration: 0.03, type: 'sine', delay: 0 });
        this.playTone(ctx, { freq: 200, duration: 0.03, type: 'sine', delay: 0.06 });
        break;
      case 'complete':
        this.playArpeggio(ctx, [523, 659, 784, 1047], 0.4);
        break;
      case 'undo':
        this.playSweep(ctx, 600, 400, 0.08);
        break;
      case 'select':
        this.playTone(ctx, { freq: 500, duration: 0.02, type: 'sine' });
        break;
    }
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
  }

  toggleMute(): void {
    this.enabled = !this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private playTone(
    ctx: AudioContext,
    opts: { freq: number; duration: number; type: OscillatorType; decay?: number; delay?: number },
  ): void {
    const { freq, duration, type, decay, delay = 0 } = opts;
    const now = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(this.volume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (decay ?? duration));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  private playSweep(ctx: AudioContext, startFreq: number, endFreq: number, duration: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.linearRampToValueAtTime(endFreq, now + duration);
    gain.gain.setValueAtTime(this.volume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  private playArpeggio(ctx: AudioContext, freqs: number[], totalDuration: number): void {
    const noteDuration = totalDuration / freqs.length;
    freqs.forEach((freq, i) => {
      this.playTone(ctx, {
        freq,
        duration: noteDuration,
        type: 'sine',
        decay: noteDuration * 0.8,
        delay: i * noteDuration,
      });
    });
  }
}

export { SoundManager };
export type { SoundName };
