require('dotenv').config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const createSyncEngine = require("./socket");
// Backup manager for periodic state persistence and restore
const BackupManager = require("./managers/BackupManager");
const SyncRoom = require("./core/SyncRoom");
const PrecisionClock = require("./lib/PrecisionClock");
// Removed structured logger; lightweight console-based logger
const logger = {
  info: (...a) => console.log(...a),
  warn: (...a) => console.warn(...a),
  error: (...a) => console.error(...a)
};

const app = express();
// CORS for HTTP endpoints and WebSocket upgrade preflight (if any proxies call it)
app.use(cors({
  origin: '*',
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Origin','X-Requested-With','Content-Type','Accept','Range'],
}));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
const server = http.createServer(app);

let wss = null;
let getRooms = null;

try {
  const engine = createSyncEngine(server);
  wss = engine.wss;
  getRooms = engine.getRooms;
  logger.info("Sync engine initialized (with room accessor)");
  // Attempt restore from last backup
  try {
    const backup = BackupManager.loadLastBackup();
    if (backup && Array.isArray(backup.rooms) && backup.rooms.length) {
      const roomsMap = getRooms(); // reference to live rooms map
      const generatedAtMs = Date.parse(backup.generatedAt) || Date.now();
      const downtimeMs = Date.now() - generatedAtMs;
      let restored = 0;
      for (const r of backup.rooms) {
        if (!r.roomCode) continue;
        const room = new SyncRoom(r.roomCode, r.hostUserId || null);
        if (r.currentTrack) {
          room.currentTrack = r.currentTrack;
          room.trackData = r.trackData || null;
          room.duration = r.duration || null;
          const savedPos = typeof r.playbackPosition === 'number' ? r.playbackPosition : (r.pausedAt || 0);
          if (r.isPaused) {
            room.isPaused = true;
            room.pausedAt = savedPos;
            room.startedAtServer = null;
          } else {
            // Advance position by downtime, clamp to duration
            let position = savedPos + downtimeMs;
            if (room.duration && position > room.duration) {
              position = room.duration;
              room.isPaused = true;
              room.pausedAt = position;
              room.startedAtServer = null;
            } else {
              room.isPaused = false;
              room.pausedAt = null;
              room.startedAtServer = PrecisionClock.now() - position;
            }
          }
        }
        roomsMap.set(r.roomCode, room);
        restored++;
      }
      if (restored) {
        logger.info(`♻️ Restored ${restored} room(s) from backup (downtime ${downtimeMs}ms)`);
      }
    }
  } catch (e) {
    logger.warn('Restore from backup failed', e.message);
  }
} catch (error) {
  logger.error("Failed to initialize sync engine", error);
  process.exit(1);
}

const gracefulShutdown = async () => {
  logger.info("\n⚠️ Shutting down gracefully...");
  
  try {
    if (wss && getRooms) {
      await BackupManager.backupState(getRooms());
      logger.info("State backed up before shutdown");
    }
    
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
    
    setTimeout(() => {
      logger.warn("Force exiting after 10 second timeout");
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    logger.error("Error during shutdown", error);
    process.exit(1);
  }
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", error);
  gracefulShutdown();
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection", reason);
  gracefulShutdown();
});

const BACKUP_INTERVAL_MS = 60 * 1000;
setInterval(async () => {
  try {
    if (getRooms) await BackupManager.backupState(getRooms());
  } catch (error) {
    logger.error("Periodic backup failed", error);
  }
}, BACKUP_INTERVAL_MS);

const port = process.env.PORT || 6001;
server.listen(port, () => {
  logger.info(`Server running on http://localhost:${port}`);
  logger.info(`🟢 WebSocket ready on ws://localhost:${port}`);
});