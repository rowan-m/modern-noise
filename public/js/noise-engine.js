import { NOISE_MODES } from "./audio-assets.js";
import { brownNoiseBuffer, pinkNoiseBuffer, whiteNoiseBuffer } from "./dsp.js";

const COLOURED_GENERATORS = new Map([
  ["white", whiteNoiseBuffer],
  ["pink", pinkNoiseBuffer],
  ["brown", brownNoiseBuffer],
]);

const BUFFER_DURATION_SECONDS = 10;
const DECODE_CONCURRENCY = 4;

function defaultCreateAudioContext() {
  const ContextClass = window.AudioContext || window.webkitAudioContext;
  return new ContextClass();
}

export class NoiseEngine {
  constructor({
    createAudioContext = defaultCreateAudioContext,
    fetchFn = (url, init) => fetch(url, init),
    randomFn = () => Math.random(),
    onLoadingChange = () => {},
  } = {}) {
    this.createAudioContext = createAudioContext;
    this.fetchFn = fetchFn;
    this.randomFn = randomFn;
    this.onLoadingChange = onLoadingChange;

    this.audioContext = null;
    this.masterGain = null;
    this.compressor = null;
    this.gainLevel = 1;
    this.isPlaying = false;
    this.isLoading = false;
    this.noiseType = "white";

    this.generation = 0;
    this.abortController = null;
    this.colouredBufferCache = new Map();
    this.sampleBufferCache = new Map();

    this.noiseNode = null;
    this.trafficFilter = null;
    this.trafficRumbleGain = null;
    this.activeOscillator = null;
    this.activeBeepGain = null;
    this.beepingTimeout = null;
    this.clipTimeout = null;
    this.activeBuffers = [];
    this.audioSources = new Set();
  }

  setLoading(loading) {
    if (this.isLoading === loading) return;
    this.isLoading = loading;
    this.onLoadingChange(loading);
  }

