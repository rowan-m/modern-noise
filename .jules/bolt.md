## 2024-05-14 - Optimize typed array iteration

**Learning:** Iterating over large typed arrays (e.g. `Float32Array`) using `.forEach()` can be significantly slower than a traditional `for` loop. Benchmarks showed a `for` loop executing in ~950ms vs ~11s for `.forEach()` over 1000 iterations of a 480k element array.
**Action:** Use standard `for` loops for large typed arrays in audio processing paths instead of `.forEach()` to optimize execution time.
