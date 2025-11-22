 

class TimeSyncCalculator {
  windowSize: number;
  samples: Array<{
    t0: number;
    t1: number;
    serverTime: number;
    offset: number;
    rtt: number;
    latency: number;
    timestamp: number;
  }>;
  offset: number;
  jitter: number;
  filteredOffset: number; // Smoothed (EMA) offset
  emaAlpha: number; // EMA smoothing factor
  _debugFit: {
    slope: number;
    intercept: number;
    r2: number;
    ssRes: number;
    ssTot: number;
    yMean: number;
    samplesUsed: number;
    samplesRejected: number;
  } | null;

  constructor(windowSize = 8) {
    this.windowSize = windowSize; // Keep last N samples
    this.samples = []; // Array of { t0, t1, serverTime, offset, rtt }
    this.offset = 0; // Current best estimate (client - server)
    this.jitter = 0; // Measurement uncertainty
    this.filteredOffset = 0; // Smoothed offset
    this.emaAlpha = 0.35; // Initial smoothing factor
    this._debugFit = null;
  }

  /**
   * Process a new ping/pong measurement
   * 
   * Timing:
   * t0: client sends ping (Date.now())
   * t1: client receives pong (Date.now())
   * serverTime: server timestamp at receive (NOT when sent)
   * 
   * Calculation:
   * rtt = t1 - t0
   * midpoint = t0 + rtt/2 (best guess of server time when we sent)
   * offset = serverTime - midpoint
   * 
   * @param {number} t0 - Client time when ping sent
   * @param {number} t1 - Client time when pong received
   * @param {number} serverTime - Server time at pong
   * @returns {Object} Sample info { offset, rtt, jitter, quality }
   */
  addSample(t0: number, t1: number, serverTime: number) {
    // Use performance.now() baselines for client timing to reduce Date.now() drift on iOS
    const pNow = performance.now();
    // Recompute rtt using sent and received deltas relative to performance clock
    const rtt = t1 - t0;
    const latency = rtt / 2; // One-way latency estimate
    const midpoint = t0 + latency; // Estimated client time when server processed
    const offset = serverTime - midpoint; // How far ahead server is

    const sample = {
      t0,
      t1,
      serverTime,
      offset,
      rtt,
      latency,
      timestamp: pNow
    };

    this.samples.push(sample);

    // Keep only recent samples (sliding window)
    if (this.samples.length > this.windowSize) {
      this.samples.shift();
    }

    // Recalculate best fit
    this._calculateBestFit();

    // Adaptive smoothing: higher jitter => higher alpha (more responsiveness)
    const jitterFactor = Math.min(1, this.jitter / 120); // Scale jitter into 0..1 range
    this.emaAlpha = 0.15 + (jitterFactor * 0.45); // alpha in [0.15, 0.60]
    if (this.samples.length === 1) {
      this.filteredOffset = this.offset;
    } else {
      this.filteredOffset = (1 - this.emaAlpha) * this.filteredOffset + this.emaAlpha * this.offset;
    }

    return {
      offset,
      rtt,
      latency,
      jitter: this.jitter,
      quality: this._getQuality(),
      samplesUsed: this._debugFit?.samplesUsed || this.samples.length,
      samplesRejected: this._debugFit?.samplesRejected || 0,
      filteredOffset: this.filteredOffset
    };
  }

