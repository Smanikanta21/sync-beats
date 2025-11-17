const { WebSocketServer } = require("ws");

module.exports = function createSyncEngine(server) {
  const wss = new WebSocketServer({ server });

  // liveRooms: roomCode → { clients:Set, hostUserId, currentTrack, startedAt, duration }
  const liveRooms = new Map();

  function broadcast(room, data) {
    let sent = 0;
    for (const client of room.clients) {
      if (client.readyState === 1) {
        client.send(JSON.stringify(data));
        sent++;
      }
    }
    console.log(`📡 Broadcasted to ${sent}/${room.clients.size} clients:`, data.type);
  }

  function joinLiveRoom(ws, roomCode, userId, hostId) {

    if (!liveRooms.has(roomCode)) {
      liveRooms.set(roomCode, {
        clients: new Set(),
        hostUserId: hostId,
        currentTrack: null,
        startedAt: null,
        duration: null
      });
    }

    const room = liveRooms.get(roomCode); // <-- MUST COME FIRST

    // State Restore for new client
    if (room.currentTrack && room.startedAt) {
      ws.send(JSON.stringify({
        type: "PLAY",
        audioUrl: room.currentTrack,
        startServerMs: room.startedAt,
        duration: room.duration
      }));
    }

    room.clients.add(ws);

    room.hostUserId = hostId;
    ws._userId = userId;

    ws.send(JSON.stringify({
      type: "joined",
      roomCode,
      yourId: ws._id,
      hostUserId: room.hostUserId,
      isHost: userId === room.hostUserId
    }));

    broadcast(room, {
      type: "user_joined",
      userId,
      totalClients: room.clients.size
    });

    console.log(`✅ User joined room ${roomCode}. Total: ${room.clients.size}, Host: ${room.hostUserId}, IsHost: ${userId === room.hostUserId}`);
  }

  function sendPong(ws, msg) {
    ws.send(JSON.stringify({
      type: "time_pong",
      id: msg.id,
      t0: msg.t0,
      serverTime: Date.now(),
    }));
  }

  wss.on("connection", (ws) => {
    ws._id = Math.random().toString(36).slice(2, 9);
    console.log("WS connected:", ws._id);
    console.log("🟢 New websocket connection established");

    ws.on("message", (data) => {
      let msg = {};
      try { msg = JSON.parse(data); } catch { return; }

      // JOIN
      if (msg.type === "join") {
        ws._room = msg.roomCode;
        ws._userId = msg.userId;

        console.log("📥 JOIN received:", { userId: msg.userId, hostId: msg.hostId, roomCode: msg.roomCode });
        joinLiveRoom(ws, msg.roomCode, msg.userId, msg.hostId);
      }

      // CLOCK SYNC
      if (msg.type === "time_ping") {
        sendPong(ws, msg);
      }

      // PLAY
      if (msg.type === "PLAY") {
        const room = liveRooms.get(ws._room);
        if (!room) {
          console.error("❌ PLAY: Room not found for", ws._room);
          return;
        }

        console.log("🎵 PLAY received - Checking authorization:", {
          requestingUserId: ws._userId,
          hostUserId: room.hostUserId,
          isAuthorized: ws._userId === room.hostUserId
        });

        // Only host can trigger PLAY
        if (room.hostUserId !== ws._userId) {
          console.error("❌ PLAY: Unauthorized - only host can play. User:", ws._userId, "Host:", room.hostUserId);
          return;
        }

        const startServerMs = Date.now() + msg.startDelayMs;

        // Save state
        room.currentTrack = msg.audioUrl;
        room.startedAt = startServerMs;
        room.duration = msg.duration;

        console.log("✅ PLAY: Broadcasting to all clients in room", ws._room, "- Total:", room.clients.size);

        // Broadcast PLAY to all (including host)
        broadcast(room, {
          type: "PLAY",
          audioUrl: msg.audioUrl,
          startServerMs,
          duration: msg.duration
        });
      }
    });

    // CLEANUP
    ws.on("close", () => {
      const room = liveRooms.get(ws._room);
      if (!room) return;

      console.log(`User disconnected wsId=${ws._id} from room=${ws._room}`);
      room.clients.delete(ws);

      if (room.clients.size === 0) {
        liveRooms.delete(ws._room);
      }
    });
  });

  return wss;
};