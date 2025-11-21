 

interface SchedulePlayOptions {
  audioUrl: string;
  playbackPosition: number; // milliseconds into track
  masterClockMs: number; // server monotonic clock now
  masterClockLatencyMs: number; // RTT/2
  durationMs: number;
  monotonicToUnixDelta?: number; // server unix - server monotonic (from time sync)
  filteredOffset?: number; // client filtered offset (serverUnix - clientUnix)
}


class WebAudioScheduler {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  
  private isPlaying: boolean = false;
  private startTime: number = 0; // AudioContext.currentTime when started
  private pauseTime: number = 0; // Position when paused

  private volume: number = 1.0;
  private playbackRate: number = 1.0;

  private timeSync: unknown = null; // Reference to TimeSyncCalculator
  private playPromise: Promise<void> | null = null;
  private cachedBuffers: Map<string, AudioBuffer> = new Map();
  private scheduledMasterClockMs: number | null = null;
  private scheduledStartPositionMs: number = 0;
  private monotonicToUnixDelta: number = 0;
  private lastFilteredOffset: number = 0;
  private lastDriftMs: number = 0;
  private playbackRateResetAt: number = 0;

  constructor(timeSync: unknown) {
    this.timeSync = timeSync;
  }

  /**
   * Initialize Web Audio API context
   * Must be called after user interaction (for mobile)
   */
  async initialize() {
    if (this.audioContext) return this.audioContext;

    try {
      // Use window.AudioContext or window.webkitAudioContext for iOS
      const AudioContextClass = (window as (Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext })).AudioContext 
        || (window as (Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext })).webkitAudioContext;
      
      if (!AudioContextClass) {
        throw new Error('Web Audio API not supported in this browser');
      }

      this.audioContext = new AudioContextClass();
      
      if (!this.audioContext) {
        throw new Error('Failed to create AudioContext');
      }
      
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.volume;

      console.log('✅ Web Audio API initialized');
      console.log('   AudioContext state:', this.audioContext.state);
      console.log('   Sample rate:', this.audioContext.sampleRate, 'Hz');

