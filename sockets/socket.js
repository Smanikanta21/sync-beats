const { WebSocketServer } = require("ws");
const PrecisionClock = require("./lib/PrecisionClock");
const SyncRoom = require("./core/SyncRoom");
const DeviceReadinessTracker = require("./core/DeviceReadinessTracker");
const { TYPES, CONSTANTS } = require("./core/MessageTypes");
const handlePlay = require("./core/handlers/play");
const handlePause = require("./core/handlers/pause");
const handleResume = require("./core/handlers/resume");
const handleSeek = require("./core/handlers/seek");


const logger = {
  debug: (...args) => { if (process.env.SYNC_DEBUG) console.debug(...args); },
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args)
};

module.exports = function createSyncEngine(server) {
  const wss = new WebSocketServer({ server });
  const liveRooms = new Map();
  const deviceReadiness = new DeviceReadinessTracker();

  function sendDeviceHealthCheck(room) {
    const checkId = Math.random().toString(36).slice(2, 9);
    broadcast(room, { type: TYPES.DEVICE_HEALTH_CHECK, checkId, timestamp: Date.now() });
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
      type: TYPES.TIME_PONG,
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
    if (!liveRooms.has(roomCode)) liveRooms.set(roomCode, new SyncRoom(roomCode, hostId));
    const room = liveRooms.get(roomCode);
    room.clients.add(ws);
    room.hostUserId = hostId;
    ws._userId = userId;
    ws._wsId = ws._id;
    ws._room = roomCode;
    sendToClient(ws, {
      type: TYPES.JOINED,
      roomCode,
      wsId: ws._id,
      hostUserId: room.hostUserId,
      isHost: userId === room.hostUserId,
      timestamp: Date.now()
    });
    // Immediately send authoritative snapshot so reconnecting clients sync state
    try {
      const snapshot = room.syncSnapshot();
      sendToClient(ws, snapshot);
    } catch (e) {
      logger.warn('Failed to send join snapshot', e.message);
    }
    broadcast(room, {
      type: TYPES.USER_JOINED,
      userId,
      wsId: ws._id,
      totalClients: room.clients.size,
      timestamp: Date.now()
    }, ws);
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

      if (msg.type === "join") joinLiveRoom(ws, msg.roomCode, msg.userId, msg.hostId);

      if (msg.type === TYPES.TIME_PING) sendTimePong(ws, msg, room);

      if (msg.type === TYPES.PLAY && room) handlePlay({ ws, msg, room, readiness: deviceReadiness });

      if (msg.type === TYPES.PAUSE && room) handlePause({ ws, msg, room });

      if (msg.type === TYPES.RESUME && room) handleResume({ ws, msg, room });

      if (msg.type === TYPES.SEEK && room) handleSeek({ ws, msg, room });

      if (msg.type === TYPES.TRACK_CHANGE && room) {
        logger.info(`🎵 Track changed`, { roomCode: room.roomCode, title: msg.trackData?.title })
        // Persist metadata in room for late joiners
        try { room.setTrackMetadata(msg.trackData); } catch {}
        broadcast(room, {
          type: TYPES.TRACK_CHANGE,
          trackData: msg.trackData,
          timestamp: Date.now()
        });
      }

      if (msg.type === TYPES.GET_PLAYBACK_STATE && room) {
        const scheduleLeadMs = 700;
        const nowMono = PrecisionClock.now();
        const currentPos = room.getPlaybackPosition();
        if (room.currentTrack) {
          if (room.isTrackActive()) {
            // Provide a PLAY_SYNC style response for late join
            sendToClient(ws, {
              type: TYPES.PLAY_SYNC,
              audioUrl: room.currentTrack,
              duration: room.duration,
              playbackPosition: currentPos + scheduleLeadMs,
              masterClockMs: nowMono + scheduleLeadMs,
              masterClockLatencyMs: 0,
              isPlaying: true,
              timestamp: Date.now()
            });
          } else {
            // Paused state snapshot
            sendToClient(ws, {
              type: TYPES.PAUSE_STATE,
              audioUrl: room.currentTrack,
              duration: room.duration,
              pausedPositionMs: currentPos,
              isPlaying: false,
              masterClockMs: nowMono,
              startedAtServer: room.startedAtServer,
              timestamp: Date.now()
            });
          }
        } else {
          sendToClient(ws, {
            type: "playback_state",
            currentTrack: null,
            isPlaying: false,
            playbackPosition: 0,
            duration: null,
            serverNow: Date.now(),
            timestamp: Date.now()
          });
        }
      }
      if (msg.type === TYPES.REQUEST_SYNC && room) {
        // Alias for get_playback_state
        const scheduleLeadMs = 700;
        const nowMono = PrecisionClock.now();
        const currentPos = room.getPlaybackPosition();
        if (room.currentTrack && room.isTrackActive()) {
          sendToClient(ws, {
            type: TYPES.PLAY_SYNC,
            audioUrl: room.currentTrack,
            duration: room.duration,
            playbackPosition: currentPos + scheduleLeadMs,
            masterClockMs: nowMono + scheduleLeadMs,
            masterClockLatencyMs: 0,
            isPlaying: true,
            timestamp: Date.now()
          });
        }
      }

      if (msg.type === TYPES.SYNC_CHECK && room) {
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

        
        if (drift > CONSTANTS.LARGE_DRIFT_MS) {
          logger.warn(`🔄 Large drift detected, resyncing`, { roomCode: room.roomCode, drift: `${drift.toFixed(0)}ms` })
          sendToClient(ws, {
            type: TYPES.RESYNC,
            correctPositionMs: actualServerPosition,
            masterClockMs: PrecisionClock.now(),
            timestamp: Date.now()
          });
        }
      }
      if (msg.type === "device_health_check_response" && room) {
        const { checkId, audioLoaded, deviceReady } = msg;
        logger.debug(`Device health check response`, { checkId, wsId: ws._id, audioLoaded, deviceReady });
        if (deviceReady && audioLoaded) {
          deviceReadiness.markReady(ws._id);
          if (room.pendingPlayHandshake && room.pendingPlayHandshake.checkId === checkId) {
            room.pendingPlayHandshake.responses.add(ws._id);
            logger.debug(`📝 Play handshake response recorded`, { roomCode: room.roomCode, readyCount: room.pendingPlayHandshake.responses.size, total: room.clients.size });
            if (deviceReadiness.allReady(room)) {
              logger.info(`All devices ready for playback`, { roomCode: room.roomCode });
              // Small extra lead for scheduling across devices
              const lead = 800;
              const latencyHintMs = msg.rttMs ? msg.rttMs / 2 : 0;
              const playPayload = room.finalizePlay(latencyHintMs, (room.pendingPlayHandshake.startDelayMs || CONSTANTS.DEFAULT_PLAY_LEAD_MS) + lead);
              broadcast(room, playPayload);
            }
          }
          broadcast(room, { type: TYPES.DEVICE_READY, wsId: ws._id, timestamp: Date.now() }, ws);

          // If playback already active and this is a late readiness after finalize, fast-sync this device
          if (!room.pendingPlayHandshake && room.isTrackActive()) {
            const playbackPosition = room.getPlaybackPosition();
            sendToClient(ws, {
              type: TYPES.PLAY_SYNC,
              audioUrl: room.currentTrack,
              duration: room.duration,
              playbackPosition: playbackPosition,
              masterClockMs: PrecisionClock.now(),
              masterClockLatencyMs: 0
            });
          }
        }
      }
      // Removed legacy track_prepared & audio_loading_status handling
    });

    ws.on("close", () => {
      const room = liveRooms.get(ws._room);
      if (!room) return;

      room.clients.delete(ws);
      if (room.clients.size === 0) {
        liveRooms.delete(ws._room);
      } else {
        broadcast(room, {
          type: TYPES.USER_LEFT,
          userId: ws._userId,
          wsId: ws._id,
          totalClients: room.clients.size
        });
      }
    });

    ws.on("error", (error) => {
      logger.error(`WebSocket error`, error)
      try {
        ws.close(1011, 'Server error')
      } catch (e) {
        logger.warn(`Failed to close WebSocket gracefully`, { error: e.message })
      }
    });
  });

  logger.info("🟢 WebSocket server initialized (modular sync)");

  return { wss, getRooms: () => liveRooms };
};

