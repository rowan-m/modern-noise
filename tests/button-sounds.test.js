import { afterEach, describe, expect, test, vi } from "vitest";
import {
  BUTTON_SOUND_SPRITES,
  ButtonSoundPlayer,
  wireButtonSounds,
} from "../public/js/button-sounds.js";
import { MockAudioContext } from "./setup.js";

function createTestAudioContext() {
  const ctx = new MockAudioContext();
  ctx.sampleRate = 48000;
  ctx.decodeAudioData = vi.fn().mockResolvedValue({
    duration: 6.5,
    sampleRate: 48000,
  });

  const sources = [];
  const origCreateBufferSource = ctx.createBufferSource.bind(ctx);
  ctx.createBufferSource = vi.fn(() => {
    const source = origCreateBufferSource();
    sources.push(source);
    return source;
  });

  const gains = [];
  const origCreateGain = ctx.createGain.bind(ctx);
  ctx.createGain = vi.fn(() => {
    const gain = origCreateGain();
    gains.push(gain);
    return gain;
  });

  return { ctx, sources, gains };
}

function createOkFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(16)),
  });
}

function flushAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("ButtonSoundPlayer", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  test("defines 6 sd-squelchy press/release sprite pairs matching button-sounds timings", () => {
    expect(BUTTON_SOUND_SPRITES.press).toEqual([
      { offset: 1, duration: 0.19 },
      { offset: 2, duration: 0.19 },
      { offset: 3, duration: 0.19 },
      { offset: 4, duration: 0.19 },
      { offset: 5, duration: 0.19 },
      { offset: 6, duration: 0.19 },
    ]);
    expect(BUTTON_SOUND_SPRITES.release).toEqual([
      { offset: 1.2, duration: 0.79 },
      { offset: 2.2, duration: 0.79 },
      { offset: 3.2, duration: 0.79 },
      { offset: 4.2, duration: 0.79 },
      { offset: 5.2, duration: 0.79 },
      { offset: 6.2, duration: 0.79 },
    ]);
  });

  test("preload fetches the sprite once without eagerly creating an AudioContext", async () => {
    const createAudioContext = vi.fn(() => createTestAudioContext().ctx);
    const fetchFn = createOkFetch();
    const player = new ButtonSoundPlayer({ createAudioContext, fetchFn });

    const first = player.preload();
    const second = player.preload();
    expect(second).toBe(first);
    await first;

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith("/audio/buttons/sd-squelchy.mp3");
    expect(createAudioContext).not.toHaveBeenCalled();
  });

  test("lazily decodes once, routes through a 0.5 gain node, avoids back-to-back repeats, and disconnects on end", async () => {
    const { ctx, sources, gains } = createTestAudioContext();
    const fetchFn = createOkFetch();
    const player = new ButtonSoundPlayer({
      createAudioContext: () => ctx,
      fetchFn,
      randomFn: () => 0,
    });

    await player.preload();
    player.press();
    await flushAsync();

    expect(ctx.decodeAudioData).toHaveBeenCalledTimes(1);
    expect(gains).toHaveLength(1);
    expect(gains[0].gain.value).toBe(0.5);
    expect(gains[0].connect).toHaveBeenCalledWith(ctx.destination);
    expect(sources).toHaveLength(1);
    expect(sources[0].connect).toHaveBeenCalledWith(gains[0]);
    expect(sources[0].start).toHaveBeenCalledWith(0, 1, 0.19);

    sources[0].onended();
    expect(sources[0].disconnect).toHaveBeenCalledTimes(1);

    // Subsequent press runs synchronously and avoids repeating sample 0
    player.press();
    expect(ctx.decodeAudioData).toHaveBeenCalledTimes(1);
    expect(sources).toHaveLength(2);
    expect(sources[1].start).toHaveBeenCalledWith(0, 2, 0.19);

    // Release uses the release sprite table independently
    player.release();
    expect(sources).toHaveLength(3);
    expect(sources[2].start).toHaveBeenCalledWith(0, 1.2, 0.79);
  });

  test("resumes a suspended AudioContext before playback and skips if resume stays suspended", async () => {
    const { ctx, sources } = createTestAudioContext();
    ctx.state = "suspended";
    const player = new ButtonSoundPlayer({
      createAudioContext: () => ctx,
      fetchFn: createOkFetch(),
      randomFn: () => 0,
    });

    player.press();
    await flushAsync();

    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(sources).toHaveLength(1);

    // If resume fails to unlock the context, do not allocate or start nodes
    ctx.state = "suspended";
    ctx.resume.mockImplementation(() => Promise.resolve());
    player.press();
    await flushAsync();
    expect(sources).toHaveLength(1);
  });

  test("degrades silently on fetch errors and retries on later clicks", async () => {
    const { ctx, sources } = createTestAudioContext();
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(16)),
      });

    const player = new ButtonSoundPlayer({
      createAudioContext: () => ctx,
      fetchFn,
      randomFn: () => 0,
    });

    player.press();
    await flushAsync();
    expect(sources).toHaveLength(0);

    player.press();
    await flushAsync();
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(sources).toHaveLength(1);
  });
});

