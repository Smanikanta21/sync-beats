require('dotenv').config()
const http = require('http')
const { Server } = require('socket.io') 
const jwt = require('jsonwebtoken')

const PORT = process.env.REALTIME_PORT || 5002

function verifyToken(token){
    if(!token) return null
    try{
        return jwt.verify(token,process.env.JWT)
    }catch(err){
        console.error('Socket Auth Error:',err)
        return null
    }
}

const httpServer = http.createServer()

const io = new Server(httpServer,{
    cors:{
        origin:[
            process.env.FRONTEND_DEV_URL,
            process.env.FRONTEND_URL,
            process.env.BACKEND_URL,
            process.env.FRONTEND_N_DEV_URL
        ].filter(Boolean),
        methods:['GET','POST','DELETE','PATCH','PUT'],
        credentials:true,
        allowedHeaders:['Content-Type','Authorization']
    }
})

io.use((socket,next)=>{
    const token = socket.handshake.auth?.token || null
    const user = verifyToken(token)
    if(!user){
        console.log('❌ Socket auth failed - no valid token')
        return next(new Error('Authentication error'))
    }
    socket.data.user = user
    console.log('✅ Socket authenticated:', user.id, user.name)
    next()
})

io.on('connection',(socket)=>{
    console.log('🔌 Client connected:', socket.id, '| User:', socket.data.user?.name)

    socket.on('room:join',({code})=>{
        if(!code) return
        socket.join(code)
        socket.data.code = code
        console.log(`📍 ${socket.data.user.name} joined room: ${code}`)
        socket.to(code).emit('room:user-joined',{
            userId: socket.data.user.id,
            userName: socket.data.user.name,
            socketId: socket.id
        })
    })

    socket.on('room:leave',({code})=>{
        const room = code || socket.data.code
        if(!room) return
        socket.leave(room)
        console.log(`🚪 ${socket.data.user.name} left room: ${room}`)
        socket.to(room).emit('room:user-left',{
            userId: socket.data.user.id,
            userName: socket.data.user.name,
            socketId: socket.id
        })
    })

    socket.on('clock:ping',(clientSentAt)=>{
        const now = Date.now()
        socket.emit('clock:pong',{
            clientSentAt,
            serverReceivedAt:now,
            serverSentAt:Date.now()
        })
    })

    socket.on('playback:set-track',({code,url})=>{
        if(!code || !url) return
        console.log(`🎵 Track set in ${code}: ${url}`)
        io.to(code).emit('playback:set-track',{url})
    })

    socket.on('playback:play-at',({code,startAt})=>{
        if(!code || !startAt) return
        console.log(`▶️  Play scheduled in ${code} at serverTime: ${startAt}`)
        io.to(code).emit('playback:play-at',{startAt})
    })

    socket.on('playback:pause',({code,at})=>{
        if(!code) return
        console.log(`⏸️  Pause in ${code}`)
        io.to(code).emit('playback:pause',{at: at || Date.now()})
    })

    socket.on('playback:seek',({code,position,at})=>{
        if(!code || typeof position !== 'number') return
        console.log(`⏩ Seek in ${code} to position: ${position}s`)
        io.to(code).emit('playback:seek',{position, at: at || Date.now()})
    })

    socket.on('disconnect',()=>{
        const code = socket.data?.code
        const userId = socket.data?.user?.id
        const userName = socket.data?.user?.name
        
        console.log('🔌 Client disconnected:', socket.id, '| User:', userName)
        
        if(code && userId){
            socket.to(code).emit('room:user-left',{userId, userName, socketId:socket.id})
        }
    })
})

httpServer.listen(PORT,()=>{
    console.log(`🚀 Realtime server running on http://localhost:${PORT}`)
    console.log(`📡 WebSocket signaling ready`)
})
