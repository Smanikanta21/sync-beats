const PrecisionClock = require("../lib/PrecisionClock");
const { TYPES, CONSTANTS } = require("./MessageTypes");
// Removed external logger; using minimal console wrapper
const logger = { info: (...a) => console.log(...a) };

class SyncRoom {
  constructor(roomCode, hostUserId) {
    this.roomCode = roomCode;
    this.hostUserId = hostUserId;
    this.clients = new Set();
    this.currentTrack = null;
    this.trackData = null; // full metadata for current track
    this.duration = null;
    this.startedAtServer = null; // monotonic start reference
    this.isPaused = false;
    this.pausedAt = null; // position at pause
    this.pendingPlayHandshake = null; // { checkId, trackUrl, duration, startDelayMs, responses:Set, initiatedAt }
    this.createdAt = Date.now(); // wall clock for display
  }

  isTrackActive() {
    return this.currentTrack !== null && !this.isPaused;
  }

  getPlaybackPosition() {
    if (!this.startedAtServer || this.isPaused) {
      return this.pausedAt || 0;
    }
    return PrecisionClock.now() - this.startedAtServer;
  }

  initiatePlayHandshake(msg, checkId, baseDelayMs) {
    this.pendingPlayHandshake = {
      checkId,
      trackUrl: msg.audioUrl,
      duration: msg.duration,
      startDelayMs: baseDelayMs,
      responses: new Set(),
      initiatedAt: PrecisionClock.now()
    };
  }

  recordHandshakeResponse(wsId) {
    if (this.pendingPlayHandshake) {
      this.pendingPlayHandshake.responses.add(wsId);
    }
  }

  finalizePlay(latencyHintMs, startDelayMs) {
    const startServerMonotonic = PrecisionClock.now() + startDelayMs;
    this.currentTrack = this.pendingPlayHandshake.trackUrl;
    this.duration = this.pendingPlayHandshake.duration;
    this.startedAtServer = startServerMonotonic;
    this.isPaused = false;
    this.pausedAt = null;
    logger.info(`▶️ Finalizing play for room ${this.roomCode}`, { startDelayMs, latencyHintMs });
    const payload = {
      type: TYPES.PLAY,
      audioUrl: this.currentTrack,
      duration: this.duration,
      masterClockMs: startServerMonotonic,
      masterClockLatencyMs: latencyHintMs,
      startDelayMs,
      timestamp: Date.now()
    };
    this.pendingPlayHandshake = null;
    return payload;
  }

  setTrackMetadata(trackData) {
    // When host switches track before play starts, treat as paused at 0
    if (!trackData || !trackData.audioUrl) return;
    this.currentTrack = trackData.audioUrl;
    this.trackData = trackData;
    this.duration = trackData.duration || null;
    this.startedAtServer = null;
    this.isPaused = true; // not playing yet until PLAY handshake
    this.pausedAt = 0;
  }

  pause() {
    const position = this.getPlaybackPosition();
    this.isPaused = true;
    this.pausedAt = position;
    return {
      type: TYPES.PAUSE,
      pausedAtMs: position,
      masterClockMs: PrecisionClock.now(),
      timestamp: Date.now()
    };
  }

  resume(resumeDelayMs = CONSTANTS.PAUSE_RESUME_LEAD_MS) {
    const resumeServerMonotonic = PrecisionClock.now() + resumeDelayMs;
    const pausedAt = this.pausedAt || 0;
    this.isPaused = false;
    this.startedAtServer = resumeServerMonotonic - pausedAt;
    this.pausedAt = null;
    return {
      type: TYPES.RESUME,
      masterClockMs: resumeServerMonotonic,
      resumeDelayMs,
      playbackPositionMs: pausedAt,
      timestamp: Date.now()
    };
  }

  seek(seekPositionMs, seekDelayMs = CONSTANTS.SEEK_LEAD_MS) {
    const seekServerMonotonic = PrecisionClock.now() + seekDelayMs;
    this.startedAtServer = seekServerMonotonic - seekPositionMs;
    this.pausedAt = null;
    return {
      type: TYPES.SEEK,
      seekPositionMs,
      masterClockMs: seekServerMonotonic,
      seekDelayMs,
      timestamp: Date.now()
    };
  }

  syncSnapshot() {
    const scheduleLeadMs = CONSTANTS.LATE_JOIN_LEAD_MS;
    const nowMono = PrecisionClock.now();
    const currentPos = this.getPlaybackPosition();
    if (this.currentTrack) {
      if (this.isTrackActive()) {
        return {
          type: TYPES.PLAY_SYNC,
            audioUrl: this.currentTrack,
            duration: this.duration,
            playbackPosition: currentPos + scheduleLeadMs,
            masterClockMs: nowMono + scheduleLeadMs,
            masterClockLatencyMs: 0,
            isPlaying: true,
            timestamp: Date.now()
        };
      } else {
        return {
          type: TYPES.PAUSE_STATE,
          audioUrl: this.currentTrack,
          duration: this.duration,
          pausedPositionMs: currentPos,
          isPlaying: false,
          masterClockMs: nowMono,
          startedAtServer: this.startedAtServer,
          timestamp: Date.now()
        };
      }
    }
    return {
      type: "playback_state",
      currentTrack: null,
      isPlaying: false,
      playbackPosition: 0,
      duration: null,
      serverNow: Date.now(),
      timestamp: Date.now()
    };
  }

  shouldIgnoreDuplicatePlay(msg) {
    if (this.pendingPlayHandshake && this.pendingPlayHandshake.trackUrl === msg.audioUrl) {
      const elapsed = PrecisionClock.now() - (this.pendingPlayHandshake.initiatedAt || 0);
      return elapsed < 1500; // ignore quick duplicate
    }
    return false;
  }

  getReadyFraction() {
    if (!this.pendingPlayHandshake) return 0;
    const readyCount = this.pendingPlayHandshake.responses.size;
    const total = this.clients.size || 1;
    return readyCount / total;
  }

  handshakeElapsedMs() {
    if (!this.pendingPlayHandshake) return 0;
    return PrecisionClock.now() - this.pendingPlayHandshake.initiatedAt;
  }
}

module.exports = SyncRoom;
