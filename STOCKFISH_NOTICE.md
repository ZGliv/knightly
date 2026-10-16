# Stockfish distribution

This app distributes unmodified `stockfish-18-lite-single.js` and `stockfish-18-lite-single.wasm` from npm package **stockfish 18.0.5**, by the Stockfish and stockfish.js contributors, under **GNU GPL version 3**. The engine is a separate browser Web Worker accessed through UCI messages.

The complete license is copied from the package to [`/engine/COPYING.txt`](/engine/COPYING.txt) during build. The app footer links the license and corresponding source/build instructions next to the engine attribution.

Exact package source commit: `082eeba46b0c5f8f8065e5386750aa0ecfa2062c` (npm registry `gitHead`).

- [Corresponding source, build scripts and instructions](https://github.com/nmrugg/stockfish.js/tree/082eeba46b0c5f8f8065e5386750aa0ecfa2062c)
- [Download corresponding source](https://github.com/nmrugg/stockfish.js/archive/082eeba46b0c5f8f8065e5386750aa0ecfa2062c.tar.gz)

No engine binaries or source have been modified. `scripts/copy-engine.mjs` makes reproducible byte-for-byte copies from the pinned dependency. Avoid replacing this package with another build without updating the source and license references.
