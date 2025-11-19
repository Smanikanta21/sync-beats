const { WebSocketServer } = require("ws");
const { createLogger } = require("./lib/logger");
const BackupManager = require("./managers/BackupManager");

const logger = createLogger("SyncEngine");

module.exports = function createSyncEngine(server) {
  const wss = new WebSocketServer({ server });
  const liveRooms = new Map();

  class Room {
    constructor(roomCode, hostId) {
      this.roomCode = roomCode;
      this.clients = new Set();
      this.hostUserId = hostId;
      
      this.currentTrack = null;
      this.startedAt = null;
      this.duration = null;
      this.isPaused = false;
      this.pausedAt = null;
      this.createdAt = Date.now();
      
      logger.debug(`📦 Room created: ${roomCode}`, { hostId })
    }

    getPlaybackPosition() {
      if (!this.startedAt || this.isPaused) {
        return this.pausedAt ? this.pausedAt - this.startedAt : 0;
      }
      return Date.now() - this.startedAt;
    }

    isTrackActive() {
      return this.currentTrack !== null && !this.isPaused;
    }
  }

  function calculateTimeOffset(t0, serverTime, t1) {
    const rtt = t1 - t0;
    const clientServerOffset = serverTime - (t0 + rtt / 2);
    return clientServerOffset;
  }

  function sendTimePong(ws, msg, room) {
    const serverTime = Date.now();
    const t1 = Date.now();
    const timeOffset = calculateTimeOffset(msg.t0, serverTime, t1);
    
    ws.send(JSON.stringify({
      type: "time_pong",
      id: msg.id,
      t0: msg.t0,
      serverTime: serverTime,
      timeOffset: timeOffset,
      playbackPosition: room?.getPlaybackPosition() || 0,
      isPlaying: room?.isTrackActive() || false
    }));
    
    logger.debug(`⏱️ Time pong sent`, { clientId: ws._id, timeOffset: `${timeOffset}ms`, drift: msg.t0 ? Date.now() - msg.t0 : 'N/A' })
  }
  function broadcast(room, data, excludeWs = null) {
    let sent = 0;
    for (const client of room.clients) {
      if (client.readyState === 1 && client !== excludeWs) {
        try {
          client.send(JSON.stringify(data));
          sent++;
        } catch (error) {
          logger.warn(`Failed to send message to client`, { clientId: client._id, error: error.message })
        }
      }
    }
    logger.debug(`📤 Broadcast sent`, { roomCode: room.roomCode, type: data.type, clientsNotified: sent })
    return sent;
  }

  function sendToClient(ws, data) {
    if (ws.readyState === 1) {
      try {
        ws.send(JSON.stringify(data));
        logger.debug(`📨 Message sent to client`, { clientId: ws._id, type: data.type })
      } catch (error) {
        logger.error(`Failed to send message to client`, error)
      }
    }
  }

  function joinLiveRoom(ws, roomCode, userId, hostId) {
    if (!liveRooms.has(roomCode)) {
      liveRooms.set(roomCode, new Room(roomCode, hostId));
      logger.info(`✨ New room created`, { roomCode, hostId })
    }

    const room = liveRooms.get(roomCode);
    room.clients.add(ws);
    room.hostUserId = hostId;
    
    ws._userId = userId;
    ws._wsId = ws._id;
    ws._room = roomCode;

    logger.info(`👤 User joined room`, { roomCode, userId, totalClients: room.clients.size })

    sendToClient(ws, {
      type: "joined",
      roomCode,
      wsId: ws._id,
      hostUserId: room.hostUserId,
      isHost: userId === room.hostUserId,
      timestamp: Date.now()
    });

    if (room.isTrackActive()) {
      const playbackPosition = room.getPlaybackPosition();
      logger.debug(`🎵 Syncing new client with current playback`, { roomCode, playbackPosition })
      sendToClient(ws, {
        type: "PLAY_SYNC",
        audioUrl: room.currentTrack,
        duration: room.duration,
        playbackPosition: playbackPosition, // How many ms into the track
        startServerMs: room.startedAt,
        serverNow: Date.now()
      });
    }

    broadcast(room, {
      type: "user_joined",
      userId,
      wsId: ws._id,
      totalClients: room.clients.size,
      timestamp: Date.now()
    }, ws);
  }

  function handlePlayCommand(ws, msg, room) {
    const startDelayMs = msg.startDelayMs || 200

    room.currentTrack = msg.audioUrl;
    room.startedAt = Date.now() + startDelayMs;
    room.duration = msg.duration;
    room.isPaused = false;
    room.pausedAt = null;

    logger.info(`▶️ Playback started`, { roomCode: room.roomCode, trackUrl: msg.audioUrl.substring(0, 40), duration: msg.duration })

    broadcast(room, {
      type: "PLAY",
      audioUrl: msg.audioUrl,
      duration: msg.duration,
      startServerMs: room.startedAt,
      serverNow: Date.now(),
      startDelayMs: startDelayMs,
      timestamp: Date.now()
    });
  }

  function handlePauseCommand(ws, msg, room) {
    const pausePosition = room.getPlaybackPosition();
    room.isPaused = true;
    room.pausedAt = pausePosition;

    logger.info(`⏸️ Playback paused`, { roomCode: room.roomCode, position: pausePosition })

    broadcast(room, {
      type: "PAUSE",
      pausedAt: pausePosition,
      timestamp: Date.now()
    });
  }

  function handleResumeCommand(ws, msg, room) {
    const resumeDelayMs = 100;
    const resumeServerMs = Date.now() + resumeDelayMs;

    room.isPaused = false;
    room.startedAt = resumeServerMs - (room.pausedAt || 0);
    room.pausedAt = null;

    logger.info(`▶️ Playback resumed`, { roomCode: room.roomCode, fromPosition: room.pausedAt })

    broadcast(room, {
      type: "RESUME",
      resumeServerMs: resumeServerMs,
      serverNow: Date.now(),
      timestamp: Date.now()
    });
  }

  function handleSeekCommand(ws, msg, room) {
    const seekPosition = msg.seekPositionMs || 0;
    const seekDelayMs = 150;
    const seekServerMs = Date.now() + seekDelayMs;

    room.startedAt = seekServerMs - seekPosition;
    room.pausedAt = null;

    logger.info(`⏩ Seek command`, { roomCode: room.roomCode, seekPosition: `${(seekPosition / 1000).toFixed(2)}s` })

    broadcast(room, {
      type: "SEEK",
      seekPositionMs: seekPosition,
      seekServerMs: seekServerMs,
      serverNow: Date.now(),
      timestamp: Date.now()
    });
  }

  wss.on("connection", (ws) => {
    ws._id = Math.random().toString(36).slice(2, 9);

    ws.on("message", (data) => {
      let msg = {};
      try {
        msg = JSON.parse(data);
      } catch (err) {
        logger.warn(`Invalid JSON message received`, { error: err.message })
        return;
      }

      const room = liveRooms.get(msg.roomCode);

      if (msg.type === "join") {
        joinLiveRoom(ws, msg.roomCode, msg.userId, msg.hostId);
      }

      if (msg.type === "time_ping") {
        sendTimePong(ws, msg, room);
      }

      if (msg.type === "PLAY" && room) {
        handlePlayCommand(ws, msg, room);
      }

      if (msg.type === "PAUSE" && room) {
        handlePauseCommand(ws, msg, room);
      }

      if (msg.type === "RESUME" && room) {
        handleResumeCommand(ws, msg, room);
      }

      if (msg.type === "SEEK" && room) {
        handleSeekCommand(ws, msg, room);
      }

      if (msg.type === "TRACK_CHANGE" && room) {
        logger.info(`🎵 Track changed`, { roomCode: room.roomCode, title: msg.trackData?.title })
        broadcast(room, {
          type: "TRACK_CHANGE",
          trackData: msg.trackData,
          timestamp: Date.now()
        });
      }

      if (msg.type === "get_playback_state" && room) {
        sendToClient(ws, {
          type: "playback_state",
          currentTrack: room.currentTrack,
          playbackPosition: room.getPlaybackPosition(),
          isPlaying: room.isTrackActive(),
          duration: room.duration,
          serverNow: Date.now(),
          timestamp: Date.now()
        });
      }

      if (msg.type === "sync_check" && room) {
        const clientReportedPosition = msg.clientPosition;
        const actualServerPosition = room.getPlaybackPosition();
        const drift = Math.abs(clientReportedPosition - actualServerPosition);

        if (drift > 500) {
          logger.warn(`🔄 Large drift detected, resyncing`, { roomCode: room.roomCode, drift: `${drift.toFixed(0)}ms` })
          sendToClient(ws, {
            type: "RESYNC",
            correctPosition: actualServerPosition,
            serverNow: Date.now(),
            timestamp: Date.now()
          });
        }
      }
    });

    ws.on("close", () => {
      const room = liveRooms.get(ws._room);
      if (!room) return;

      room.clients.delete(ws);
      logger.info(`👋 User disconnected`, { roomCode: ws._room, userId: ws._userId, remainingClients: room.clients.size })

      if (room.clients.size === 0) {
        liveRooms.delete(ws._room);
        logger.info(`🗑️ Empty room deleted`, { roomCode: ws._room })
      } else {
        broadcast(room, {
          type: "user_left",
          userId: ws._userId,
          wsId: ws._id,
          totalClients: room.clients.size
        });
      }
    });

    ws.on("error", (error) => {
      logger.error(`❌ WebSocket error`, error)
      try {
        ws.close(1011, 'Server error')
      } catch (e) {
        logger.warn(`Failed to close WebSocket gracefully`, { error: e.message })
      }
    });
  });

  logger.info("🟢 WebSocket server initialized");

  return wss;
};