  ensureAudioGraph() {
    if (!this.audioContext) {
      this.audioContext = this.createAudioContext();
    }

    if (
      this.audioContext.state === "suspended" ||
      this.audioContext.state === "interrupted"
    ) {
      this.audioContext.resume?.().catch((error) => {
        console.error("Error resuming AudioContext:", error);
      });
    }

    if (!this.compressor) {
      this.compressor = this.audioContext.createDynamicsCompressor();
      this.compressor.threshold.value = -6;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;
      this.compressor.connect(this.audioContext.destination);
    }

    if (!this.masterGain) {
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.compressor);
    }
  }

  start() {
    if (this.isPlaying) return false;

    this.ensureAudioGraph();
    const now = this.audioContext.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(this.gainLevel, now + 1);

    this.isPlaying = true;
    this.buildCurrentNoise();
    return true;
  }

  stop() {
    if (!this.isPlaying) return false;

    this.isPlaying = false;
    if (this.masterGain && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(0, now);
      this.masterGain.gain.value = 0;
    }

    this.teardownCurrentNoise();
    return true;
  }

  setVolume(level) {
    const parsed = Number(level);
    if (Number.isNaN(parsed)) return;

    this.gainLevel = Math.max(0, Math.min(2, parsed));
    if (this.isPlaying && this.masterGain && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.setTargetAtTime(this.gainLevel, now, 0.05);
    }
  }

  setNoiseType(newNoiseType) {
    if (!NOISE_MODES.has(newNoiseType)) {
      throw new RangeError(`Unknown noise type: ${newNoiseType}`);
    }
    if (newNoiseType === this.noiseType) return false;

    this.noiseType = newNoiseType;
    if (this.isPlaying) {
      const now = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(0, now);
      this.masterGain.gain.linearRampToValueAtTime(this.gainLevel, now + 0.5);
      this.buildCurrentNoise();
    }
    return true;
  }

  buildCurrentNoise() {
    this.teardownCurrentNoise();
    const currentGen = this.generation;
    const mode = NOISE_MODES.get(this.noiseType);
    if (!mode) return;

    switch (mode.kind) {
      case "coloured":
        this.startColouredNoise(mode.id);
        break;
      case "sampled":
        void this.startSampledNoise(mode.urls, currentGen);
        break;
      case "traffic":
        this.startTrafficRumble();
        void this.startSampledNoise(mode.urls, currentGen);
        break;
      case "beeping":
        this.startBeepingNoise(currentGen);
        break;
    }
  }

  getOrCreateColouredBuffer(colourId) {
    const sampleRate = this.audioContext.sampleRate;
    const cached = this.colouredBufferCache.get(colourId);
    if (cached && cached.sampleRate === sampleRate) {
      return cached.buffer;
    }

    const generator = COLOURED_GENERATORS.get(colourId);
    const bufferSize = sampleRate * BUFFER_DURATION_SECONDS;
    const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
    const output = buffer.getChannelData(0);
    generator(bufferSize, output);

    this.colouredBufferCache.set(colourId, { sampleRate, buffer });
    return buffer;
  }

  startColouredNoise(colourId) {
    const noiseBuffer = this.getOrCreateColouredBuffer(colourId);
    this.noiseNode = this.audioContext.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;
    this.noiseNode.connect(this.masterGain);
    this.noiseNode.start();
  }

  startTrafficRumble() {
    const pinkBuffer = this.getOrCreateColouredBuffer("pink");

    this.trafficFilter = this.audioContext.createBiquadFilter();
    this.trafficFilter.type = "lowpass";
    this.trafficFilter.frequency.value = 200;

    this.trafficRumbleGain = this.audioContext.createGain();
    this.trafficRumbleGain.gain.value = 1.5;

    this.noiseNode = this.audioContext.createBufferSource();
    this.noiseNode.buffer = pinkBuffer;
    this.noiseNode.loop = true;
    this.noiseNode.connect(this.trafficFilter);
    this.trafficFilter.connect(this.trafficRumbleGain);
    this.trafficRumbleGain.connect(this.masterGain);
    this.noiseNode.start();
  }

  startBeepingNoise(gen) {
    if (!this.isPlaying || this.generation !== gen) return;

    const oscillator = this.audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = 2400;

    const beepGain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;
    const beepInterval = 0.2;
    const rampTime = 0.01;

    beepGain.gain.setValueAtTime(0, now);
    beepGain.gain.linearRampToValueAtTime(1, now + rampTime);
    beepGain.gain.linearRampToValueAtTime(0, now + beepInterval);

    oscillator.connect(beepGain);
    beepGain.connect(this.masterGain);

    this.activeOscillator = oscillator;
    this.activeBeepGain = beepGain;

    oscillator.onended = () => {
      oscillator.disconnect();
      beepGain.disconnect();
      if (this.activeOscillator === oscillator) {
        this.activeOscillator = null;
        this.activeBeepGain = null;
      }
    };

    oscillator.start(now);
    oscillator.stop(now + beepInterval + 0.1);

    if (this.beepingTimeout) {
      clearTimeout(this.beepingTimeout);
    }
    this.beepingTimeout = setTimeout(() => {
      this.startBeepingNoise(gen);
    }, beepInterval * 3000);
  }

  async startSampledNoise(urls, gen) {
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const uncachedUrls = [];
    for (const url of urls) {
      if (this.sampleBufferCache.has(url)) {
        this.activeBuffers.push(this.sampleBufferCache.get(url));
      } else {
        uncachedUrls.push(url);
      }
    }

    let loopStarted = false;
    if (this.activeBuffers.length > 0) {
      loopStarted = true;
      this.setLoading(false);
      this.scheduleNextClip(gen);
    } else if (uncachedUrls.length > 0) {
      this.setLoading(true);
    }

    if (uncachedUrls.length === 0) return;

    const startOffset = Math.floor(this.randomFn() * uncachedUrls.length);
    const orderedUrls = [
      ...uncachedUrls.slice(startOffset),
      ...uncachedUrls.slice(0, startOffset),
    ];

    let cursor = 0;
    const runWorker = async () => {
      while (
        cursor < orderedUrls.length &&
        !signal.aborted &&
        this.generation === gen
      ) {
        const url = orderedUrls.at(cursor);
        cursor += 1;
        if (!url) break;

        const decoded = await this.fetchAndDecodeClip(url, signal);
        if (signal.aborted || this.generation !== gen || !this.isPlaying) {
          return;
        }
        if (decoded) {
          this.activeBuffers.push(decoded);
          if (!loopStarted) {
            loopStarted = true;
            this.setLoading(false);
            this.scheduleNextClip(gen);
          }
        }
      }
    };

    const workerCount = Math.min(DECODE_CONCURRENCY, orderedUrls.length);
    await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

    if (!signal.aborted && this.generation === gen && !loopStarted) {
      this.setLoading(false);
    }
  }

  async fetchAndDecodeClip(url, signal) {
    if (this.sampleBufferCache.has(url)) {
      return this.sampleBufferCache.get(url);
    }
    try {
      const response = await this.fetchFn(url, { signal });
      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} ${response.statusText || ""}`.trim(),
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      if (signal.aborted) return null;

      const decoded = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sampleBufferCache.set(url, decoded);
      return decoded;
    } catch (error) {
      if (error?.name === "AbortError" || signal.aborted) {
        return null;
      }
      console.error(`Error loading audio clip from ${url}:`, error);
      return null;
    }
  }

  scheduleNextClip(gen) {
    if (!this.isPlaying || this.generation !== gen) return;

    this.playRandomClip();
    const nextIntervalMs = (this.randomFn() * 0.5 + 1) * 1000;
    if (this.clipTimeout) {
      clearTimeout(this.clipTimeout);
    }
    this.clipTimeout = setTimeout(() => {
      this.scheduleNextClip(gen);
    }, nextIntervalMs);
  }

  playRandomClip() {
    if (!this.audioContext || this.activeBuffers.length === 0) return;

    const randomIndex = Math.floor(this.randomFn() * this.activeBuffers.length);
    const audioBuffer = this.activeBuffers.at(randomIndex);
    if (!audioBuffer) return;

    const audioSource = this.audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;
    this.audioSources.add(audioSource);

    audioSource.onended = () => {
      audioSource.disconnect();
      this.audioSources.delete(audioSource);
    };

    audioSource.connect(this.masterGain);
    audioSource.start();
  }

  teardownCurrentNoise() {
    this.generation += 1;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.setLoading(false);

    if (this.noiseNode) {
      try {
        this.noiseNode.stop();
      } catch (error) {
        console.error("Error stopping noise node:", error);
      }
      this.noiseNode.disconnect();
      this.noiseNode = null;
    }

    if (this.trafficFilter) {
      this.trafficFilter.disconnect();
      this.trafficFilter = null;
    }

    if (this.trafficRumbleGain) {
      this.trafficRumbleGain.disconnect();
      this.trafficRumbleGain = null;
    }

    if (this.activeOscillator) {
      try {
        this.activeOscillator.stop();
      } catch (error) {
        console.error("Error stopping oscillator:", error);
      }
      this.activeOscillator.disconnect();
      this.activeOscillator = null;
    }

    if (this.activeBeepGain) {
      this.activeBeepGain.disconnect();
      this.activeBeepGain = null;
    }

    if (this.beepingTimeout) {
      clearTimeout(this.beepingTimeout);
      this.beepingTimeout = null;
    }

    if (this.clipTimeout) {
      clearTimeout(this.clipTimeout);
      this.clipTimeout = null;
    }

    for (const source of this.audioSources) {
      try {
        source.stop();
      } catch (error) {
        console.error("Error stopping audio source:", error);
      }
      source.disconnect();
    }
    this.audioSources.clear();
    this.activeBuffers = [];
  }
}
