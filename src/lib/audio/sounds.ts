// Web Audio API Procedural Sound Engine
// Zero external asset dependencies, low latency, native browser synthesis

export class SoundEngine {
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

  /**
   * Crisp, subtle mechanical camera shutter click (~0.08s).
   * Generates two fast micro-impulses with bandpass-filtered noise
   * and a high-frequency transient burst.
   */
  public playCameraShutter() {
    if (typeof window === "undefined" || this.isMuted || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const sampleRate = ctx.sampleRate || 44100;
      const duration = 0.08;

      if (
        typeof ctx.createBuffer === "function" &&
        typeof ctx.createBufferSource === "function" &&
        typeof ctx.createBiquadFilter === "function"
      ) {
        // High fidelity procedural noise synthesis for mechanical shutter action
        const frameCount = Math.floor(sampleRate * duration);
        const noiseBuffer = ctx.createBuffer(1, frameCount, sampleRate);
        const channelData = noiseBuffer.getChannelData(0);

        for (let i = 0; i < frameCount; i++) {
          const t = i / sampleRate;
          let envelope = 0;

          // Micro-impulse 1: shutter blade forward (0 to 14ms)
          if (t < 0.014) {
            envelope = Math.exp(-t / 0.003) * 0.45;
          }
          // Micro-impulse 2: shutter blade release (34ms to 75ms)
          else if (t >= 0.034 && t < 0.075) {
            const dt = t - 0.034;
            envelope = Math.exp(-dt / 0.006) * 0.65;
          }

          channelData[i] = (Math.random() * 2 - 1) * envelope;
        }

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        // Bandpass filter to shape crisp mechanical timbre
        const bandpass = ctx.createBiquadFilter();
        bandpass.type = "bandpass";
        bandpass.frequency.setValueAtTime(2600, now);
        bandpass.Q.setValueAtTime(2.2, now);

        // High-frequency transient burst for tactile click definition
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        clickOsc.type = "triangle";
        clickOsc.frequency.setValueAtTime(1600, now);
        clickOsc.frequency.exponentialRampToValueAtTime(320, now + 0.02);

        clickGain.gain.setValueAtTime(0.08, now);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

        const shutterGain = ctx.createGain();
        shutterGain.gain.setValueAtTime(0.35, now);

        noiseSource.connect(bandpass);
        bandpass.connect(shutterGain);
        clickOsc.connect(clickGain);
        clickGain.connect(shutterGain);

        this.connectOutput(shutterGain, ctx);

        noiseSource.start(now);
        noiseSource.stop(now + duration);
        clickOsc.start(now);
        clickOsc.stop(now + 0.025);

        noiseSource.onended = () => {
          try {
            noiseSource.disconnect();
            bandpass.disconnect();
            clickOsc.disconnect();
            clickGain.disconnect();
            shutterGain.disconnect();
          } catch {}
        };
      } else {
        // Fallback for minimal contexts: two fast micro-burst tones
        this.playTones(() => [
          {
            type: "triangle",
            frequency: 1800,
            startOffset: 0,
            duration: 0.02,
            gain: 0.12,
            rampTo: { freq: 400, time: 0.015 },
          },
          {
            type: "triangle",
            frequency: 2200,
            startOffset: 0.035,
            duration: 0.035,
            gain: 0.15,
            rampTo: { freq: 500, time: 0.025 },
          },
        ]);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Pleasant two-tone completion chime (~0.18s).
   * Generates a warm rising harmonic ramp followed by a dual harmonic chime.
   */
  public playScanComplete() {
    if (typeof window === "undefined" || this.isMuted || this.volume <= 0) return;
    this.playTones(() => [
      // First tone: warm rising harmonic ramp
      {
        type: "sine",
        frequency: 587.33, // D5
        startOffset: 0,
        duration: 0.12,
        gain: 0.12,
        rampTo: { freq: 783.99, time: 0.06 }, // ramp up to G5
      },
      // Second tone: harmonious resolution chime (~0.18s)
      {
        type: "sine",
        frequency: 1046.5, // C6
        startOffset: 0.065,
        duration: 0.18,
        gain: 0.15,
      },
      // Dual harmonic companion: crisp bell overtone
      {
        type: "sine",
        frequency: 1567.98, // G6 overtone
        startOffset: 0.065,
        duration: 0.15,
        gain: 0.05,
      },
    ]);
  }
}

export const soundEffects = new SoundEngine();
