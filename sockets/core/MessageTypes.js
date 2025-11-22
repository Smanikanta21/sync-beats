// Centralized message type constants for sync engine
module.exports = {
  TYPES: {
    JOINED: "joined",
    USER_JOINED: "user_joined",
    USER_LEFT: "user_left",
    PLAY: "PLAY",
    PLAY_SYNC: "PLAY_SYNC",
    PREPARE_TRACK: "PREPARE_TRACK",
    PAUSE: "PAUSE",
    PAUSE_STATE: "PAUSE_STATE",
    RESUME: "RESUME",
    SEEK: "SEEK",
    RESYNC: "RESYNC",
    TRACK_CHANGE: "TRACK_CHANGE",
    DEVICE_HEALTH_CHECK: "device_health_check",
    DEVICE_READY: "device_ready",
    SCHEDULED_ACTION: "SCHEDULED_ACTION",
    TIME_PING: "time_ping",
    TIME_PONG: "time_pong",
    GET_PLAYBACK_STATE: "get_playback_state",
    REQUEST_SYNC: "request_sync",
    SYNC_CHECK: "sync_check"
  },
  CONSTANTS: {
    DEFAULT_PLAY_LEAD_MS: 800,
    LATE_JOIN_LEAD_MS: 700,
    PAUSE_RESUME_LEAD_MS: 400,
    SEEK_LEAD_MS: 300,
    HANDSHAKE_SOFT_TIMEOUT_MS: 5500,
    HANDSHAKE_HARD_TIMEOUT_MS: 9000,
    HANDSHAKE_MIN_READY_FRACTION: 0.66,
    LARGE_DRIFT_MS: 450
  }
};
