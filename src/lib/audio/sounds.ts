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

  // Soft click for tactile button press
  public playClick() {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.setTargetAtTime(0, ctx.currentTime + 0.01, 0.015);

      osc.connect(gain);
      this.connectOutput(gain, ctx);

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {}
      };

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Countdown timer tick (woodblock rhythm)
  public playTick() {
    if (this.isMuted || !this.countdownTicksEnabled || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.setTargetAtTime(0, ctx.currentTime + 0.01, 0.01);

      osc.connect(gain);
      this.connectOutput(gain, ctx);

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {}
      };

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }

  // Celebratory correct answer chime (harmonic overtone)
  public playCorrect() {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.06;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.setTargetAtTime(0, startTime + 0.08, 0.08);

        osc.connect(gain);
        this.connectOutput(gain, ctx);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {}
        };

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch {}
  }

  // Gentle feedback for incorrect choice
  public playIncorrect() {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [311.13, 261.63]; // Eb4 down to C4
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.12;

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.09, startTime);
        gain.gain.setTargetAtTime(0, startTime + 0.06, 0.08);

        osc.connect(gain);
        this.connectOutput(gain, ctx);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {}
        };

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } catch {}
  }

  // Streak celebration fanfare based on streak count
  public playStreak(streakCount: number = 3) {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const scale = streakCount >= 5
        ? [523.25, 659.25, 783.99, 1046.5, 1318.51] // C5, E5, G5, C6, E6
        : [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      scale.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.05;

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.14, startTime);
        gain.gain.setTargetAtTime(0, startTime + 0.1, 0.09);

        osc.connect(gain);
        this.connectOutput(gain, ctx);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {}
        };

        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch {}
  }

  // Victory fanfare for leaderboard / game completion
  public playVictory() {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const chords = [
        [523.25, 659.25, 783.99], // C major
        [587.33, 739.99, 880.0],  // D major
        [659.25, 830.61, 987.77], // E major
        [1046.5, 1318.51, 1567.98], // High C major
      ];

      chords.forEach((chord, step) => {
        const startTime = ctx.currentTime + step * 0.14;
        const duration = step === chords.length - 1 ? 0.6 : 0.12;

        chord.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.08, startTime);
          gain.gain.setTargetAtTime(0, startTime + duration * 0.5, duration * 0.3);

          osc.connect(gain);
          this.connectOutput(gain, ctx);

          osc.onended = () => {
            try {
              osc.disconnect();
              gain.disconnect();
            } catch {}
          };

          osc.start(startTime);
          osc.stop(startTime + duration + 0.05);
        });
      });
    } catch {}
  }
}

export const soundEffects = new SoundEngine();
