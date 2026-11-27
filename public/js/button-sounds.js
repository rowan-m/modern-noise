import { BUTTON_SOUND_URL } from "./audio-assets.js";

const DEFAULT_VOLUME = 0.5;
const PRESS_DURATION_SEC = 0.19;
const RELEASE_DURATION_SEC = 0.79;
const SAMPLE_COUNT = 6;

export const BUTTON_SOUND_SPRITES = Object.freeze({
  press: Object.freeze(
    Array.from({ length: SAMPLE_COUNT }, (_, index) =>
      Object.freeze({
        offset: index + 1,
        duration: PRESS_DURATION_SEC,
      }),
    ),
  ),
  release: Object.freeze(
    Array.from({ length: SAMPLE_COUNT }, (_, index) =>
      Object.freeze({
        offset: index + 1.2,
        duration: RELEASE_DURATION_SEC,
      }),
    ),
  ),
});

function defaultCreateAudioContext() {
  if (typeof window === "undefined") return null;
  const ContextClass = window.AudioContext || window.webkitAudioContext;
  return ContextClass ? new ContextClass() : null;
}

export class ButtonSoundPlayer {
  constructor({
    url = BUTTON_SOUND_URL,
    volume = DEFAULT_VOLUME,
    sprites = BUTTON_SOUND_SPRITES,
    createAudioContext = defaultCreateAudioContext,
    fetchFn = (resource, init) => fetch(resource, init),
    randomFn = () => Math.random(),
  } = {}) {
    this.url = url;
    const parsedVolume = Number(volume);
    this.volume = Number.isNaN(parsedVolume)
      ? DEFAULT_VOLUME
      : Math.max(0, Math.min(1, parsedVolume));
    this.sprites = sprites;
    this.createAudioContext = createAudioContext;
    this.fetchFn = fetchFn;
    this.randomFn = randomFn;

    this.audioContext = null;
    this.gainNode = null;
    this.rawAudioPromise = null;
    this.decodePromise = null;
    this.buffer = null;
    this.lastPlayedIndex = { press: -1, release: -1 };
  }

  preload() {
    if (this.buffer) return Promise.resolve(null);
    if (!this.rawAudioPromise) {
      this.rawAudioPromise = this.fetchRawAudio();
    }
    return this.rawAudioPromise;
  }

  async fetchRawAudio() {
    try {
      const response = await this.fetchFn(this.url);
      if (!response?.ok) {
        throw new Error(
          `HTTP ${response?.status ?? "error"} ${response?.statusText || ""}`.trim(),
        );
      }
      return await response.arrayBuffer();
    } catch {
      this.rawAudioPromise = null;
      return null;
    }
  }

  ensureAudioContext() {
    if (!this.audioContext) {
      try {
        this.audioContext = this.createAudioContext();
      } catch {
        return null;
      }
    }
    if (!this.audioContext) return null;

    if (!this.gainNode) {
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;
      this.gainNode.connect(this.audioContext.destination);
    }
    return this.audioContext;
  }

  async ensureReadyContext() {
    const ctx = this.ensureAudioContext();
    if (!ctx) return null;

    if (ctx.state === "suspended" || ctx.state === "interrupted") {
      try {
        await ctx.resume?.();
      } catch {
        return null;
      }
    }
    if (ctx.state === "suspended" || ctx.state === "interrupted") {
      return null;
    }
    return ctx;
  }

  ensureDecoded(ctx) {
    if (this.buffer) return Promise.resolve(this.buffer);
    if (!this.decodePromise) {
      this.decodePromise = this.decodeRawAudio(ctx);
    }
    return this.decodePromise;
  }

  async decodeRawAudio(ctx) {
    try {
      const rawBytes = await this.preload();
      if (!rawBytes) {
        this.decodePromise = null;
        return null;
      }
      const bytes =
        typeof rawBytes.slice === "function" ? rawBytes.slice(0) : rawBytes;
      const decoded = await ctx.decodeAudioData(bytes);
      if (!decoded) {
        this.decodePromise = null;
        return null;
      }
      this.buffer = decoded;
      this.rawAudioPromise = null;
      return decoded;
    } catch {
      this.decodePromise = null;
      return null;
    }
  }

