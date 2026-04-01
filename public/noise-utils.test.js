import { test } from "node:test";
import assert from "node:assert";
import { whiteNoiseBuffer } from "./noise-utils.js";

test("whiteNoiseBuffer populates array with values between -1 and 1", () => {
  const bufferSize = 1000;
  const output = new Float32Array(bufferSize);

  whiteNoiseBuffer(bufferSize, output);

  for (let i = 0; i < bufferSize; i++) {
    assert.ok(
      output[i] >= -1 && output[i] <= 1,
      `Value at index ${i} (${output[i]}) is out of range [-1, 1]`,
    );
  }
});

test("whiteNoiseBuffer populates all elements in the array", () => {
  const bufferSize = 100;
  const output = new Float32Array(bufferSize).fill(0);

  whiteNoiseBuffer(bufferSize, output);

  // While theoretically possible all values are 0, with 100 elements it's highly unlikely.
  // A better check is to see if they are no longer all 0.
  const allZeros = Array.from(output).every((val) => val === 0);
  assert.strictEqual(
    allZeros,
    false,
    "Buffer was not populated with random values",
  );
});
