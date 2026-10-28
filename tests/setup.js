import { vi } from "vitest";

export class MockAudioContext {
  constructor() {
    this.state = "running";
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.destination = { kind: "destination" };
    this.resume = vi.fn().mockImplementation(() => {
      this.state = "running";
      return Promise.resolve();
    });
    this.decodeAudioData = vi.fn().mockImplementation(() =>
      Promise.resolve({
        duration: 1,
        sampleRate: this.sampleRate,
      }),
    );
  }

  createGain() {
    return {
      gain: {
        value: 1,
        cancelScheduledValues: vi.fn(),
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createDynamicsCompressor() {
    return {
      threshold: { value: -24 },
      knee: { value: 30 },
      ratio: { value: 12 },
      attack: { value: 0.003 },
      release: { value: 0.25 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createBuffer(_channels, length) {
    const channelData = new Float32Array(length);
    return {
      length,
      getChannelData: () => channelData,
    };
  }

  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      onended: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }

  createBiquadFilter() {
    return {
      type: "",
      frequency: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createOscillator() {
    return {
      type: "",
      frequency: { value: 0 },
      onended: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
}

globalThis.AudioContext = MockAudioContext;
globalThis.webkitAudioContext = MockAudioContext;

Object.defineProperty(globalThis.navigator, "mediaSession", {
  configurable: true,
  writable: true,
  value: {
    playbackState: "none",
    metadata: null,
    setActionHandler: vi.fn(),
    setPositionState: vi.fn(),
  },
});

globalThis.MediaMetadata = class {
  constructor(metadata) {
    Object.assign(this, metadata);
  }
};

HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue();
HTMLMediaElement.prototype.pause = vi.fn();
HTMLMediaElement.prototype.load = vi.fn();

globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  statusText: "OK",
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
});
