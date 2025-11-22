const { TYPES, CONSTANTS } = require("../MessageTypes");
const PrecisionClock = require("../../lib/PrecisionClock");

module.exports = function handlePlay({ ws, msg, room, readiness }) {
  // Ignore if track already active; prevents rapid re-PLAY spam from UI
  if (room.isTrackActive && room.isTrackActive() && room.currentTrack === msg.audioUrl) return;
  if (room.shouldIgnoreDuplicatePlay(msg)) return;
  // Mark all devices loading
  for (const client of room.clients) readiness.markLoading(client._id);
  const baseDelayMs = typeof msg.startDelayMs === 'number' ? msg.startDelayMs : CONSTANTS.DEFAULT_PLAY_LEAD_MS;
  const checkId = Math.random().toString(36).slice(2, 9);
  room.initiatePlayHandshake(msg, checkId, baseDelayMs);

  // Broadcast prepare
  broadcast(room, {
    type: TYPES.PREPARE_TRACK,
    audioUrl: msg.audioUrl,
    duration: msg.duration,
    checkId,
    timestamp: Date.now()
  });
  // Broadcast device health check trigger (clients respond with device_health_check_response)
  broadcast(room, {
    type: TYPES.DEVICE_HEALTH_CHECK,
    checkId,
    timestamp: Date.now()
  });

  // Attempt finalize based on readiness fraction/timeouts
  const tryFinalize = (forced = false) => {
    if (!room.pendingPlayHandshake) return;
    const fraction = room.getReadyFraction();
    const elapsed = room.handshakeElapsedMs();
    const enough = fraction >= (room.clients.size <= 2 ? 1.0 : CONSTANTS.HANDSHAKE_MIN_READY_FRACTION);
    const softTimeout = elapsed >= CONSTANTS.HANDSHAKE_SOFT_TIMEOUT_MS;
    const hardTimeout = elapsed >= CONSTANTS.HANDSHAKE_HARD_TIMEOUT_MS;
    const readyCount = room.pendingPlayHandshake.responses.size;

    if (enough || hardTimeout || (softTimeout && readyCount >= 1) || forced) {
      const latencyHintMs = msg.rttMs ? (msg.rttMs / 2) : 0;
      const extraLead = enough ? 600 : 1400;
      const startDelayMs = baseDelayMs + extraLead;
      const playPayload = room.finalizePlay(latencyHintMs, startDelayMs);
      broadcast(room, playPayload);
    } else {
      setTimeout(() => tryFinalize(false), 500);
    }
  };
  setTimeout(() => tryFinalize(false), 1200);
  setTimeout(() => tryFinalize(false), CONSTANTS.HANDSHAKE_SOFT_TIMEOUT_MS);
  setTimeout(() => tryFinalize(true), CONSTANTS.HANDSHAKE_HARD_TIMEOUT_MS);
};

function broadcast(room, payload, excludeWs = null) {
  let sent = 0;
  for (const client of room.clients) {
    if (client.readyState === 1 && client !== excludeWs) {
      try { client.send(JSON.stringify(payload)); sent++; } catch {}
    }
  }
  return sent;
}
