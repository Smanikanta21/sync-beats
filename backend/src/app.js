const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const app = express()
const authroutes = require('./routes/routes')
app.use(express.json())
app.use(cookieParser())

app.use(cors({
    origin:['http://localhost:3000'],
    methods:['GET','POST','DELETE','PATCH','PUT'],
    credentials:true,
    allowedHeaders: ['Content-Type','Authorization']
}))

app.use('/auth', authroutes);

app.get('/', (req, res) => {
    res.send("server is running")
})

module.exports = app;