  pickSlice(variant) {
    const slices =
      variant === "release" ? this.sprites.release : this.sprites.press;
    if (!Array.isArray(slices) || slices.length === 0) return null;

    const lastKey = variant === "release" ? "release" : "press";
    const lastIndex =
      lastKey === "release"
        ? this.lastPlayedIndex.release
        : this.lastPlayedIndex.press;

    let index = Math.floor(this.randomFn() * slices.length);
    if (slices.length > 1 && index === lastIndex) {
      index = (index + 1) % slices.length;
    }
    if (lastKey === "release") {
      this.lastPlayedIndex.release = index;
    } else {
      this.lastPlayedIndex.press = index;
    }

    return slices.at(index) ?? null;
  }

  startSlice(ctx, buffer, slice) {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.onended = () => {
      source.disconnect();
    };
    source.connect(this.gainNode);
    source.start(0, slice.offset, slice.duration);
  }

  trigger(variant) {
    const slice = this.pickSlice(variant);
    if (!slice) return;

    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    const isRunning = ctx.state !== "suspended" && ctx.state !== "interrupted";
    if (this.buffer && isRunning) {
      this.startSlice(ctx, this.buffer, slice);
      return;
    }

    const resumePromise = isRunning
      ? Promise.resolve(ctx)
      : this.ensureReadyContext();

    void Promise.all([resumePromise, this.ensureDecoded(ctx)])
      .then(([readyCtx, buffer]) => {
        if (!readyCtx || !buffer) return;
        this.startSlice(readyCtx, buffer, slice);
      })
      .catch(() => {
        // Button sounds are progressive enhancement.
      });
  }

  press() {
    this.trigger("press");
  }

  release() {
    this.trigger("release");
  }
}

function attachPointerListeners(element, player, win, cleanups) {
  const pendingCleanups = new Set();

  const handlePointerDown = (event) => {
    if (typeof event.button === "number" && event.button !== 0) return;
    player.press();

    const pointerId = event.pointerId;
    const clearPending = () => {
      win.removeEventListener("pointerup", handlePointerUp);
      win.removeEventListener("pointercancel", handlePointerCancel);
      pendingCleanups.delete(clearPending);
    };

    const isMatchingPointer = (nextEvent) =>
      pointerId === undefined ||
      nextEvent.pointerId === undefined ||
      nextEvent.pointerId === pointerId;

    const handlePointerUp = (upEvent) => {
      if (!isMatchingPointer(upEvent)) return;
      clearPending();
      player.release();
    };

    const handlePointerCancel = (cancelEvent) => {
      if (!isMatchingPointer(cancelEvent)) return;
      clearPending();
    };

    pendingCleanups.add(clearPending);
    win.addEventListener("pointerup", handlePointerUp);
    win.addEventListener("pointercancel", handlePointerCancel);
  };

  element.addEventListener("pointerdown", handlePointerDown);
  cleanups.push(() => {
    element.removeEventListener("pointerdown", handlePointerDown);
    for (const clearPending of Array.from(pendingCleanups)) {
      clearPending();
    }
  });
}

function attachKeyboardListeners(element, player, win, cleanups) {
  const pendingByKey = new Map();

  const handleKeyDown = (event) => {
    if (
      (event.key !== "Enter" && event.key !== " ") ||
      event.repeat ||
      pendingByKey.has(event.key)
    ) {
      return;
    }
    player.press();

    const activeKey = event.key;
    const clearPending = () => {
      win.removeEventListener("keyup", handleKeyUp);
      element.removeEventListener("blur", clearPending);
      pendingByKey.delete(activeKey);
    };

    const handleKeyUp = (upEvent) => {
      if (upEvent.key !== activeKey) return;
      clearPending();
      player.release();
    };

    pendingByKey.set(activeKey, clearPending);
    win.addEventListener("keyup", handleKeyUp);
    element.addEventListener("blur", clearPending);
  };

  element.addEventListener("keydown", handleKeyDown);
  cleanups.push(() => {
    element.removeEventListener("keydown", handleKeyDown);
    for (const clearPending of Array.from(pendingByKey.values())) {
      clearPending();
    }
  });
}

export function wireButtonSounds(elements, player) {
  const list = Array.from(elements ?? []);
  if (list.length === 0) return () => {};

  void player.preload();

  const cleanups = [];
  for (const element of list) {
    const win = element.ownerDocument?.defaultView ?? window;
    attachPointerListeners(element, player, win, cleanups);
    attachKeyboardListeners(element, player, win, cleanups);
  }

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
    cleanups.length = 0;
  };
}
