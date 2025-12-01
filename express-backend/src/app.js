const express = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const cors = require('cors')
const passport = require('passport')
const path = require('path')
const app = express()
const authroutes = require('./routes/routes');
const router = require('./routes/routes')

const createLogger = (namespace) => ({
  info: (msg, data) => console.log(`[${namespace}]  ${msg}`, data ? data : ''),
  error: (msg, err) => console.error(`[${namespace}] ${msg}`, err ? err.message : ''),
  warn: (msg, data) => console.warn(`[${namespace}]  ${msg}`, data ? data : ''),
})

const logger = createLogger('Express')

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Allow any origin for development
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'DELETE', 'PATCH', 'PUT'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json({ limit: '100mb' }))
app.use(cookieParser())

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
  })
);

app.use(passport.initialize())
app.use(passport.session())

app.use('/auth', authroutes);

app.use('/api', router)
app.get('/', (req, res) => {
  res.json({ message: "server is running" })
})


app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.path}`)
  res.status(404).json({ message: 'Not Found' })
})

app.use((err, req, res, next) => {
  logger.error(`Request error: ${req.path}`, err)
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? 'Server Error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { error: err.stack })
  })
})

if (process.env.NODE_ENV !== 'production') {
  app.listen(process.env.PORT, () => {
    logger.info(`Server is running on port ${process.env.PORT}`)
  })
}

module.exports = app