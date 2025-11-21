# Phase 3 — Shared Clock Sync Layer

This phase hardens time synchronization to near media-grade quality.

## Goals Implemented
- Multi-ping bursts: 7 pings over a 500ms window every 800ms.
- Outlier rejection: MAD-based offset filtering + top 20% RTT pruning.
- Linear regression: Offset = intercept at RTT→0 (existing, now uses filtered set).
- Smoothing: Adaptive EMA (alpha 0.15–0.60) producing `filteredOffset`.
- Dynamic jitter assessment drives smoothing responsiveness.

## Key Changes
- `frontend/lib/TimeSyncCalculator.ts`
  - Added outlier filtering before regression.
  - Added EMA smoothing (`filteredOffset`, `emaAlpha`).
  - Extended debug info with used/rejected sample counts.
- `frontend/hooks/useSyncPlayback.ts`
  - Replaced single 3s ping with burst every 800ms.
  - State now uses `filteredOffset` for `serverOffsetMs`.
  - Enhanced logging (raw vs filtered, rejected samples).

## Using Filtered Offset
Prefer `timeSync.getFilteredOffset()` or `sample.filteredOffset` for client/server time conversion:
```
serverNow ≈ Date.now() - filteredOffset
clientNowFromServer ≈ serverTime + filteredOffset
```

## Next Steps
1. Local test: observe logs for jitter & stability under varying network.
2. Optional: introduce lightweight Kalman if EMA insufficient in high jitter (>80ms).
3. Feed filtered offset into any drift correction heuristics (currently drift check uses playback position only).
4. Persist last filtered offset per device for quicker warm start (optional).

## Metrics to Watch
- `samplesRejected / samplesUsed`: should stay < 40% in stable networks.
- `jitter`: aim < 20ms typical, < 50ms acceptable.
- `quality`: derived from jitter & R² should trend upward after first 3–4 bursts.

## Rollback
If issues arise:
- Change interval back to 3000ms: modify `setInterval(startPingBurst, 800)`.
- Disable outlier filtering: revert `_calculateBestFit()` to original implementation.

---
Phase 3 in progress; further refinement will focus on predictive drift correction and cross-tab/device resume consistency.
