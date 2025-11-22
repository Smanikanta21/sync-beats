const { TYPES } = require("../MessageTypes");

module.exports = function handlePause({ room }) {
  const payload = room.pause();
  broadcast(room, payload);
  // Reliability: follow-up pause state snapshot ensures high-latency clients receive authoritative paused position.
  setTimeout(() => {
    try {
      const pausedState = {
        type: require("../MessageTypes").TYPES.PAUSE_STATE,
        audioUrl: room.currentTrack,
        duration: room.duration,
        pausedPositionMs: room.pausedAt || 0,
        isPlaying: false,
        masterClockMs: require("../../lib/PrecisionClock").now(),
        timestamp: Date.now()
      };
      broadcast(room, pausedState);
    } catch {}
  }, 300);
};

function broadcast(room, payload, excludeWs = null) {
  for (const client of room.clients) {
    if (client.readyState === 1 && client !== excludeWs) {
      try { client.send(JSON.stringify(payload)); } catch {}
    }
  }
}