describe("wireButtonSounds", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  test("plays press on primary pointerdown and release on window pointerup, ignoring right-click and stray pointerup", () => {
    document.body.innerHTML = `<button id="btn" type="button">Test</button>`;
    const btn = document.querySelector("#btn");
    const player = {
      preload: vi.fn().mockResolvedValue(null),
      press: vi.fn(),
      release: vi.fn(),
    };

    const unwire = wireButtonSounds([btn], player);
    expect(player.preload).toHaveBeenCalledTimes(1);

    // Stray pointerup does nothing
    window.dispatchEvent(new MouseEvent("pointerup", { button: 0 }));
    expect(player.release).not.toHaveBeenCalled();

    // Right-click is ignored
    btn.dispatchEvent(new MouseEvent("pointerdown", { button: 2 }));
    expect(player.press).not.toHaveBeenCalled();

    // Primary pointerdown + release off-button via window
    btn.dispatchEvent(new MouseEvent("pointerdown", { button: 0 }));
    expect(player.press).toHaveBeenCalledTimes(1);
    expect(player.release).not.toHaveBeenCalled();

    window.dispatchEvent(new MouseEvent("pointerup", { button: 0 }));
    expect(player.release).toHaveBeenCalledTimes(1);

    // A second pointerup without another pointerdown does nothing
    window.dispatchEvent(new MouseEvent("pointerup", { button: 0 }));
    expect(player.release).toHaveBeenCalledTimes(1);

    // pointercancel clears pending release without playing release sound
    btn.dispatchEvent(new MouseEvent("pointerdown", { button: 0 }));
    expect(player.press).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new Event("pointercancel"));
    window.dispatchEvent(new MouseEvent("pointerup", { button: 0 }));
    expect(player.release).toHaveBeenCalledTimes(1);

    unwire();
  });

  test("plays press/release on Enter and Space keydown/keyup, ignoring repeat and cleaning up on unwire", () => {
    document.body.innerHTML = `<button id="btn" type="button">Test</button>`;
    const btn = document.querySelector("#btn");
    const player = {
      preload: vi.fn().mockResolvedValue(null),
      press: vi.fn(),
      release: vi.fn(),
    };

    const unwire = wireButtonSounds([btn], player);

    // Unrelated key does nothing
    btn.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(player.press).not.toHaveBeenCalled();

    // Space key press + ignored repeat + matching keyup
    btn.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    btn.dispatchEvent(new KeyboardEvent("keydown", { key: " ", repeat: true }));
    expect(player.press).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter" }));
    expect(player.release).not.toHaveBeenCalled();

    window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
    expect(player.release).toHaveBeenCalledTimes(1);

    // Unwiring while a key is held removes pending listeners
    btn.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(player.press).toHaveBeenCalledTimes(2);
    unwire();

    window.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter" }));
    expect(player.release).toHaveBeenCalledTimes(1);

    btn.dispatchEvent(new MouseEvent("pointerdown", { button: 0 }));
    expect(player.press).toHaveBeenCalledTimes(2);
  });
});
