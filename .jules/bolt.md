## 2024-05-14 - Cache `AudioBuffer`s to Prevent Main Thread Exhaustion

**Learning:** Avoid repeatedly fetching, decoding, or recalculating `AudioBuffer`s (like large colored noise buffers) on the main thread. Calculating large arrays repeatedly wastes CPU cycles and blocks the main thread, causing unnecessary lag when switching or restarting noise types.
**Action:** Always use a memory cache (e.g., `Map`) to store and reuse `AudioBuffer` objects after they are generated to prevent resource exhaustion and speed up noise rendering.
