import { vi } from "vitest";

global.__TEST_ENVIRONMENT__ = true;

// Mock AudioContext

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.destination = {};
  }
  createGain() {
    return {
      gain: {
        value: 1,
        linearRampToValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  createBuffer(channels, length, sampleRate) {
    return {
      getChannelData: () => new Float32Array(length),
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      loop: false,
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
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  decodeAudioData() {
    return Promise.resolve({});
  }
}

global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// Mock navigator.mediaSession
global.navigator.mediaSession = {
  playbackState: "none",
  metadata: null,
  setActionHandler: vi.fn(),
  setPositionState: vi.fn(),
};

global.MediaMetadata = class {
  constructor(metadata) {
    this.metadata = metadata;
  }
};

// Mock HTMLMediaElement.prototype.play and pause
HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue();
HTMLMediaElement.prototype.pause = vi.fn();
HTMLMediaElement.prototype.load = vi.fn();

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
});
