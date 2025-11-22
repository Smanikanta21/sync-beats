// SyncOptimization.ts
// Extracted optimizations inspired by beatsync for improved scheduling & drift handling.
// Focus areas:
// 1. Offset & RTT sample filtering (best-half strategy)
// 2. Dynamic scheduling window calculation
// 3. Late schedule detection & resync request trigger
// 4. Gentle playbackRate nudge helper
// 5. Track LRU helpers (for future WebAudio buffer usage)

export interface OffsetSample {
  t0: number; // send
  t1: number; // receive
  serverTime: number; // server timestamp
  rtt: number; // round trip
  offset: number; // serverTime - midpoint
}

export interface FilteredOffsetResult {
  offset: number;
  averageOffset: number;
  averageRtt: number;
  samplesUsed: number;
}

export class OffsetSmoother {
  private samples: OffsetSample[] = [];
  private maxSamples: number;
  private lastComputed: FilteredOffsetResult | null = null;

  constructor(maxSamples: number = 16) {
    this.maxSamples = maxSamples;
  }

  add(t0: number, t1: number, serverTime: number) {
    const rtt = t1 - t0;
    const offset = serverTime - (t0 + rtt / 2);
    this.samples.push({ t0, t1, serverTime, rtt, offset });
    if (this.samples.length > this.maxSamples) this.samples.shift();
    return this.compute();
  }

  compute(): FilteredOffsetResult {
    if (!this.samples.length) {
      this.lastComputed = { offset: 0, averageOffset: 0, averageRtt: 0, samplesUsed: 0 };
      return this.lastComputed;
    }
    const sorted = [...this.samples].sort((a, b) => a.rtt - b.rtt);
    const best = sorted.slice(0, Math.ceil(sorted.length / 2));
    const avgOffset = best.reduce((s, m) => s + m.offset, 0) / best.length;
    const avgRtt = this.samples.reduce((s, m) => s + m.rtt, 0) / this.samples.length;
    this.lastComputed = {
      offset: avgOffset,
      averageOffset: avgOffset,
      averageRtt: avgRtt,
      samplesUsed: best.length
    };
    return this.lastComputed;
  }

  getCurrent() { return this.lastComputed; }
}

// Calculate wait time until a target server monotonic/unix time based on current offset.
export function calcWaitMs(targetServerTime: number, offset: number): number {
  const clientNow = Date.now();
  const estServerNow = clientNow + offset;
  return Math.max(0, targetServerTime - estServerNow);
}

// Detect lateness threshold; returns boolean and recommended action.
export function isLateSchedule(waitMs: number, rttAvg: number): boolean {
  // If wait less than half RTT or < 50ms we consider late.
  return waitMs < Math.max(50, rttAvg / 2);
}

// Gentle playbackRate nudge (independent helper if hook wants external usage)
export function computeNudgePlaybackRate(driftMs: number, windowMs = 1500): number {
  // Bound to ±2%
  const fractional = Math.min(Math.max(driftMs / windowMs, -0.02), 0.02);
  return 1 + fractional;
}

// Simple LRU manager for future buffer caching integration.
export class LRU<T> {
  private map = new Map<string, T>();
  private order: string[] = [];
  constructor(private capacity: number) {}
  get(key: string): T | undefined {
    const val = this.map.get(key);
    if (!val) return undefined;
    this.order = this.order.filter(k => k !== key);
    this.order.unshift(key);
    return val;
  }
  set(key: string, value: T) {
    if (this.map.has(key)) {
      this.map.set(key, value);
      this.order = this.order.filter(k => k !== key);
      this.order.unshift(key);
      return;
    }
    this.map.set(key, value);
    this.order.unshift(key);
    if (this.order.length > this.capacity) {
      const evict = this.order.pop();
      if (evict) this.map.delete(evict);
    }
  }
  keys() { return [...this.order]; }
}

// Export a consolidated optimization facade for future expansion.
export const SyncOptimization = {
  OffsetSmoother,
  calcWaitMs,
  isLateSchedule,
  computeNudgePlaybackRate,
  LRU
};

export default SyncOptimization;