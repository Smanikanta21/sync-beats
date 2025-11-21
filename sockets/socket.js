const { WebSocketServer } = require("ws");
const { createLogger } = require("./lib/logger");
const BackupManager = require("./managers/BackupManager");
const PrecisionClock = require("./lib/PrecisionClock");

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
      this.startedAtServer = null;
      this.duration = null;
      this.isPaused = false;
      this.pausedAt = null;
      this.createdAt = Date.now();
      this.pendingPlayHandshake = null;
      logger.debug(`📦 Room created: ${roomCode}`, { hostId });
    }

    getPlaybackPosition() {
      if (!this.startedAtServer || this.isPaused) {
        return this.pausedAt ? this.pausedAt : 0;
      }
      return PrecisionClock.now() - this.startedAtServer;
    }

    isTrackActive() {
      return this.currentTrack !== null && !this.isPaused;
    }
  }

  class DeviceReadinessTracker {
    constructor() {
      this.deviceStatus = new Map();
    }
    markReady(wsId) {
      const status = this.deviceStatus.get(wsId) || { ready: false, loadedTracks: new Set(), lastCheck: 0 };
      status.ready = true;
      status.lastCheck = Date.now();
      this.deviceStatus.set(wsId, status);
    }
    markLoading(wsId) {
      const status = this.deviceStatus.get(wsId) || { ready: false, loadedTracks: new Set(), lastCheck: 0 };
      status.ready = false;
      this.deviceStatus.set(wsId, status);
    }
    trackLoaded(wsId, trackUrl) {
      const status = this.deviceStatus.get(wsId) || { ready: false, loadedTracks: new Set(), lastCheck: 0 };
      status.loadedTracks.add(trackUrl);
      this.deviceStatus.set(wsId, status);
    }
    isReady(wsId) {
      const status = this.deviceStatus.get(wsId);
      return !!(status && status.ready);
    }
    removeDevice(wsId) {
      this.deviceStatus.delete(wsId);
    }
    allReady(room) {
      for (const client of room.clients) {
        if (!this.isReady(client._id)) return false;
      }
      return true;
    }
  }

  const deviceReadiness = new DeviceReadinessTracker();

  function sendDeviceHealthCheck(room) {
    const checkId = Math.random().toString(36).slice(2, 9);
    logger.debug(`🏥 Sending health check to all devices`, { roomCode: room.roomCode, checkId, deviceCount: room.clients.size });
    broadcast(room, { type: "device_health_check", checkId, timestamp: Date.now() });
    return checkId;
  }

  function calculateTimeOffset(t0, serverTime, t1) {
    const rtt = t1 - t0;
    const clientServerOffset = serverTime - (t0 + rtt / 2);
    return clientServerOffset;
  }

  function sendTimePong(ws, msg, room) {
    const serverTimeMonotonic = PrecisionClock.now();
    const serverTimeUnix = PrecisionClock.unixNow();
    const t1 = Date.now();
    const timeOffset = calculateTimeOffset(msg.t0, serverTimeUnix, t1);
    
    ws.send(JSON.stringify({
      type: "time_pong",
      id: msg.id,
      t0: msg.t0,
      serverTimeUnix: serverTimeUnix,
      serverTimeMonotonic: serverTimeMonotonic,
      timeOffset: timeOffset,
      playbackPosition: room?.getPlaybackPosition() || 0,
      isPlaying: room?.isTrackActive() || false,
      masterClock: serverTimeMonotonic
    }));
    
    logger.debug(`⏱️ Time pong sent`, { 
      clientId: ws._id, 
      timeOffset: `${timeOffset}ms`, 
      masterClock: `${serverTimeMonotonic.toFixed(0)}ms`
    })

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
        playbackPosition: playbackPosition,
        masterClockMs: PrecisionClock.now(),
        masterClockLatencyMs: 0
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

  function finalizePlay(room, audioUrl, duration, latencyHintMs = 0, startDelayMs = 500) {
    const startServerMonotonic = PrecisionClock.now() + startDelayMs;
    room.currentTrack = audioUrl;
    room.startedAtServer = startServerMonotonic;
    room.duration = duration;
    room.isPaused = false;
    room.pausedAt = null;
    room.pendingPlayHandshake = null;
    logger.info(`▶️ Playback starting`, { roomCode: room.roomCode, trackUrl: audioUrl.substring(0, 40), duration, startDelayMs, deviceCount: room.clients.size });
    broadcast(room, {
      type: "PLAY",
      audioUrl,
      duration,
      masterClockMs: startServerMonotonic,
      masterClockLatencyMs: latencyHintMs,
      startDelayMs,
      timestamp: Date.now()
    });
  }

  function handlePlayCommand(ws, msg, room) {
    const startDelayMs = msg.startDelayMs || 800; // Allow buffer for loading
    
    const checkId = sendDeviceHealthCheck(room);
    room.pendingPlayHandshake = {
      checkId,
      trackUrl: msg.audioUrl,
      duration: msg.duration,
      startDelayMs,
      responses: new Set(),
      initiatedAt: Date.now()
    };
    
    for (const client of room.clients) deviceReadiness.markLoading(client._id);
    logger.info(`🕒 Play handshake initiated`, { roomCode: room.roomCode, trackUrl: msg.audioUrl.substring(0,40), checkId, deviceCount: room.clients.size });
    
    broadcast(room, {
      type: "PREPARE_TRACK",
      audioUrl: msg.audioUrl,
      duration: msg.duration,
      checkId,
      timestamp: Date.now()
    });
    
    setTimeout(() => {
      if (!room.pendingPlayHandshake) return;
      const readyCount = room.pendingPlayHandshake.responses.size;
      logger.warn(`⏰ Play handshake timeout`, { roomCode: room.roomCode, readyCount, total: room.clients.size });
      finalizePlay(room, msg.audioUrl, msg.duration, msg.rttMs ? msg.rttMs / 2 : 0, startDelayMs);
    }, 5000);
  }

  function handlePauseCommand(ws, msg, room) {
    const pausePosition = room.getPlaybackPosition();
    room.isPaused = true;
    room.pausedAt = pausePosition;

    logger.info(`⏸️ Playback paused`, { 
      roomCode: room.roomCode, 
      position: pausePosition,
      deviceCount: room.clients.size
    })

    broadcast(room, {
      type: "PAUSE",
      pausedAtMs: pausePosition,
      masterClockMs: PrecisionClock.now(),
      timestamp: Date.now()
    });
  }

  function handleResumeCommand(ws, msg, room) {
    const resumeDelayMs = msg.startDelayMs || 400;
    const resumeServerMonotonic = PrecisionClock.now() + resumeDelayMs;
    const pausedAt = room.pausedAt || 0;
    room.isPaused = false;
    room.startedAtServer = resumeServerMonotonic - pausedAt;
    room.pausedAt = null;
    const playbackPosition = pausedAt;
    logger.info(`▶️ Playback resumed`, { roomCode: room.roomCode, playbackPosition, deviceCount: room.clients.size });
    broadcast(room, {
      type: "RESUME",
      masterClockMs: resumeServerMonotonic,
      resumeDelayMs,
      playbackPositionMs: playbackPosition,
      timestamp: Date.now()
    });
  }

  function handleSeekCommand(ws, msg, room) {
    const seekPosition = msg.seekPositionMs || 0;
    const seekDelayMs = 300;
    const seekServerMonotonic = PrecisionClock.now() + seekDelayMs;
    room.startedAtServer = seekServerMonotonic - seekPosition;
    room.pausedAt = null;
    logger.info(`⏩ Seek command`, { roomCode: room.roomCode, seekPosition: `${(seekPosition / 1000).toFixed(2)}s`, deviceCount: room.clients.size });
    broadcast(room, {
      type: "SEEK",
      seekPositionMs: seekPosition,
      masterClockMs: seekServerMonotonic,
      seekDelayMs,
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

        logger.debug(`📊 Sync check received`, { 
          roomCode: room.roomCode, 
          clientPos: `${clientReportedPosition.toFixed(0)}ms`,
          serverPos: `${actualServerPosition.toFixed(0)}ms`,
          drift: `${drift.toFixed(0)}ms`,
          isPlaying: room.isTrackActive()
        })

        
        if (drift > 1000) {
          logger.warn(`🔄 Large drift detected, resyncing`, { roomCode: room.roomCode, drift: `${drift.toFixed(0)}ms` })
          sendToClient(ws, {
            type: "RESYNC",
            correctPositionMs: actualServerPosition,
            masterClockMs: PrecisionClock.now(),
            timestamp: Date.now()
          });
        }
      }
      if (msg.type === "device_health_check_response" && room) {
        const { checkId, audioLoaded, deviceReady } = msg;
        logger.debug(`✅ Device health check response`, { checkId, wsId: ws._id, audioLoaded, deviceReady });
        if (deviceReady && audioLoaded) {
          deviceReadiness.markReady(ws._id);
          if (room.pendingPlayHandshake && room.pendingPlayHandshake.checkId === checkId) {
            room.pendingPlayHandshake.responses.add(ws._id);
            logger.debug(`📝 Play handshake response recorded`, { roomCode: room.roomCode, readyCount: room.pendingPlayHandshake.responses.size, total: room.clients.size });
            if (deviceReadiness.allReady(room)) {
              logger.info(`✅ All devices ready for playback`, { roomCode: room.roomCode });
              finalizePlay(room, room.pendingPlayHandshake.trackUrl, room.pendingPlayHandshake.duration, msg.rttMs ? msg.rttMs / 2 : 0, room.pendingPlayHandshake.startDelayMs);
            }
          }
          broadcast(room, { type: "device_ready", wsId: ws._id, timestamp: Date.now() }, ws);
        }
      }
      if (msg.type === "track_prepared" && room) {
        
        logger.debug(`🎬 Track prepared acknowledged`, { wsId: ws._id, roomCode: room.roomCode });
      }
      if (msg.type === "audio_loading_status" && room) {
        const { trackUrl, isLoaded } = msg;
        if (isLoaded) {
          deviceReadiness.trackLoaded(ws._id, trackUrl);
          logger.debug(`📦 Audio loaded on device`, { wsId: ws._id, trackUrl: trackUrl.substring(0, 40) });
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

