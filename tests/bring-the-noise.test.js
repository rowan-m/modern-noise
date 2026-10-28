import { beforeEach, expect, test } from "vitest";
import * as noise from "../public/bring-the-noise.js";

function renderAppFixture() {
  document.body.innerHTML = `
    <audio id="audio-source" src="/audio/background.mp3"></audio>
    <section id="lcd-screen">
      <span id="white-icon" class="lcd-icon">⬜</span>
      <span id="pink-icon" class="lcd-icon">🩷</span>
      <span id="brown-icon" class="lcd-icon">🟤</span>
      <span id="screaming-icon" class="lcd-icon">😱</span>
      <span id="building-icon" class="lcd-icon">🚧</span>
      <span id="traffic-icon" class="lcd-icon">🚘</span>
      <span id="beeping-icon" class="lcd-icon">🚨</span>
      <span class="lcd-text">
        <span class="lcd-on">White</span>
        <span class="lcd-off" aria-hidden="true"></span>
      </span>
      <span id="play-icon" class="lcd-icon">▶</span>
    </section>
    <section id="buttons">
      <input id="volume-slider" type="range" min="0" max="2" step="0.01" value="1" />
      <button id="white" class="noise-button">W</button>
      <button id="pink" class="noise-button">P</button>
      <button id="brown" class="noise-button">B</button>
      <button id="screaming" class="noise-button">👄</button>
      <button id="building" class="noise-button">🛠</button>
      <button id="traffic" class="noise-button">🚗</button>
      <button id="beeping" class="noise-button">📟</button>
      <button id="pause" class="noise-button">⏸</button>
      <button id="play" class="noise-button">▶</button>
    </section>
  `;
}

beforeEach(() => {
  document.body.innerHTML = "";
  navigator.mediaSession.metadata = null;
  navigator.mediaSession.playbackState = "none";
});

test("whiteNoiseBuffer, pinkNoiseBuffer, and brownNoiseBuffer produce bounded non-zero samples", () => {
  const bufferSize = 4096;

  for (const generator of [
    noise.whiteNoiseBuffer,
    noise.pinkNoiseBuffer,
    noise.brownNoiseBuffer,
  ]) {
    const output = new Float32Array(bufferSize);
    generator(bufferSize, output);

    let allZero = true;
    for (const sample of output) {
      expect(sample).toBeGreaterThanOrEqual(-1);
      expect(sample).toBeLessThanOrEqual(1);
      if (sample !== 0) allZero = false;
    }
    expect(allZero).toBe(false);
  }
});

test("brownNoiseBuffer crossfades loop boundary smoothly without large DC step", () => {
  const bufferSize = 8192;
  const output = new Float32Array(bufferSize);
  noise.brownNoiseBuffer(bufferSize, output);

  const seamDelta = Math.abs(output[0] - output[bufferSize - 1]);
  expect(seamDelta).toBeLessThan(0.25);
});

test("updateLcd swaps lcd-on and lcd-off classes and toggles aria-hidden", () => {
  document.body.innerHTML = `
    <div class="lcd-text">
      <span class="lcd-on">Initial</span>
      <span class="lcd-off" aria-hidden="true"></span>
    </div>
  `;

  noise.updateLcd("New Text");

  const newOn = document.querySelector(".lcd-text .lcd-on");
  const newOff = document.querySelector(".lcd-text .lcd-off");

  expect(newOn.textContent).toBe("New Text");
  expect(newOn.hasAttribute("aria-hidden")).toBe(false);
  expect(newOff.textContent).toBe("Initial");
  expect(newOff.getAttribute("aria-hidden")).toBe("true");
});

test("initApp populates initial White noise MediaMetadata and updates UI across transport and mode controls", () => {
  renderAppFixture();
  const app = noise.initApp();

  expect(navigator.mediaSession.metadata).not.toBeNull();
  expect(navigator.mediaSession.metadata.title).toBe("White noise");
  expect(navigator.mediaSession.metadata.artist).toBe("Modern noise machine");
  expect(navigator.mediaSession.metadata.artwork).toEqual([
    { src: "/img/white.jpg", sizes: "1024x1024", type: "image/jpeg" },
  ]);
  expect(document.querySelector("#white").getAttribute("aria-pressed")).toBe(
    "true",
  );
  expect(document.querySelector("#pink").getAttribute("aria-pressed")).toBe(
    "false",
  );

  document.querySelector("#play").click();
  expect(app.engine.isPlaying).toBe(true);
  expect(
    document.querySelector("#play-icon").classList.contains("lcd-icon-on"),
  ).toBe(true);
  expect(
    document
      .querySelector("#white-icon")
      .classList.contains("lcd-icon-pulsing"),
  ).toBe(true);
  expect(navigator.mediaSession.playbackState).toBe("playing");

  document.querySelector("#pink").click();
  expect(document.querySelector(".lcd-on").textContent).toBe("Pink");
  expect(navigator.mediaSession.metadata.title).toBe("Pink noise");
  expect(
    document.querySelector("#pink-icon").classList.contains("lcd-icon-pulsing"),
  ).toBe(true);
  expect(
    document
      .querySelector("#white-icon")
      .classList.contains("lcd-icon-pulsing"),
  ).toBe(false);

  document.querySelector("#pause").click();
  expect(app.engine.isPlaying).toBe(false);
  expect(navigator.mediaSession.playbackState).toBe("paused");
});
