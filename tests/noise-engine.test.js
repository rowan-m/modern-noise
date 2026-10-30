import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NoiseEngine } from "../public/js/noise-engine.js";
import { MockAudioContext } from "./setup.js";

describe("NoiseEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test("routes masterGain through DynamicsCompressorNode to destination", () => {
    let ctx;
    const engine = new NoiseEngine({
      createAudioContext: () => {
        ctx = new MockAudioContext();
        return ctx;
      },
    });

    expect(engine.start()).toBe(true);
    expect(engine.masterGain.connect).toHaveBeenCalledWith(engine.compressor);
    expect(engine.compressor.connect).toHaveBeenCalledWith(ctx.destination);
    expect(engine.compressor.threshold.value).toBe(-6);
    expect(engine.compressor.ratio.value).toBe(12);
    expect(engine.masterGain.gain.cancelScheduledValues).toHaveBeenCalledWith(
      0,
    );
    expect(engine.masterGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
    expect(engine.masterGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      1,
      1,
    );
  });

  test("resumes suspended AudioContext on start()", () => {
    const ctx = new MockAudioContext();
    ctx.state = "suspended";

    const engine = new NoiseEngine({ createAudioContext: () => ctx });
    engine.start();

    expect(ctx.resume).toHaveBeenCalledTimes(1);
    engine.stop();

    ctx.state = "interrupted";
    engine.start();
    expect(ctx.resume).toHaveBeenCalledTimes(2);
  });

  test("caches coloured noise buffers across pause/resume and Traffic rumble", () => {
    const ctx = new MockAudioContext();
    const createBufferSpy = vi.spyOn(ctx, "createBuffer");
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });

    const engine = new NoiseEngine({
      createAudioContext: () => ctx,
      fetchFn,
    });

    engine.setNoiseType("pink");
    engine.start();
    expect(createBufferSpy).toHaveBeenCalledTimes(1);

    engine.stop();
    engine.start();
    expect(createBufferSpy).toHaveBeenCalledTimes(1);

    // Switching to traffic reuses the cached pink noise buffer for lowpass rumble
    engine.setNoiseType("traffic");
    expect(createBufferSpy).toHaveBeenCalledTimes(1);
    expect(engine.trafficFilter.type).toBe("lowpass");
    expect(engine.trafficFilter.frequency.value).toBe(200);
    expect(engine.trafficRumbleGain.gain.value).toBe(1.5);
  });

  test("skips decodeAudioData on HTTP 404 responses without crashing", async () => {
    const ctx = new MockAudioContext();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchFn = vi.fn().mockImplementation((url) => {
      if (url.includes("wilhelm")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: "Not Found",
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(64)),
      });
    });

    const loadingStates = [];
    const engine = new NoiseEngine({
      createAudioContext: () => ctx,
      fetchFn,
      randomFn: () => 0,
      onLoadingChange: (loading) => loadingStates.push(loading),
    });

    engine.setNoiseType("screaming");
    engine.start();

    await vi.advanceTimersByTimeAsync(0);

    // Only the single 200 OK clip should reach decodeAudioData
    expect(ctx.decodeAudioData).toHaveBeenCalledTimes(1);
    expect(engine.activeBuffers).toHaveLength(1);
    expect(loadingStates).toEqual([true, false]);
    expect(errorSpy).toHaveBeenCalled();

    engine.stop();
  });

  test("starts first clip progressively and cancels stale fetches on rapid mode toggle", async () => {
    const ctx = new MockAudioContext();
    const pendingResolvers = [];

    const fetchFn = vi.fn().mockImplementation(
      (_url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener("abort", () => {
            const abortErr = new Error("Aborted");
            abortErr.name = "AbortError";
            reject(abortErr);
          });
          pendingResolvers.push(() =>
            resolve({
              ok: true,
              status: 200,
              arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
            }),
          );
        }),
    );

    const engine = new NoiseEngine({
      createAudioContext: () => ctx,
      fetchFn,
      randomFn: () => 0,
    });

    const playClipSpy = vi.spyOn(engine, "playRandomClip");

    // Start screaming -> pause -> start screaming again while batch 1 is in flight
    engine.setNoiseType("screaming");
    engine.start();
    const firstSignal = engine.abortController.signal;

    engine.stop();
    expect(firstSignal.aborted).toBe(true);

    engine.start();

    // Resolve just the first clip of the active batch: playback begins immediately
    const activeBatchResolver = pendingResolvers.at(-1);
    activeBatchResolver();
    await vi.advanceTimersByTimeAsync(0);

    expect(playClipSpy).toHaveBeenCalledTimes(1);

    // Advance one schedule interval (1000ms when randomFn returns 0) -> exactly 1 timer firing
    vi.advanceTimersByTime(1000);
    expect(playClipSpy).toHaveBeenCalledTimes(2);

    engine.stop();
  });

  test("stops active beep oscillator immediately when switching modes", () => {
    const ctx = new MockAudioContext();
    const engine = new NoiseEngine({ createAudioContext: () => ctx });

    engine.setNoiseType("beeping");
    engine.start();

    const osc = engine.activeOscillator;
    expect(osc).not.toBeNull();
    expect(osc.start).toHaveBeenCalledTimes(1);

    engine.setNoiseType("white");
    expect(osc.stop).toHaveBeenCalled();
    expect(osc.disconnect).toHaveBeenCalled();
    expect(engine.activeOscillator).toBeNull();
  });

  test("rejects unknown noise types and cancels scheduled gain automation on setVolume()", () => {
    const ctx = new MockAudioContext();
    const engine = new NoiseEngine({ createAudioContext: () => ctx });

    expect(() => engine.setNoiseType("invalid-mode")).toThrow(RangeError);

    engine.start();
    ctx.currentTime = 0.3;
    engine.setVolume(1.6);

    expect(engine.masterGain.gain.cancelScheduledValues).toHaveBeenCalledWith(
      0.3,
    );
    expect(engine.masterGain.gain.setTargetAtTime).toHaveBeenCalledWith(
      1.6,
      0.3,
      0.05,
    );
  });

  test("spooky mode uses generalized sampled playback for background ambience and foreground effects", async () => {
    const ctx = new MockAudioContext();
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });

    const engine = new NoiseEngine({
      createAudioContext: () => ctx,
      fetchFn,
      randomFn: () => 0,
    });

    const playClipSpy = vi.spyOn(engine, "playRandomClip");

    engine.setNoiseType("spooky");
    engine.start();

    await vi.advanceTimersByTimeAsync(0);

    expect(engine.activeBuffers).toHaveLength(39);
    // 1 initial background soundscape + 1 initial foreground effect
    expect(playClipSpy).toHaveBeenCalledTimes(2);

    // Mock AudioBuffer has duration: 1s -> background chains every 1s,
    // while foreground waits duration (1s) + interval [3, 6]s (3s) = 4s
    vi.advanceTimersByTime(3500);
    // 2 initial + 3 background ticks (at 1s, 2s, 3s) = 5 calls
    expect(playClipSpy).toHaveBeenCalledTimes(5);

    vi.advanceTimersByTime(500);
    // At 4s, both the 4th background tick and the 2nd foreground effect fire = 7 calls
    expect(playClipSpy).toHaveBeenCalledTimes(7);

    engine.stop();
  });
});
