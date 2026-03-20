## 2024-05-24 - AudioBuffer Recalculation Anti-Pattern

**Learning:** Repeatedly fetching, decoding, or recalculating `AudioBuffer`s (like large colored noise buffers or audio clips) on the main thread blocks execution and causes severe resource exhaustion.
**Action:** Always use a memory cache (e.g., `Map`) to store and reuse generated or downloaded `AudioBuffer`s, ensuring they are only computed or fetched once per session.
