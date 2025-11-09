require('dotenv').config()
const http = require('http')
const { Server } = require('socket.io') 
const jwt = require('jsonwebtoken')

const PORT = process.env.PORT || process.env.REALTIME_PORT || 5002

function verifyToken(token){
    if(!token) {
        console.log('❌ No token provided')
        return null
    }
    if(!process.env.JWT) {
        console.error('❌ JWT secret not configured!')
        return null
    }
    try{
        return jwt.verify(token,process.env.JWT)
    }catch(err){
        console.error('Socket Auth Error:',err.message)
        return null
    }
}

const httpServer = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            service: 'syncbeats-realtime',
            timestamp: new Date().toISOString()
        }));
    } else {
        res.writeHead(404);
        res.end();
    }
})

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
    },
    maxHttpBufferSize: 1e8
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

        const socketsInRoom = Array.from(io.sockets.adapter.rooms.get(code) || [])
            .map((id)=>io.sockets.sockets.get(id))
            .filter(Boolean)
            .map((s)=>({
                socketId: s.id,
                userId: s.data.user?.id,
                userName: s.data.user?.name || 'Guest'
            }))

        socket.emit('room:members',{users:socketsInRoom})
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

    socket.on('playback:set-track',({code,url,name,clear})=>{
        if(!code) return

        if(clear){
            console.log(`🎵 Track cleared in ${code}`)
            io.to(code).emit('playback:set-track',{ from: socket.id })
            return
        }

        const payload = { from: socket.id }
        if(url) payload.url = url
        if(name) payload.name = name

        if(!payload.url && !payload.name) return

        console.log(`🎵 Track set in ${code}: ${name || url || 'updated'}`)
        io.to(code).emit('playback:set-track',payload)
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
