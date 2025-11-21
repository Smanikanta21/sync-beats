 

class PrecisionClock {
  constructor() {
    this.serverStartTime = Date.now();
    this.processStartTime = performance.now();
    
    this.offset = this.serverStartTime - this.processStartTime;
  }

  now() {
    return performance.now();
  }

  unixNow() {
    return performance.now() + this.offset;
  }

  elapsed(timestamp) {
    return this.now() - timestamp;
  }

  until(futureTimestamp) {
    return futureTimestamp - this.now();
  }

  uptime() {
    return this.now() / 1000;
  }

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
