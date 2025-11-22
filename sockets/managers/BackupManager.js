const fs = require('fs');
const path = require('path');

// Lightweight backup manager: periodically serialize in-memory room state to disk.
// This is intentionally minimal and non-blocking; writes are atomic via a temp file rename.
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
const BACKUP_FILE = process.env.BACKUP_FILE || path.join(BACKUP_DIR, 'state-backup.json');

function ensureDir() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  } catch (err) {
    console.error('BackupManager: failed to ensure backup directory', err);
  }
}

function serializeRooms(roomsMap) {
  const out = [];
  if (!roomsMap || typeof roomsMap.forEach !== 'function') return out;
  roomsMap.forEach((room, roomCode) => {
    out.push({
      roomCode,
      hostUserId: room.hostUserId || null,
      clientCount: room.clients ? room.clients.size : 0,
      currentTrack: room.currentTrack || null,
      trackData: room.trackData || null,
      duration: room.duration || null,
      startedAtServer: room.startedAtServer || null,
      isPaused: !!room.isPaused,
      pausedAt: room.pausedAt || null,
      createdAt: room.createdAt || null,
      playbackPosition: typeof room.getPlaybackPosition === 'function' ? room.getPlaybackPosition() : (room.pausedAt || 0),
      pendingHandshake: room.pendingPlayHandshake ? {
        trackUrl: room.pendingPlayHandshake.trackUrl,
        duration: room.pendingPlayHandshake.duration,
        startDelayMs: room.pendingPlayHandshake.startDelayMs,
        responsesCount: room.pendingPlayHandshake.responses ? room.pendingPlayHandshake.responses.size : 0,
        initiatedAt: room.pendingPlayHandshake.initiatedAt
      } : null
    });
  });
  return out;
}

async function backupState(roomsMap) {
  ensureDir();
  const payload = {
    generatedAt: new Date().toISOString(),
    rooms: serializeRooms(roomsMap)
  };
  const tmpFile = BACKUP_FILE + '.tmp';
  return new Promise((resolve, reject) => {
    fs.writeFile(tmpFile, JSON.stringify(payload, null, 2), 'utf8', (err) => {
      if (err) return reject(err);
      fs.rename(tmpFile, BACKUP_FILE, (renameErr) => {
        if (renameErr) return reject(renameErr);
        resolve(payload);
      });
    });
  });
}

function loadLastBackup() {
  try {
    if (!fs.existsSync(BACKUP_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
    return data;
  } catch (err) {
    console.error('BackupManager: failed to load backup', err);
    return null;
  }
}

module.exports = { backupState, loadLastBackup };
