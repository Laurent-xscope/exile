import { describe, expect, it } from "bun:test";
import { SoundEngine, soundEffects } from "../sounds";

/**
 * Procedural mock audio param tracking scheduled audio automation curves.
 */
class MockAudioParam {
  public value: number = 0;
  public calls: Array<{ method: string; args: unknown[] }> = [];

  setValueAtTime(val: number, time: number) {
    this.value = val;
    this.calls.push({ method: "setValueAtTime", args: [val, time] });
    return this;
  }

  exponentialRampToValueAtTime(val: number, time: number) {
    this.value = val;
    this.calls.push({ method: "exponentialRampToValueAtTime", args: [val, time] });
    return this;
  }

  setTargetAtTime(target: number, startTime: number, timeConstant: number) {
    this.value = target;
    this.calls.push({ method: "setTargetAtTime", args: [target, startTime, timeConstant] });
    return this;
  }
}

/**
 * Mock Web Audio GainNode.
 */
class MockGainNode {
  public gain = new MockAudioParam();
  public connectedTo: unknown[] = [];
  public disconnected = false;

  connect(target: unknown) {
    this.connectedTo.push(target);
  }

  disconnect() {
    this.disconnected = true;
  }
}

/**
 * Mock Web Audio OscillatorNode.
 */
class MockOscillatorNode {
  public type: OscillatorType = "sine";
  public frequency = new MockAudioParam();
  public connectedTo: unknown[] = [];
  public startedAt: number | null = null;
  public stoppedAt: number | null = null;
  public disconnected = false;
  public onended: (() => void) | null = null;

  connect(target: unknown) {
    this.connectedTo.push(target);
  }

  disconnect() {
    this.disconnected = true;
  }

  start(time: number = 0) {
    this.startedAt = time;
  }

  stop(time: number = 0) {
    this.stoppedAt = time;
  }
}

/**
 * Mock Web Audio BiquadFilterNode.
 */
class MockBiquadFilterNode {
  public type: BiquadFilterType = "lowpass";
  public frequency = new MockAudioParam();
  public Q = new MockAudioParam();
  public connectedTo: unknown[] = [];
  public disconnected = false;

  connect(target: unknown) {
    this.connectedTo.push(target);
  }

  disconnect() {
    this.disconnected = true;
  }
}

/**
 * Mock Web Audio AudioBuffer.
 */
class MockAudioBuffer {
  public sampleRate: number;
  public length: number;
  public numberOfChannels: number;
  private channelData: Float32Array[];

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.channelData = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  getChannelData(channel: number): Float32Array {
    return this.channelData[channel] || new Float32Array(0);
  }
}

/**
 * Mock Web Audio AudioBufferSourceNode.
 */
class MockBufferSourceNode {
  public buffer: MockAudioBuffer | null = null;
  public connectedTo: unknown[] = [];
  public startedAt: number | null = null;
  public stoppedAt: number | null = null;
  public disconnected = false;
  public onended: (() => void) | null = null;

  connect(target: unknown) {
    this.connectedTo.push(target);
  }

  disconnect() {
    this.disconnected = true;
  }

  start(time: number = 0) {
    this.startedAt = time;
  }

  stop(time: number = 0) {
    this.stoppedAt = time;
  }
}

/**
 * Mock Web Audio AudioContext recording all procedural node allocations.
 */
export class MockAudioContext {
  public state: AudioContextState = "running";
  public currentTime = 1.0;
  public sampleRate = 44100;
  public destination = {};

  public createdGains: MockGainNode[] = [];
  public createdOscillators: MockOscillatorNode[] = [];
  public createdFilters: MockBiquadFilterNode[] = [];
  public createdBuffers: MockAudioBuffer[] = [];
  public createdBufferSources: MockBufferSourceNode[] = [];

  createGain(): MockGainNode {
    const gain = new MockGainNode();
    this.createdGains.push(gain);
    return gain;
  }

