const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
}

const LOG_COLORS = {
  DEBUG: '\x1b[36m',
  INFO: '\x1b[32m',
  WARN: '\x1b[33m',
  ERROR: '\x1b[31m',
  RESET: '\x1b[0m',
}

const currentLogLevel = process.env.LOG_LEVEL ? LOG_LEVELS[process.env.LOG_LEVEL] : LOG_LEVELS.INFO

function createLogger(namespace) {
  const formatMessage = (level, message) => {
    const timestamp = new Date().toISOString()
    const color = LOG_COLORS[level]
    const reset = LOG_COLORS.RESET
    return `${color}[${timestamp}] [${namespace}] ${level}${reset} ${message}`
  }

  return {
    debug: (message, data) => {
      if (currentLogLevel <= LOG_LEVELS.DEBUG) {
        console.log(formatMessage('DEBUG', message), data ? data : '')
      }
    },
    
    info: (message, data) => {
      if (currentLogLevel <= LOG_LEVELS.INFO) {
        console.log(formatMessage('INFO', message), data ? data : '')
      }
    },
    
    warn: (message, data) => {
      if (currentLogLevel <= LOG_LEVELS.WARN) {
        console.warn(formatMessage('WARN', message), data ? data : '')
      }
    },
    
    error: (message, error) => {
      if (currentLogLevel <= LOG_LEVELS.ERROR) {
        console.error(formatMessage('ERROR', message))
        if (error) {
          console.error('  Error Details:', {
            message: error.message,
            code: error.code,
            stack: error.stack ? error.stack.split('\n').slice(0, 3) : 'No stack trace',
          })
        }
      }
    },
  }
}

module.exports = { createLogger, LOG_LEVELS }