      return this.audioContext;
    } catch (err) {
      console.error('❌ Failed to initialize Web Audio API:', err);
      throw err;
    }
  }

  /** Ensure context is running (Safari may suspend). */
  async ensureRunning() {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Resume audio context if suspended (iOS requirement)
   */
  async resumeContext() {
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('✅ AudioContext resumed');
    }
  }

  /**
   * Load audio file via fetch + decode
   */
  async loadAudio(url: string): Promise<AudioBuffer> {
    // Check cache first
    if (this.cachedBuffers.has(url)) {
      console.log('📦 Using cached audio buffer');
      return this.cachedBuffers.get(url)!;
    }

    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    try {
      console.log('⏳ Loading audio:', url.split('/').pop());
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('   Downloaded:', (arrayBuffer.byteLength / 1024 / 1024).toFixed(2), 'MB');

      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      console.log('✅ Audio decoded:', {
        duration: audioBuffer.duration.toFixed(2), 
        'seconds': audioBuffer.sampleRate,
        'Hz': audioBuffer.numberOfChannels,
        channels: audioBuffer.length,
        samples: audioBuffer.getChannelData(0).length
      });
      this.cachedBuffers.set(url, audioBuffer);
      return audioBuffer;
    } catch (err) {
      console.error('❌ Failed to load audio:', err);
      throw err;
    }
  }

  /**
   * Schedule precise playback
   * 
   * This is the core function that achieves synchronization
   * 
   * @param options - See SchedulePlayOptions
   */
  async schedule(options: SchedulePlayOptions) {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }
    await this.ensureRunning();

    try {
      // Stop any existing playback
      this.stop();

      // Load audio
      const audioBuffer = await this.loadAudio(options.audioUrl);
      this.audioBuffer = audioBuffer;

      // Precise scheduling against shared clock
      const monotonicToUnixDelta = options.monotonicToUnixDelta ?? 0; // serverUnix - serverMonotonic
      const filteredOffset = options.filteredOffset ?? 0; // serverUnix - clientUnix
      const clientUnixNow = Date.now();
      const serverUnixNowEst = clientUnixNow + filteredOffset; // Estimate server unix now
      const masterClockUnix = options.masterClockMs + monotonicToUnixDelta; // Convert master monotonic to unix
      let delayMs = masterClockUnix - serverUnixNowEst + options.masterClockLatencyMs; // adjust for one-way latency
      const safetyLeadMs = 60; // small lead to ensure buffer
      // If delay very small or negative, we are late; compute catch-up start position
      let startPositionMs = options.playbackPosition;
      if (delayMs < safetyLeadMs) {
        // Late by L ms => advance start position by |delayMs| - safetyLeadMs
        const lateness = safetyLeadMs - delayMs; // if delayMs < safetyLeadMs, lateness positive
        if (lateness > 0) {
          startPositionMs += lateness; // Jump forward in track to remain aligned
          delayMs = safetyLeadMs; // schedule with minimal safety lead
        }
      }
      if (startPositionMs < 0) startPositionMs = 0;
      const audioContextDelay = Math.max(delayMs, safetyLeadMs) / 1000; // seconds
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = audioBuffer;
      this.sourceNode.connect(this.gainNode!);
      this.sourceNode.playbackRate.value = this.playbackRate;
      this.startTime = this.audioContext.currentTime + audioContextDelay;
      this.sourceNode.start(this.startTime, startPositionMs / 1000);
      // Store scheduling metadata for drift correction
      this.scheduledMasterClockMs = options.masterClockMs;
      this.scheduledStartPositionMs = startPositionMs;
      this.monotonicToUnixDelta = monotonicToUnixDelta;
      this.lastFilteredOffset = filteredOffset;

      this.isPlaying = true;

      console.log('▶️ Web Audio playback scheduled:', {
        trackStartPositionSec: (startPositionMs/1000).toFixed(3),
        startTimeCtx: this.startTime.toFixed(3),
        ctxNow: this.audioContext.currentTime.toFixed(3),
        scheduleDelaySec: audioContextDelay.toFixed(3),
        masterClockMs: options.masterClockMs,
        serverUnixEst: serverUnixNowEst,
        masterClockUnix,
        filteredOffset,
        monotonicToUnixDelta
      });

    } catch (err) {
      console.error('❌ Failed to schedule playback:', err);
      throw err;
    }
  }

  /**
   * Pause playback and remember position
   */
  pause() {
    if (!this.sourceNode || !this.audioContext) return;

    try {
      // Calculate current playback position
      const elapsed = (this.audioContext.currentTime - this.startTime) * 1000; // Convert to ms
      this.pauseTime = elapsed;

      this.sourceNode.stop();
      this.isPlaying = false;

      console.log('⏸️ Web Audio paused at:', this.pauseTime.toFixed(0), 'ms');
    } catch (err) {
      console.error('❌ Failed to pause:', err);
    }
  }

  /**
   * Resume from paused position
   */
  async resume() {
    if (this.isPlaying || !this.audioBuffer) return;
    await this.ensureRunning();

    try {
      await this.resumeContext(); // Ensure AudioContext is not suspended

      const scheduleDelayMs = 50;
      this.sourceNode = this.audioContext!.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;
      this.sourceNode.connect(this.gainNode!);
      this.sourceNode.playbackRate.value = this.playbackRate;

      this.startTime = this.audioContext!.currentTime + (scheduleDelayMs / 1000);
      this.sourceNode.start(this.startTime, this.pauseTime / 1000);

      this.isPlaying = true;

      console.log('▶️ Web Audio resumed from:', this.pauseTime.toFixed(0), 'ms');
    } catch (err) {
      console.error('❌ Failed to resume:', err);
    }
  }

  /**
   * Adjust internal paused position prior to resume (for authoritative server position)
   */
  setPausedPosition(positionMs: number) {
    if (positionMs < 0) positionMs = 0;
    this.pauseTime = positionMs;
  }

  /**
   * Stop playback completely
   */
  stop() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch {
        // Already stopped
      }
      this.sourceNode = null;
    }

    this.isPlaying = false;
    this.startTime = 0;
    this.pauseTime = 0;
  }

  /**
   * Seek to specific position
   */
  async seek(positionMs: number) {
    if (!this.audioBuffer) return;
    await this.ensureRunning();

    try {
      this.stop();
      
      const scheduleDelayMs = 100;
      this.sourceNode = this.audioContext!.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;
      this.sourceNode.connect(this.gainNode!);
      this.sourceNode.playbackRate.value = this.playbackRate;

      this.startTime = this.audioContext!.currentTime + (scheduleDelayMs / 1000);
      this.sourceNode.start(this.startTime, positionMs / 1000);

      this.isPlaying = true;

      console.log('⏩ Web Audio seeked to:', positionMs.toFixed(0), 'ms');
    } catch (err) {
      console.error('❌ Failed to seek:', err);
    }
  }

  /**
   * Set volume (0.0 - 1.0)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  /**
   * Get current playback position
   */
  getCurrentPosition(): number {
    if (!this.isPlaying || !this.audioContext || !this.sourceNode) {
      return this.pauseTime;
    }

    // Calculate position based on AudioContext time
    const elapsed = (this.audioContext.currentTime - this.startTime) * 1000;
    return elapsed;
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get audio context state
   */
  getState() {
    return {
      initialized: !!this.audioContext,
      contextState: this.audioContext?.state || 'not-initialized',
      isPlaying: this.isPlaying,
      currentPosition: this.getCurrentPosition(),
      volume: this.volume,
      buffersCount: this.cachedBuffers.size
    };
  }

  /**
   * Clear audio cache
   */
  clearCache() {
    this.cachedBuffers.clear();
    console.log('🗑️ Audio cache cleared');
  }

  /**
   * Public helper to know if a decoded buffer is currently loaded
   */
  hasBuffer(): boolean {
    return !!this.audioBuffer;
  }

  /**
   * Compute expected track position based on shared clock & offsets.
   */
  private computeExpectedPositionMs(filteredOffset: number, monotonicToUnixDelta: number): number | null {
    if (!this.scheduledMasterClockMs) return null;
    const serverUnixNowEst = Date.now() + filteredOffset;
    const serverMonotonicNowEst = serverUnixNowEst - monotonicToUnixDelta;
    const elapsedSinceMasterStart = serverMonotonicNowEst - this.scheduledMasterClockMs;
    const expectedTrackPos = this.scheduledStartPositionMs + elapsedSinceMasterStart;
    return expectedTrackPos;
  }

  /**
   * Attempt gentle drift correction; small drift -> playbackRate tweak; large drift -> micro-reschedule.
   */
  autoCorrectDrift(filteredOffset: number, monotonicToUnixDelta: number) {
    if (!this.audioContext || !this.isPlaying || !this.sourceNode || !this.audioBuffer) return;
    const expected = this.computeExpectedPositionMs(filteredOffset, monotonicToUnixDelta);
    if (expected === null) return;
    const actual = this.scheduledStartPositionMs + this.getCurrentPosition();
    const drift = expected - actual; // positive => we are behind
    this.lastDriftMs = drift;
    // Restore playbackRate if previously adjusted and stable
    if (this.playbackRateResetAt && Date.now() > this.playbackRateResetAt) {
      if (Math.abs(drift) < 10 && this.sourceNode.playbackRate.value !== 1.0) {
        try { this.sourceNode.playbackRate.value = 1.0; } catch {}
        this.playbackRateResetAt = 0;
        console.log('🔁 PlaybackRate reset to 1.0');
      }
    }
    const smallThreshold = 40; // ms
    const largeThreshold = 250; // ms
    if (Math.abs(drift) < smallThreshold) return; // within acceptable tolerance
    if (Math.abs(drift) <= largeThreshold) {
      // Gentle correction via temporary playbackRate skew
      const correctionRate = 1 + (drift / 5000); // scale drift into small rate delta
      const clamped = Math.min(1.02, Math.max(0.98, correctionRate));
      try {
        this.sourceNode.playbackRate.value = clamped;
        this.playbackRateResetAt = Date.now() + 4000; // attempt reset after 4s
        console.log('🛠️ Drift rate adjust', { drift: drift.toFixed(1), rate: clamped.toFixed(4) });
      } catch (e) {
        console.warn('PlaybackRate adjustment failed', e);
      }
      return;
    }
    // Large drift -> re-seek by restarting source
    const targetPositionMs = Math.max(0, expected);
    const scheduleDelayMs = 40; // tiny delay to avoid immediate start glitches
    try {
      const newSource = this.audioContext.createBufferSource();
      newSource.buffer = this.audioBuffer;
      newSource.connect(this.gainNode!);
      newSource.playbackRate.value = this.playbackRate;
      const newStartTime = this.audioContext.currentTime + (scheduleDelayMs / 1000);
      newSource.start(newStartTime, targetPositionMs / 1000);
      // Stop old source
      try { this.sourceNode.stop(); } catch {}
      this.sourceNode = newSource;
      this.startTime = newStartTime - (targetPositionMs / 1000); // so getCurrentPosition math remains valid
      this.scheduledStartPositionMs = targetPositionMs;
      console.log('🔄 Hard drift resync', { drift: drift.toFixed(1), newPosMs: targetPositionMs.toFixed(1) });
    } catch (e) {
      console.error('Hard drift resync failed', e);
    }
  }

  getLastDriftInfo() {
    return {
      lastDriftMs: this.lastDriftMs,
      scheduledMasterClockMs: this.scheduledMasterClockMs,
      scheduledStartPositionMs: this.scheduledStartPositionMs,
      monotonicToUnixDelta: this.monotonicToUnixDelta,
      lastFilteredOffset: this.lastFilteredOffset
    };
  }
}

// Export for use in components
declare global {
  interface Window {
    WebAudioScheduler: typeof WebAudioScheduler;
  }
}

export default WebAudioScheduler;