  createOscillator(): MockOscillatorNode {
    const osc = new MockOscillatorNode();
    this.createdOscillators.push(osc);
    return osc;
  }

  createBiquadFilter(): MockBiquadFilterNode {
    const filter = new MockBiquadFilterNode();
    this.createdFilters.push(filter);
    return filter;
  }

  createBuffer(channels: number, length: number, sampleRate: number): MockAudioBuffer {
    const buffer = new MockAudioBuffer(channels, length, sampleRate);
    this.createdBuffers.push(buffer);
    return buffer;
  }

  createBufferSource(): MockBufferSourceNode {
    const source = new MockBufferSourceNode();
    this.createdBufferSources.push(source);
    return source;
  }

  async resume(): Promise<void> {
    this.state = "running";
  }
}

/**
 * Helper to execute a callback inside a mocked browser Web Audio environment.
 */
function withMockBrowserAudio(
  callback: (mockCtx: MockAudioContext, mockWindow: Record<string, unknown>) => void
) {
  const globalObj = globalThis as unknown as {
    window?: unknown;
    AudioContext?: unknown;
  };

  const originalWindow = globalObj.window;
  const originalAudioCtx = globalObj.AudioContext;

  const mockCtx = new MockAudioContext();
  const mockWindow: Record<string, unknown> = {
    AudioContext: function () {
      return mockCtx;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  globalObj.window = mockWindow;
  globalObj.AudioContext = mockWindow.AudioContext;

  try {
    callback(mockCtx, mockWindow);
  } finally {
    globalObj.window = originalWindow;
    globalObj.AudioContext = originalAudioCtx;
  }
}

describe("SoundEngine SSR safety and initialization", () => {
  it("does not throw in SSR environment when window is undefined", () => {
    // Verify default global singleton works cleanly
    expect(() => soundEffects.playCameraShutter()).not.toThrow();
    expect(() => soundEffects.playScanComplete()).not.toThrow();
    expect(() => soundEffects.playClick()).not.toThrow();
    expect(() => soundEffects.playTick()).not.toThrow();
    expect(() => soundEffects.playCorrect()).not.toThrow();
    expect(() => soundEffects.playIncorrect()).not.toThrow();
    expect(() => soundEffects.playStreak()).not.toThrow();
    expect(() => soundEffects.playVictory()).not.toThrow();

    // Verify fresh class instance works cleanly
    const freshEngine = new SoundEngine();
    expect(() => freshEngine.playCameraShutter()).not.toThrow();
    expect(() => freshEngine.playScanComplete()).not.toThrow();
  });

  it("handles volume clamping and mute getters accurately", () => {
    const engine = new SoundEngine();

    expect(engine.getMuted()).toBe(false);
    expect(engine.getVolume()).toBe(80);

    engine.setMuted(true);
    expect(engine.getMuted()).toBe(true);

    engine.setMuted(false);
    expect(engine.getMuted()).toBe(false);

    engine.setVolume(150);
    expect(engine.getVolume()).toBe(100);

    engine.setVolume(-20);
    expect(engine.getVolume()).toBe(0);

    engine.setVolume(65);
    expect(engine.getVolume()).toBe(65);
  });
});

describe("SoundEngine procedural synthesis in browser environment", () => {
  it("calls playCameraShutter without throwing and generates procedural shutter nodes", () => {
    withMockBrowserAudio((mockCtx) => {
      const engine = new SoundEngine();

      expect(() => engine.playCameraShutter()).not.toThrow();

      // Shutter uses noise buffer, buffer source, bandpass filter, and click oscillator
      expect(mockCtx.createdBuffers.length).toBeGreaterThanOrEqual(1);
      expect(mockCtx.createdBufferSources.length).toBeGreaterThanOrEqual(1);
      expect(mockCtx.createdFilters.length).toBeGreaterThanOrEqual(1);
      expect(mockCtx.createdOscillators.length).toBeGreaterThanOrEqual(1);

      // Verify filter properties (bandpass ~2600Hz)
      const filter = mockCtx.createdFilters[0];
      expect(filter.type).toBe("bandpass");

      // Verify buffer source was started
      const bufferSource = mockCtx.createdBufferSources[0];
      expect(bufferSource.startedAt).not.toBeNull();
      expect(bufferSource.stoppedAt).not.toBeNull();

      // Verify micro-impulse transient click was started
      const clickOsc = mockCtx.createdOscillators[0];
      expect(clickOsc.type).toBe("triangle");
      expect(clickOsc.startedAt).not.toBeNull();
      expect(clickOsc.stoppedAt).not.toBeNull();
    });
  });

  it("calls playScanComplete without throwing and generates dual-tone completion chime", () => {
    withMockBrowserAudio((mockCtx) => {
      const engine = new SoundEngine();

      expect(() => engine.playScanComplete()).not.toThrow();

      // playScanComplete creates three harmonic oscillators (D5-G5 ramp, C6 resolution, G6 overtone)
      expect(mockCtx.createdOscillators.length).toBeGreaterThanOrEqual(2);

      // Verify all oscillators were started and configured with sine wave
      for (const osc of mockCtx.createdOscillators) {
        expect(osc.type).toBe("sine");
        expect(osc.startedAt).not.toBeNull();
        expect(osc.stoppedAt).not.toBeNull();
      }
    });
  });

  it("suppresses audio output when muted state is active", () => {
    withMockBrowserAudio((mockCtx) => {
      const engine = new SoundEngine();

      // Mute the engine
      engine.setMuted(true);
      expect(engine.getMuted()).toBe(true);

      // Clear any nodes created during master gain initialization
      const baselineBufferSources = mockCtx.createdBufferSources.length;
      const baselineOscillators = mockCtx.createdOscillators.length;

      // Invoking shutter sound while muted must NOT create playback nodes
      engine.playCameraShutter();
      expect(mockCtx.createdBufferSources.length).toBe(baselineBufferSources);
      expect(mockCtx.createdOscillators.length).toBe(baselineOscillators);

      // Invoking scan completion while muted must NOT create playback nodes
      engine.playScanComplete();
      expect(mockCtx.createdBufferSources.length).toBe(baselineBufferSources);
      expect(mockCtx.createdOscillators.length).toBe(baselineOscillators);

      // Unmuting must restore audio generation
      engine.setMuted(false);
      expect(engine.getMuted()).toBe(false);

      engine.playScanComplete();
      expect(mockCtx.createdOscillators.length).toBeGreaterThan(baselineOscillators);
    });
  });

  it("suppresses audio output when volume is zero", () => {
    withMockBrowserAudio((mockCtx) => {
      const engine = new SoundEngine();

      engine.setVolume(0);
      expect(engine.getVolume()).toBe(0);

      const baselineBufferSources = mockCtx.createdBufferSources.length;
      const baselineOscillators = mockCtx.createdOscillators.length;

      engine.playCameraShutter();
      engine.playScanComplete();

      expect(mockCtx.createdBufferSources.length).toBe(baselineBufferSources);
      expect(mockCtx.createdOscillators.length).toBe(baselineOscillators);
    });
  });

  it("falls back gracefully when Web Audio API throws internal errors", () => {
    withMockBrowserAudio((mockCtx) => {
      const engine = new SoundEngine();

      // Simulate browser audio context exception (e.g. invalid state)
      mockCtx.createBuffer = () => {
        throw new Error("Simulated Web Audio failure");
      };

      // Shutter should not throw when buffer creation fails
      expect(() => engine.playCameraShutter()).not.toThrow();

      // Scan complete should not throw when oscillator creation fails
      mockCtx.createOscillator = () => {
        throw new Error("Simulated oscillator failure");
      };
      expect(() => engine.playScanComplete()).not.toThrow();
    });
  });
});
