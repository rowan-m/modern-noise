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
    this.soundscapeTimeout = null;
    this.activeBuffers = [];
    this.activeSoundscapeBuffers = [];
    this.lastSoundscapeIndex = -1;
    this.lastEffectIndex = -1;
    this.audioSources = new Set();
    this.soundscapeGains = new Set();
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
      case "spooky":
        void this.startSpookyNoise(mode.soundscapeUrls, mode.urls, currentGen);
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

  shuffleUrls(urls) {
    if (urls.length <= 1) return [...urls];
    const startOffset = Math.floor(this.randomFn() * urls.length);
    return [...urls.slice(startOffset), ...urls.slice(0, startOffset)];
  }

  partitionCachedUrls(urls, targetBuffers) {
    const uncached = [];
    for (const url of urls) {
      if (this.sampleBufferCache.has(url)) {
        targetBuffers.push(this.sampleBufferCache.get(url));
      } else {
        uncached.push(url);
      }
    }
    return uncached;
  }

  async startSpookyNoise(soundscapeUrls, effectUrls, gen) {
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const soundscapeSet = new Set(soundscapeUrls);
    const uncachedSoundscapes = this.partitionCachedUrls(
      soundscapeUrls,
      this.activeSoundscapeBuffers,
    );
    const uncachedEffects = this.partitionCachedUrls(
      effectUrls,
      this.activeBuffers,
    );

    const state = {
      soundscapeStarted: this.activeSoundscapeBuffers.length > 0,
      effectsStarted: this.activeBuffers.length > 0,
    };

    if (state.soundscapeStarted) {
      this.setLoading(false);
      this.scheduleNextSoundscape(gen);
    }
    if (state.effectsStarted) {
      this.setLoading(false);
      this.scheduleNextSpookyEffect(gen, true);
    }
    if (
      !state.soundscapeStarted &&
      !state.effectsStarted &&
      (uncachedSoundscapes.length > 0 || uncachedEffects.length > 0)
    ) {
      this.setLoading(true);
    }

    const orderedSoundscapes = this.shuffleUrls(uncachedSoundscapes);
    const orderedEffects = this.shuffleUrls(uncachedEffects);
    const orderedQueue = [
      ...orderedSoundscapes.slice(0, 1),
      ...orderedEffects.slice(0, 1),
      ...orderedSoundscapes.slice(1),
      ...orderedEffects.slice(1),
    ];

    if (orderedQueue.length === 0) return;

    await this.decodeSpookyQueue(
      orderedQueue,
      soundscapeSet,
      state,
      signal,
      gen,
    );

    if (
      !signal.aborted &&
      this.generation === gen &&
      !state.soundscapeStarted &&
      !state.effectsStarted
    ) {
      this.setLoading(false);
    }
  }

  async decodeSpookyQueue(orderedQueue, soundscapeSet, state, signal, gen) {
    let cursor = 0;
    const runWorker = async () => {
      while (
        cursor < orderedQueue.length &&
        !signal.aborted &&
        this.generation === gen
      ) {
        const url = orderedQueue.at(cursor);
        cursor += 1;
        if (!url) break;

        const decoded = await this.fetchAndDecodeClip(url, signal);
        if (signal.aborted || this.generation !== gen || !this.isPlaying) {
          return;
        }
        if (decoded) {
          this.handleDecodedSpookyBuffer(
            url,
            decoded,
            soundscapeSet,
            state,
            gen,
          );
        }
      }
    };

    const workerCount = Math.min(DECODE_CONCURRENCY, orderedQueue.length);
    await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  }

  handleDecodedSpookyBuffer(url, decoded, soundscapeSet, state, gen) {
    if (soundscapeSet.has(url)) {
      this.activeSoundscapeBuffers.push(decoded);
      if (!state.soundscapeStarted) {
        state.soundscapeStarted = true;
        this.setLoading(false);
        this.scheduleNextSoundscape(gen);
      }
      return;
    }

    this.activeBuffers.push(decoded);
    if (!state.effectsStarted) {
      state.effectsStarted = true;
      this.setLoading(false);
      this.scheduleNextSpookyEffect(gen, true);
    }
  }

  pickNextIndex(length, lastIndex) {
    if (length <= 1) return 0;
    let index = Math.floor(this.randomFn() * length);
    if (index === lastIndex) {
      index = (index + 1) % length;
    }
    return index;
  }

  scheduleNextSoundscape(gen) {
    if (
      !this.isPlaying ||
      this.generation !== gen ||
      !this.audioContext ||
      this.activeSoundscapeBuffers.length === 0
    ) {
      return;
    }

    const index = this.pickNextIndex(
      this.activeSoundscapeBuffers.length,
      this.lastSoundscapeIndex,
    );
    this.lastSoundscapeIndex = index;
    const audioBuffer = this.activeSoundscapeBuffers.at(index);
    if (!audioBuffer) return;

    const duration = Math.max(1, audioBuffer.duration || 10);
    const fadeTime = Math.min(2.5, duration * 0.25);
    const targetGain = 0.55;
    const now = this.audioContext.currentTime;

    const soundscapeGain = this.audioContext.createGain();
    soundscapeGain.gain.setValueAtTime(0, now);
    soundscapeGain.gain.linearRampToValueAtTime(targetGain, now + fadeTime);
    soundscapeGain.gain.setValueAtTime(
      targetGain,
      Math.max(now + fadeTime, now + duration - fadeTime),
    );
    soundscapeGain.gain.linearRampToValueAtTime(0, now + duration);

    const audioSource = this.audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;

    this.audioSources.add(audioSource);
    this.soundscapeGains.add(soundscapeGain);

    audioSource.onended = () => {
      audioSource.disconnect();
      soundscapeGain.disconnect();
      this.audioSources.delete(audioSource);
      this.soundscapeGains.delete(soundscapeGain);
    };

    audioSource.connect(soundscapeGain);
    soundscapeGain.connect(this.masterGain);
    audioSource.start();

    const nextTransitionMs = Math.max(0.5, duration - fadeTime) * 1000;
    if (this.soundscapeTimeout) {
      clearTimeout(this.soundscapeTimeout);
    }
    this.soundscapeTimeout = setTimeout(() => {
      this.scheduleNextSoundscape(gen);
    }, nextTransitionMs);
  }

  scheduleNextSpookyEffect(gen, isFirst = false) {
    if (!this.isPlaying || this.generation !== gen) return;

    if (isFirst) {
      const initialDelayMs = (this.randomFn() * 2 + 1.5) * 1000;
      if (this.clipTimeout) {
        clearTimeout(this.clipTimeout);
      }
      this.clipTimeout = setTimeout(() => {
        this.scheduleNextSpookyEffect(gen, false);
      }, initialDelayMs);
      return;
    }

    const playedDuration = this.playSpookyEffect();
    const waitSeconds =
      Math.min(Math.max(playedDuration, 1.5), 8) + 3.5 + this.randomFn() * 4.5;
    if (this.clipTimeout) {
      clearTimeout(this.clipTimeout);
    }
    this.clipTimeout = setTimeout(() => {
      this.scheduleNextSpookyEffect(gen, false);
    }, waitSeconds * 1000);
  }

  playSpookyEffect() {
    if (!this.audioContext || this.activeBuffers.length === 0) return 0;

    const index = this.pickNextIndex(
      this.activeBuffers.length,
      this.lastEffectIndex,
    );
    this.lastEffectIndex = index;
    const audioBuffer = this.activeBuffers.at(index);
    if (!audioBuffer) return 0;

    const effectGain = this.audioContext.createGain();
    effectGain.gain.value = 0.85;

    const audioSource = this.audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;
    this.audioSources.add(audioSource);
    this.soundscapeGains.add(effectGain);

    audioSource.onended = () => {
      audioSource.disconnect();
      effectGain.disconnect();
      this.audioSources.delete(audioSource);
      this.soundscapeGains.delete(effectGain);
    };

    audioSource.connect(effectGain);
    effectGain.connect(this.masterGain);
    audioSource.start();
    return audioBuffer.duration || 2;
  }

  stopAndDisconnectNode(node, label) {
    if (!node) return;
    try {
      node.stop();
    } catch (error) {
      console.error(`Error stopping ${label}:`, error);
    }
    node.disconnect();
  }

  clearAllTimers() {
    if (this.beepingTimeout) {
      clearTimeout(this.beepingTimeout);
      this.beepingTimeout = null;
    }
    if (this.clipTimeout) {
      clearTimeout(this.clipTimeout);
      this.clipTimeout = null;
    }
    if (this.soundscapeTimeout) {
      clearTimeout(this.soundscapeTimeout);
      this.soundscapeTimeout = null;
    }
  }

  teardownCurrentNoise() {
    this.generation += 1;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.setLoading(false);

    this.stopAndDisconnectNode(this.noiseNode, "noise node");
    this.noiseNode = null;

    this.trafficFilter?.disconnect();
    this.trafficFilter = null;

    this.trafficRumbleGain?.disconnect();
    this.trafficRumbleGain = null;

    this.stopAndDisconnectNode(this.activeOscillator, "oscillator");
    this.activeOscillator = null;

    this.activeBeepGain?.disconnect();
    this.activeBeepGain = null;

    this.clearAllTimers();

    for (const source of this.audioSources) {
      this.stopAndDisconnectNode(source, "audio source");
    }
    this.audioSources.clear();

    for (const gainNode of this.soundscapeGains) {
      gainNode.disconnect();
    }
    this.soundscapeGains.clear();

    this.activeBuffers = [];
    this.activeSoundscapeBuffers = [];
    this.lastSoundscapeIndex = -1;
    this.lastEffectIndex = -1;
  }
}
