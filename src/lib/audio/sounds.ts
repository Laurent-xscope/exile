// Web Audio API Procedural Sound Engine
// Zero external asset dependencies, low latency, native browser synthesis

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;
  private countdownTicksEnabled: boolean = true;
  private unlocked: boolean = false;

  constructor() {
    this.setupGestureUnlock();
  }

  private setupGestureUnlock() {
    if (typeof window === "undefined") return;

    const unlock = () => {
      if (this.unlocked) return;
      const ctx = this.getContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().then(() => {
          this.unlocked = true;
        }).catch(() => {});
      } else if (ctx && ctx.state === "running") {
        this.unlocked = true;
      }
    };

    const events = ["pointerdown", "keydown", "touchend"];
    const handler = () => {
      unlock();
      events.forEach((evt) => window.removeEventListener(evt, handler));
    };

    events.forEach((evt) => window.addEventListener(evt, handler, { passive: true, once: true }));
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx && this.masterGain) {
      const targetGain = muted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.02);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(volPercent: number) {
    const clamped = Math.max(0, Math.min(100, Number.isFinite(volPercent) ? volPercent : 80));
    this.volume = clamped / 100;
    if (this.ctx && this.masterGain && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  public getVolume(): number {
    return Math.round(this.volume * 100);
  }

  public setCountdownTicks(enabled: boolean) {
    this.countdownTicksEnabled = Boolean(enabled);
  }

  public getCountdownTicks(): boolean {
    return this.countdownTicksEnabled;
  }

  private connectOutput(gainNode: GainNode, ctx: AudioContext) {
    if (this.masterGain) {
      gainNode.connect(this.masterGain);
    } else {
      gainNode.connect(ctx.destination);
    }
  }

  private playTones(
    build: (ctx: AudioContext) => Array<{
      type?: OscillatorType;
      frequency: number;
      startOffset: number;
      duration: number;
      gain: number;
      rampTo?: { freq: number; time: number };
    }>
  ) {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const tones = build(ctx);
      for (const t of tones) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + t.startOffset;

        osc.type = t.type || "sine";
        osc.frequency.setValueAtTime(t.frequency, startTime);
        if (t.rampTo) {
          osc.frequency.exponentialRampToValueAtTime(t.rampTo.freq, startTime + t.rampTo.time);
        }

        gain.gain.setValueAtTime(t.gain, startTime);
        gain.gain.setTargetAtTime(0, startTime + t.duration * 0.4, t.duration * 0.3);

        osc.connect(gain);
        this.connectOutput(gain, ctx);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {}
        };

        osc.start(startTime);
        osc.stop(startTime + t.duration + 0.05);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public playClick() {
    this.playTones(() => [
      {
        type: "sine",
        frequency: 420,
        startOffset: 0,
        duration: 0.04,
        gain: 0.08,
        rampTo: { freq: 180, time: 0.04 },
      },
    ]);
  }

  public playTick() {
    if (!this.countdownTicksEnabled) return;
    this.playTones(() => [
      {
        type: "triangle",
        frequency: 800,
        startOffset: 0,
        duration: 0.03,
        gain: 0.05,
        rampTo: { freq: 400, time: 0.03 },
      },
    ]);
  }

  public playCorrect() {
    this.playTones(() => {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
      return notes.map((freq, idx) => ({
        type: "sine",
        frequency: freq,
        startOffset: idx * 0.06,
        duration: 0.3,
        gain: 0.12,
      }));
    });
  }

  public playIncorrect() {
    this.playTones(() => {
      const notes = [311.13, 261.63]; // Eb4 down to C4
      return notes.map((freq, idx) => ({
        type: "triangle",
        frequency: freq,
        startOffset: idx * 0.12,
        duration: 0.25,
        gain: 0.09,
      }));
    });
  }

  public playStreak(streakCount: number = 3) {
    this.playTones(() => {
      const scale =
        streakCount >= 5
          ? [523.25, 659.25, 783.99, 1046.5, 1318.51] // C5, E5, G5, C6, E6
          : [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      return scale.map((freq, idx) => ({
        type: "triangle",
        frequency: freq,
        startOffset: idx * 0.05,
        duration: 0.35,
        gain: 0.14,
      }));
    });
  }

  public playVictory() {
    this.playTones(() => {
      const chords = [
        [523.25, 659.25, 783.99], // C major
        [587.33, 739.99, 880.0], // D major
        [659.25, 830.61, 987.77], // E major
        [1046.5, 1318.51, 1567.98], // High C major
      ];
      return chords.flatMap((chord, step) => {
        const startOffset = step * 0.14;
        const duration = step === chords.length - 1 ? 0.6 : 0.12;
        return chord.map((freq) => ({
          type: "sine" as OscillatorType,
          frequency: freq,
          startOffset,
          duration,
          gain: 0.08,
        }));
      });
    });
  }
}

export const soundEffects = new SoundEngine();
