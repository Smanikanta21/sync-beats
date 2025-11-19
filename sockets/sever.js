require('dotenv').config();
const express = require("express");
const http = require("http");
const createSyncEngine = require("./socket");
const { createLogger } = require("./lib/logger");
const BackupManager = require("./managers/BackupManager");

const logger = createLogger("Server");

const app = express();
const server = http.createServer(app);

let wss = null;
let liveRooms = new Map();

try {
  wss = createSyncEngine(server);
  logger.info("✅ Sync engine initialized");
} catch (error) {
  logger.error("Failed to initialize sync engine", error);
  process.exit(1);
}

const gracefulShutdown = async () => {
  logger.info("\n⚠️ Shutting down gracefully...");
  
  try {
    if (wss) {
      await BackupManager.backupState(liveRooms);
      logger.info("✅ State backed up before shutdown");
    }
    
    server.close(() => {
      logger.info("✅ Server closed");
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
  logger.error("❌ Uncaught exception", error);
  gracefulShutdown();
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("❌ Unhandled rejection", reason);
  gracefulShutdown();
});

const BACKUP_INTERVAL_MS = 60 * 1000;
setInterval(async () => {
  try {
    await BackupManager.backupState(liveRooms);
  } catch (error) {
    logger.error("Periodic backup failed", error);
  }
}, BACKUP_INTERVAL_MS);

const port = process.env.PORT || 6001;
server.listen(port, () => {
  logger.info(`✅ Server running on http://localhost:${port}`);
  logger.info(`🟢 WebSocket ready on ws://localhost:${port}`);
});