  /**
   * Calculate best-fit offset using linear regression
   * This reduces the impact of outliers and jitter
   * 
   * Algorithm:
   * 1. Use RTT as X (measurement latency/uncertainty)
   * 2. Use offset as Y (time difference)
   * 3. Fit line: offset = slope * rtt + intercept
   * 4. Use intercept as best estimate
   * 
   * Theory: Lower RTT samples are more reliable
   * By fitting a line, we extrapolate to RTT=0 (perfect measurement)
   */
  _calculateBestFit() {
    if (this.samples.length < 2) {
      if (this.samples.length === 1) {
        this.offset = this.samples[0].offset;
        this.jitter = this.samples[0].rtt;
      }
      return;
    }
    // Outlier filtering:
    // 1. Median Absolute Deviation (MAD) on offset (reject |offset-median| > 3*MAD)
    // 2. RTT pruning: reject top 20% highest RTT values
    const offsetsSorted = [...this.samples.map(s => s.offset)].sort((a,b) => a-b);
    const median = offsetsSorted[Math.floor(offsetsSorted.length / 2)];
    const deviations = this.samples.map(s => Math.abs(s.offset - median)).sort((a,b) => a-b);
    const mad = deviations[Math.floor(deviations.length / 2)] || 1; // Avoid zero division
    const rttsSorted = [...this.samples.map(s => s.rtt)].sort((a,b) => a-b);
    const rttThreshold = rttsSorted[Math.floor(rttsSorted.length * 0.8)]; // Keep lower 80%
    const filtered = this.samples.filter(s => {
      const withinMad = Math.abs(s.offset - median) <= 3 * mad;
      const withinRtt = s.rtt <= rttThreshold;
      return withinMad && withinRtt;
    });

    const n = filtered.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (const sample of filtered) {
      const x = sample.rtt;
      const y = sample.offset;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    // Linear regression: y = ax + b
    // a = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX²)
    // b = (sumY - a*sumX) / n
    
    const denominator = n * sumX2 - sumX * sumX;
    
    if (Math.abs(denominator) < 0.0001) {
      // Fallback to mean if regression unstable
      const mean = n ? (sumY / n) : 0;
      const variance = n ? (sumY2 / n - mean ** 2) : 0;
      this.offset = mean;
      this.jitter = Math.sqrt(Math.max(variance,0));
      this._debugFit = {
        slope: 0,
        intercept: mean,
        r2: 0,
        ssRes: variance * n,
        ssTot: variance * n,
        yMean: mean,
        samplesUsed: n,
        samplesRejected: this.samples.length - n
      };
      return;
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Best estimate: intercept at RTT=0 (perfect measurement)
    this.offset = intercept;

    // Calculate R² (goodness of fit)
    const yMean = sumY / n;
    let ssRes = 0, ssTot = 0;
    
    for (const sample of filtered) {
      const predicted = slope * sample.rtt + intercept;
      ssRes += (sample.offset - predicted) ** 2;
      ssTot += (sample.offset - yMean) ** 2;
    }

    const r2 = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);
    
    // Jitter is residual variance
    this.jitter = Math.sqrt(ssRes / n);

    // Debug logging available
    this._debugFit = {
      slope,
      intercept,
      r2,
      ssRes,
      ssTot,
      yMean,
      samplesUsed: n,
      samplesRejected: this.samples.length - n
    };
  }

  /**
   * Estimate sync quality (0-100)
   * Lower jitter = higher quality
   * Higher R² = higher quality
   * 
   * @returns {number} Quality percentage
   */
  _getQuality() {
    if (this.samples.length === 0) return 0;
    if (this.samples.length === 1) return 50;

    // Jitter threshold: > 50ms is bad sync
    const jitterScore = Math.max(0, 100 - this.jitter * 2);
    
    // R² score (if available)
    const r2Score = this._debugFit ? (this._debugFit.r2 * 100) : 100;
    
    return (jitterScore + r2Score) / 2;
  }

  /**
   * Get current time offset (client clock relative to server)
   * 
   * Usage:
   * serverTime = clientTime - this.getOffset()
   * clientTime = serverTime + this.getOffset()
   * 
   * @returns {number} Milliseconds (client ahead of server = positive)
   */
  getOffset() {
    return this.offset;
  }

  getFilteredOffset() {
    return this.filteredOffset;
  }

  /**
   * Get measurement jitter/uncertainty
   * Lower is better
   * 
   * @returns {number} Milliseconds of standard deviation
   */
  getJitter() {
    return this.jitter;
  }

  /**
   * Get all recent samples for analysis
   * 
   * @returns {Array} Sample array
   */
  getSamples() {
    return [...this.samples];
  }

  /**
   * Clear all samples and reset
   */
  reset() {
    this.samples = [];
    this.offset = 0;
    this.jitter = 0;
    this.filteredOffset = 0;
    this._debugFit = null;
  }

  /**
   * Debug: Get full sync information
   * 
   * @returns {Object} Sync details
   */
  debug() {
    return {
      offset: this.offset,
      filteredOffset: this.filteredOffset,
      jitter: this.jitter,
      quality: this._getQuality(),
      samplesCount: this.samples.length,
      samples: this.samples,
      regression: this._debugFit,
      explanation: {
        offset: `Client is ${this.offset > 0 ? 'ahead' : 'behind'} server by ${Math.abs(this.offset).toFixed(1)}ms`,
        jitter: `Measurement uncertainty: ±${this.jitter.toFixed(1)}ms`,
        quality: `Sync quality: ${this._getQuality().toFixed(0)}%`,
        smoothing: `Filtered offset: ${this.filteredOffset.toFixed(1)}ms (alpha=${this.emaAlpha.toFixed(2)})`
      }
    };
  }
}

export default TimeSyncCalculator;
