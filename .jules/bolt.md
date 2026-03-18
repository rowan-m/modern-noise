## 2024-05-24 - AudioBuffer Caching

**Learning:** Re-calculating, fetching, and decoding large `AudioBuffer`s on the main thread every time the user switches noise types leads to resource exhaustion, repeated network requests, and CPU overhead.
**Action:** Always use an in-memory `Map` cache to store and reuse `AudioBuffer` objects across the session.
