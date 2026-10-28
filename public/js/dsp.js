const WARMUP_SAMPLES = 2048;
const LOOP_CROSSFADE_SAMPLES = 2048;

function applySeamlessLoopCrossfade(bufferSize, output, nextSampleFn) {
  const fadeSamples = Math.min(
    LOOP_CROSSFADE_SAMPLES,
    Math.floor(bufferSize / 4),
  );
  for (let i = 0; i < fadeSamples; i++) {
    const theta = (i / fadeSamples) * (Math.PI / 2);
    const tailSample = nextSampleFn();
    output[i] = tailSample * Math.cos(theta) + output[i] * Math.sin(theta);
  }
}

export function whiteNoiseBuffer(bufferSize, output) {
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
}

export function pinkNoiseBuffer(bufferSize, output) {
  let b0 = 0.0;
  let b1 = 0.0;
  let b2 = 0.0;
  let b3 = 0.0;
  let b4 = 0.0;
  let b5 = 0.0;
  let b6 = 0.0;

  const nextSample = () => {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const sample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
    return Math.max(-1, Math.min(1, sample));
  };

  for (let i = 0; i < WARMUP_SAMPLES; i++) {
    nextSample();
  }
  for (let i = 0; i < bufferSize; i++) {
    output[i] = nextSample();
  }
  applySeamlessLoopCrossfade(bufferSize, output, nextSample);
}

export function brownNoiseBuffer(bufferSize, output) {
  let lastOut = 0.0;

  const nextSample = () => {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    return Math.max(-1, Math.min(1, lastOut * 3.5));
  };

  for (let i = 0; i < WARMUP_SAMPLES; i++) {
    nextSample();
  }
  for (let i = 0; i < bufferSize; i++) {
    output[i] = nextSample();
  }
  applySeamlessLoopCrossfade(bufferSize, output, nextSample);
}
