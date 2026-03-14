## 2026-03-14 - Web Audio API Decode Caching
**Learning:** Calling `audioContext.decodeAudioData()` is a highly CPU-intensive operation. Repeatedly fetching and decoding the same audio files on demand can cause significant performance bottlenecks and unnecessary network traffic.
**Action:** Always cache the resulting `AudioBuffer` (or the Promise that resolves to it) when loading audio files. Storing the Promise in a `Map` prevents both redundant network requests and duplicate concurrent decoding operations.
