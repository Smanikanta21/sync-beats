/**
 * PrecisionClock - Monotonic Server Clock
 * 
 * Uses performance.now() instead of Date.now() for:
 * ✅ Monotonic timing (never goes backward)
 * ✅ Microsecond precision (vs millisecond)
 * ✅ Immunity to system clock adjustments
 * 
 * This is the single source of truth for all playback timing
 */

class PrecisionClock {
  constructor() {
    // Server startup reference point
    this.serverStartTime = Date.now(); // Unix timestamp at boot
    this.processStartTime = performance.now(); // Monotonic timer at boot
    
    // Calculate offset between Unix time and monotonic time
    this.offset = this.serverStartTime - this.processStartTime;
  }

  /**
   * Get current server time in milliseconds
   * This is monotonic and won't jump backward
   * 
   * @returns {number} Milliseconds since server started (monotonic)
   */
  now() {
    return performance.now();
  }

  /**
   * Get current server time as Unix timestamp
   * Useful for logging and client comparisons
   * 
   * @returns {number} Unix timestamp in milliseconds
   */
  unixNow() {
    return performance.now() + this.offset;
  }

  /**
   * Calculate how long ago a timestamp was (in monotonic time)
   * 
   * @param {number} timestamp - Timestamp from now()
   * @returns {number} Milliseconds elapsed
   */
  elapsed(timestamp) {
    return this.now() - timestamp;
  }

  /**
   * Calculate time until a future timestamp
   * 
   * @param {number} futureTimestamp - Target timestamp from now()
   * @returns {number} Milliseconds until that time
   */
  until(futureTimestamp) {
    return futureTimestamp - this.now();
  }

  /**
   * Get server uptime in seconds
   * 
   * @returns {number} Seconds server has been running
   */
  uptime() {
    return this.now() / 1000;
  }

  /**
   * Debug: Get detailed time information
   * 
   * @returns {Object} Timing details
   */
  debug() {
    return {
      monotonic: this.now(),
      unix: this.unixNow(),
      offset: this.offset,
      uptime: this.uptime(),
      processStartTime: this.processStartTime,
      serverStartTime: this.serverStartTime
    };
  }
}

module.exports = new PrecisionClock();
