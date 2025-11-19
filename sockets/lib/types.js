const TrackType = {
  id: String,
  title: String,
  artist: String,
  album: String,
  duration: Number,
  audioUrl: String,
  coverUrl: String,
  playedAt: String,
  addedBy: String,
}

const RoomType = {
  code: String,
  hostId: String,
  name: String,
  type: String,
  isPublic: Boolean,
  wifiSSID: String,
  createdAt: String,
  participants: Array,
}

const SyncMessageType = {
  join: { type: String, roomCode: String, userId: String, hostId: String },
  joined: { type: String, roomCode: String, wsId: String, hostUserId: String, isHost: Boolean, timestamp: Number },
  time_ping: { type: String, id: String, t0: Number },
  time_pong: { type: String, id: String, t0: Number, serverTime: Number, playbackPosition: Number, isPlaying: Boolean },
  PLAY: { type: String, roomCode: String, audioUrl: String, duration: Number, startDelayMs: Number, timestamp: Number },
  PAUSE: { type: String, roomCode: String, currentTime: Number, timestamp: Number },
  RESUME: { type: String, roomCode: String, currentTime: Number, startDelayMs: Number, timestamp: Number },
  SEEK: { type: String, roomCode: String, seekPositionMs: Number, timestamp: Number },
  TRACK_CHANGE: { type: String, roomCode: String, trackData: TrackType, timestamp: Number },
  get_playback_state: { type: String, roomCode: String },
  playback_state: { type: String, currentTrack: String, playbackPosition: Number, isPlaying: Boolean, duration: Number, serverNow: Number, timestamp: Number },
  sync_check: { type: String, roomCode: String, clientPosition: Number, timestamp: Number },
  RESYNC: { type: String, correctPosition: Number, serverNow: Number, timestamp: Number },
  user_joined: { type: String, userId: String, wsId: String, totalClients: Number, timestamp: Number },
  user_left: { type: String, userId: String, wsId: String, totalClients: Number },
}

function validateMessageType(msg, expectedType) {
  if (!msg || !msg.type) {
    return { valid: false, error: 'Message must have a type field' }
  }
  if (msg.type !== expectedType) {
    return { valid: false, error: `Expected ${expectedType}, got ${msg.type}` }
  }
  return { valid: true }
}

module.exports = {
  TrackType,
  RoomType,
  SyncMessageType,
  validateMessageType,
}
