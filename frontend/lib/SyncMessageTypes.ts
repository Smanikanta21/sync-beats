// Shared message type constants mirroring server TYPES
export const SYNC_TYPES = {
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
  TIME_PING: "time_ping",
  TIME_PONG: "time_pong",
  GET_PLAYBACK_STATE: "get_playback_state",
  REQUEST_SYNC: "request_sync",
  SYNC_CHECK: "sync_check"
} as const;

export type SyncMessageType = typeof SYNC_TYPES[keyof typeof SYNC_TYPES];
