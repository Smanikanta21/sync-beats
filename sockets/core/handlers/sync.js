module.exports = function handleSync({ ws, room }) {
  const snapshot = room.syncSnapshot();
  if (ws.readyState === 1) {
    try { ws.send(JSON.stringify(snapshot)); } catch {}
  }
};
