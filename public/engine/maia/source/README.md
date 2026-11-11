# Knightly standalone Maia-3 browser engine

This directory and ../worker.mjs and ../policy.mjs are the complete corresponding
source for this independently executed, message-based engine adapter, licensed
AGPL-3.0-or-later. See ../LICENSE.txt. ONNX Runtime has its separate MIT license
in ../ONNX-LICENSE.txt. The web application's Stockfish analysis engine is separate.

Upstream: https://github.com/CSSLab/maia3
Pinned code commit: 1e13597c42d4858b7cfd7cfdae01e297263364b2
Model: https://huggingface.co/UofTCSSLab/Maia3-5M
Pinned model revision: b6559de2398d7140b985f28fd2c19fb5e47ddabe

Build on Python 3.12 (tested):

    python3.12 -m venv venv
    . venv/bin/activate
    pip install torch==2.15.0 onnx==1.23.2 onnxruntime==1.31.1 python-chess==1.999 numpy
    curl -fL https://huggingface.co/UofTCSSLab/Maia3-5M/resolve/b6559de2398d7140b985f28fd2c19fb5e47ddabe/maia3-5m.pt -o maia3-5m.pt
    python export.py

The source model is unmodified. The exporter replaces RMSNorm with equivalent
primitive operations for ONNX opset 17, uses fixed batch=1 and exports only the
policy head. It checks output agreement against PyTorch. No quantization or
fine-tuning is applied. Model weights load with weights_only=True and strict keys.

Runtime: onnxruntime-web 1.24.3. Copy ort.wasm.min.mjs,
ort-wasm-simd-threaded.mjs and ort-wasm-simd-threaded.wasm from its dist directory
alongside worker.mjs. Use one WebAssembly thread, in a module Worker. No server,
API key, GPU, shared-memory header or remote inference service is required.

Protocol: request {id, fens, legalMoves, elo}; response {id, move} or {id, error}.
Positions are full FENs in chronological order, up to eight; the earliest position
pads short histories. Each position is oriented to its own side to move, as in
upstream --use_uci_history. Move strings use ordinary absolute UCI coordinates.
The legal list must come from a rules engine and includes underpromotion suffixes.
Both self/opponent Elo inputs use the requested Lichess rating. Mask to legal moves
and sample with temperature 1, no top-p cutoff and no Stockfish reranking.

The model predicts human moves; its rating input is not a certified match rating,
a Chess.com conversion, or a guarantee of human-like behavior in every position.
Sampling human behavior can still produce blunders. Author: University of Toronto
CSSLab, Maia-3 / Chessformer. Adapter and export changes: Knightly, October 2026.

October 2026 all-level update: worker accepts integer rating targets 400–3190; UI presets are 400–2400. Model weights, inputs and sampling are unchanged. These inputs are not certified match ratings.
