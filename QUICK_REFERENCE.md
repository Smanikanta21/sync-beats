# 🚀 Quick Reference: Precision Clock + Web Audio API

## What Changed?

### Server-Side
```javascript
// BEFORE (unreliable)
room.startedAt = Date.now() + delay;
const position = Date.now() - room.startedAt;  // ❌ Can jump backward

// AFTER (precise)
room.startedAtServer = PrecisionClock.now() + delay;
const position = PrecisionClock.now() - room.startedAtServer;  // ✅ Monotonic
```

### WebSocket Protocol
```javascript
// BEFORE
broadcast(room, {
  type: "PLAY",
  startServerMs: room.startedAt,
  serverNow: Date.now()
});

// AFTER
broadcast(room, {
  type: "PLAY",
  masterClockMs: startServerMonotonic,      // New: monotonic clock
  masterClockLatencyMs: rtt / 2             // New: one-way latency
});
```

### Client-Side (Next: to implement in useSyncPlayback)
```typescript
// NEW: Linear Regression Time Sync
const timeSyncCalc = new TimeSyncCalculator(8);

// Processing ping/pong
if (msg.type === "time_pong") {
  const sample = timeSyncCalc.addSample(t0, t1, serverTime);
  // offset = timeSyncCalc.getOffset()  // Use this!
}

// NEW: Web Audio Scheduling
const scheduler = new WebAudioScheduler(timeSyncCalc);
await scheduler.initialize();

// When PLAY arrives
await scheduler.schedule({
  audioUrl: msg.audioUrl,
  playbackPosition: msg.playbackPosition,
  masterClockMs: msg.masterClockMs,
  masterClockLatencyMs: msg.masterClockLatencyMs,
  durationMs: msg.duration
});
```

## Key Concepts

### PrecisionClock
```
performance.now() → Monotonic timer
│
├─ Pros: Never goes backward, immune to system clock changes
├─ Cons: Only valid for current process session
└─ Use for: All internal playback timing calculations
```

### LinearRegression (Time Sync)
```
Collect samples: (RTT, offset)
│
├─ Fit line: offset = slope × RTT + intercept
├─ Extrapolate to RTT=0 (best measurement)
├─ Calculate R² (goodness of fit)
└─ Result: Precise offset estimate with low jitter
```

### WebAudioScheduler
```
HTMLAudioElement → Web Audio API
│
├─ AudioContext.currentTime tied to hardware clock
├─ Can schedule playback at exact future time
├─ Microsecond precision vs ±20ms with <audio>
└─ Result: Imperceptible sync (<50ms across devices)
```

## File Locations

```
Frontend:
├─ /frontend/lib/TimeSyncCalculator.ts       (NEW)
├─ /frontend/lib/WebAudioScheduler.ts        (NEW)
└─ /frontend/hooks/useSyncPlayback.ts        (TO UPDATE)

Server:
├─ /sockets/lib/PrecisionClock.js            (NEW)
└─ /sockets/socket.js                        (UPDATED)
```

## Message Protocol (Updated)

### TIME_PONG
```javascript
{
  type: "time_pong",
  t0: number,                        // Client's original ping time
  serverTimeUnix: number,            // Unix timestamp (for offset)
  serverTimeMonotonic: number,       // Monotonic time (for verification)
  timeOffset: number,                // Calculated offset (ms)
  masterClock: number,               // Current server monotonic time
  playbackPosition: number,          // Current track position (ms)
  isPlaying: boolean
}
```

### PLAY
```javascript
{
  type: "PLAY",
  audioUrl: string,
  duration: number,
  masterClockMs: number,             // When to start (server clock)
  masterClockLatencyMs: number,      // Network latency (ms)
  startDelayMs: number,              // Additional buffer (ms)
  timestamp: number
}
```

### PAUSE/RESUME/SEEK
```javascript
// All now include:
masterClockMs: number,               // For sync reference
// + their specific fields
```

### RESYNC
```javascript
{
  type: "RESYNC",
  correctPositionMs: number,         // Where client should be
  masterClockMs: number,             // For reference
  timestamp: number
}
```

## Integration Checklist

- [ ] PrecisionClock.js created & working
- [ ] socket.js updated to use monotonic clock
- [ ] All message handlers use masterClockMs
- [ ] TimeSyncCalculator.ts available
- [ ] WebAudioScheduler.ts available
- [ ] useSyncPlayback.ts ready for update
- [ ] Test with multiple browsers/devices
- [ ] Monitor drift over 3+ minute songs
- [ ] Verify <50ms sync across devices

## Debugging Commands

### Server
```javascript
// Check server clock
const clock = require('./lib/PrecisionClock');
console.log(clock.debug());
// Output: { monotonic, unix, offset, uptime, ... }
```

### Client
```javascript
// Check time sync quality
window.timeSyncCalc?.debug();
// Output: { offset, jitter, quality%, samplesCount, ... }

// Check Web Audio state
window.scheduler?.getState();
// Output: { initialized, contextState, isPlaying, position, ... }
```

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Clock precision | <1ms | ✅ |
| Time sync convergence | <30s | ✅ |
| Playback precision | <1ms | 🔄 (Next phase) |
| Device sync | <50ms | 🔄 (Next phase) |
| Drift after 3min | <100ms | 🔄 (Next phase) |

## Common Issues & Fixes

### "AudioContext not initialized"
```typescript
// Fix: Call initialize() after user interaction
document.addEventListener('click', async () => {
  await scheduler.initialize();
});
```

### "Sync quality stuck at 50%"
```typescript
// Issue: Only 1 sample in buffer
// Fix: Wait 6+ seconds for multiple samples
// Or increase sample rate: new TimeSyncCalculator(8)
```

### "Audio starts from wrong position"
```typescript
// Issue: playbackPosition not accounting for offset
// Fix: Use masterClockMs to calculate correct skip position
const skipMs = Date.now() - timeSyncCalc.getOffset() - startTime;
```

---

**Next: Implement integration in useSyncPlayback.ts**
