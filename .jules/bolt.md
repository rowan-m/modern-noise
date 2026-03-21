## 2024-05-15 - Caching audio buffers to prevent repetitive fetch and decoding overhead

**Learning:** Recalculating colored noise buffers and re-fetching audio buffers repeatedly on the main thread is an anti-pattern. AudioBuffers should be generated once, decoded once, and cached (using a Map, e.g. `audioBufferCache`) for reuse to avoid blocking the main thread and draining resources.
**Action:** Always employ a cache (`Map`) for expensive generated objects like `AudioBuffer` so they can be re-used when switching contexts or types across events.
