# Socket.IO Realtime Server

This is the standalone Socket.IO server for SyncBeats realtime audio synchronization.

## Deployment to Render

### Settings:
- **Root Directory**: `socket-server`
- **Build Command**: `npm install && npx prisma generate`
- **Start Command**: `npm start`
- **Auto-Deploy**: Yes (recommended)

### Environment Variables:
```
JWT=your_jwt_secret_here
FRONTEND_URL=https://your-frontend.vercel.app
FRONTEND_DEV_URL=http://localhost:3000
BACKEND_URL=https://sync-beats-814m.vercel.app
NODE_ENV=production
```

**Note**: `PORT` is automatically provided by Render - don't set it manually.

### Local Development:
```bash
# Install dependencies
npm install

# Run in development mode (with auto-restart)
npm run dev

# Run in production mode
npm start
```

## What This Server Does:
- WebSocket connections for realtime sync
- JWT authentication
- Clock synchronization (NTP-style)
- Room management
- Playback control events
- User presence tracking
