const fs = require('fs').promises
const path = require('path')
const { createLogger } = require('../lib/logger')

const logger = createLogger('BackupManager')

const BACKUP_DIR = path.join(process.cwd(), 'backups')
const BACKUP_FILE = 'room-state.json'

class BackupManager {
  static async backupState(roomsMap) {
    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true })

      const backupData = {
        timestamp: Date.now(),
        rooms: {},
      }

      for (const [roomCode, room] of roomsMap.entries()) {
        backupData.rooms[roomCode] = {
          roomCode: room.roomCode,
          hostUserId: room.hostUserId,
          currentTrack: room.currentTrack,
          startedAt: room.startedAt,
          duration: room.duration,
          isPaused: room.isPaused,
          pausedAt: room.pausedAt,
          createdAt: room.createdAt || Date.now(),
          clientCount: room.clients.size,
        }
      }

      const backupPath = path.join(BACKUP_DIR, BACKUP_FILE)
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2))
      
      logger.debug(`✅ State backed up - ${Object.keys(backupData.rooms).length} rooms`)
      return true
    } catch (error) {
      logger.error('Failed to backup state', error)
      return false
    }
  }

  static async restoreState() {
    try {
      const backupPath = path.join(BACKUP_DIR, BACKUP_FILE)
      await fs.access(backupPath)
      
      const data = await fs.readFile(backupPath, 'utf-8')
      const backupData = JSON.parse(data)
      
      logger.info(`✅ State restored from backup - ${Object.keys(backupData.rooms).length} rooms`, {
        timestamp: new Date(backupData.timestamp).toISOString(),
      })
      
      return backupData
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('No backup file found - starting with fresh state')
      } else {
        logger.warn('Failed to restore from backup', error)
      }
      return null
    }
  }

  static async cleanOldBackups(maxBackups = 5) {
    try {
      const files = await fs.readdir(BACKUP_DIR)
      const backupFiles = files.filter(f => f.startsWith('room-state')).sort().reverse()
      
      if (backupFiles.length > maxBackups) {
        const filesToDelete = backupFiles.slice(maxBackups)
        for (const file of filesToDelete) {
          await fs.unlink(path.join(BACKUP_DIR, file))
          logger.debug(`Deleted old backup: ${file}`)
        }
      }
    } catch (error) {
      logger.warn('Failed to clean old backups', error)
    }
  }

  static async getBackupStats() {
    try {
      const backupPath = path.join(BACKUP_DIR, BACKUP_FILE)
      const stats = await fs.stat(backupPath)
      const data = await fs.readFile(backupPath, 'utf-8')
      const backupData = JSON.parse(data)
      
      return {
        exists: true,
        size: stats.size,
        lastModified: new Date(stats.mtime),
        roomCount: Object.keys(backupData.rooms).length,
        backupTimestamp: new Date(backupData.timestamp),
      }
    } catch (error) {
      return { exists: false, error: error.message }
    }
  }
}

module.exports = BackupManager
