## 2024-05-14 - AudioBuffer caching anti-pattern

**Learning:** In Web Audio applications, repeatedly fetching and decoding large audio assets (e.g. multiple 10-second clips for screaming or construction noises), or constantly recalculating computationally heavy 10-second typed buffers (pink, white, brown noise) on the main thread is a major performance anti-pattern. AudioContext `createBuffer` and `decodeAudioData` are extremely heavy operations when used frequently.
**Action:** Always maintain a memory cache (`Map()`) of generated or fetched `AudioBuffer`s if they will be re-used when swapping between active noise environments, rather than throwing them out during tear-down.
