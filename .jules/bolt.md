## 2024-10-23 - Prevent Redundant AudioBuffer Generation
**Learning:** Generating or fetching large `AudioBuffer`s continuously on the main thread causes significant performance overhead and blocks execution.
**Action:** Always employ caching strategies (like `Map`) for storing created or fetched `AudioBuffer` instances to prevent unnecessary generation and reuse them to eliminate performance degradation.
