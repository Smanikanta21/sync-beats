const express = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const cors = require('cors')
const passport = require('passport')
const path = require('path')
const app = express()
const authroutes = require('./routes/routes');
const router = require('./routes/routes')

app.use(cors({
  origin: [`${process.env.FRONTEND_DEV_URL}`,`${process.env.FRONTEND_URL}`,`${process.env.BACKEND_URL}`,`${process.env.FRONTEND_N_DEV_URL}`],
  methods: ['GET','POST','DELETE','PATCH','PUT'],
  credentials: true,
  allowedHeaders: ['Content-Type','Authorization']
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

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port "http://localhost:${process.env.PORT}"`)
})