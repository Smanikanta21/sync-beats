module.exports = function handleSeek({ room, msg }) {
  const seekPosition = msg.seekPositionMs || 0;
  const payload = room.seek(seekPosition);
  broadcast(room, payload);
};

function broadcast(room, payload, excludeWs = null) {
  for (const client of room.clients) {
    if (client.readyState === 1 && client !== excludeWs) {
      try { client.send(JSON.stringify(payload)); } catch {}
    }
  }
}
