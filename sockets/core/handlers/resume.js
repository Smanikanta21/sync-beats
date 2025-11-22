module.exports = function handleResume({ room, msg }) {
  const resumeDelayMs = msg.startDelayMs || 400;
  const payload = room.resume(resumeDelayMs);
  broadcast(room, payload);
};

function broadcast(room, payload, excludeWs = null) {
  for (const client of room.clients) {
    if (client.readyState === 1 && client !== excludeWs) {
      try { client.send(JSON.stringify(payload)); } catch {}
    }
  }
}
