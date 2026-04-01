import { test, expect } from "vitest";
import * as noise from "../public/bring-the-noise.js";

test("whiteNoiseBuffer should fill buffer with random values", async () => {
  const bufferSize = 100;
  const output = new Float32Array(bufferSize);
  noise.whiteNoiseBuffer(bufferSize, output);

  let allZero = true;
  for (let i = 0; i < bufferSize; i++) {
    expect(output[i]).toBeGreaterThanOrEqual(-1);
    expect(output[i]).toBeLessThanOrEqual(1);
    if (output[i] !== 0) allZero = false;
  }
  expect(allZero).toBe(false);
});

test("pinkNoiseBuffer should fill buffer", async () => {
  const bufferSize = 100;
  const output = new Float32Array(bufferSize);
  noise.pinkNoiseBuffer(bufferSize, output);

  let allZero = true;
  for (let i = 0; i < bufferSize; i++) {
    if (output[i] !== 0) allZero = false;
  }
  expect(allZero).toBe(false);
});

test("brownNoiseBuffer should fill buffer", async () => {
  const bufferSize = 100;
  const output = new Float32Array(bufferSize);
  noise.brownNoiseBuffer(bufferSize, output);

  let allZero = true;
  for (let i = 0; i < bufferSize; i++) {
    if (output[i] !== 0) allZero = false;
  }
  expect(allZero).toBe(false);
});

test("updateLcd should swap lcd-on and lcd-off classes and update text", async () => {
  document.body.innerHTML = `
    <div class="lcd-text">
      <span class="lcd-on">Initial</span>
      <span class="lcd-off"></span>
    </div>
  `;

  noise.updateLcd("New Text");

  const spans = document.querySelectorAll(".lcd-text span");
  const newOn = Array.from(spans).find((s) => s.classList.contains("lcd-on"));
  const newOff = Array.from(spans).find((s) => s.classList.contains("lcd-off"));

  expect(newOn.textContent).toBe("New Text");
  expect(newOff.textContent).toBe("Initial");
});
