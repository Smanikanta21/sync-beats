const express = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const cors = require('cors')
const passport = require('passport')
const app = express()
const authroutes = require('./routes/routes');
const router = require('../src/routes/routes')

app.use(cors({
  origin: ['http://localhost:3000','https://www.syncbeats.app','https://sync-beats-81jq.vercel.app','https://sync-beats-yy36.onrender.com','http://172.20.10.2:3000'],
  methods: ['GET','POST','DELETE','PATCH','PUT'],
  credentials: true,
  allowedHeaders: ['Content-Type','Authorization']
}))

app.use(express.json())
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

app.use('/api' , router)
app.get('/', (req, res) => {
  res.json({ message: "server is running" }) 
})


app.use((req,res) => {
  res.status(404).json({ message: 'Not Found' })
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Server Error' })
})

module.exports = app;