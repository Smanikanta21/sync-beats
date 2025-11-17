# Sync Beats

A real-time synchronized music player application that allows multiple users to listen to the same music track simultaneously across different devices, with host-controlled playback.

## Features

- 🎵 **Real-time Music Sync** - Multiple users can listen to the same track in perfect sync using WebSocket
- 👥 **Multi-user Rooms** - Create or join rooms with unique codes
- 🎚️ **Host Controls** - Only room host can play, pause, and resume music
- 📱 **Cross-device Support** - Works on desktop, mobile, and tablet
- 🔗 **QR Code Sharing** - Share rooms easily with QR codes
- 🎯 **Queue Management** - Add, remove, and reorder tracks
- 🔊 **Volume Control** - Individual volume control for each user
- 🎲 **Shuffle & Repeat** - Playback mode options

## Tech Stack

### Frontend
- **Framework**: Next.js 15.5.3 with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Lucide Icons
- **State Management**: React Hooks
- **Notifications**: React Toastify

### Backend
- **API Server**: Express.js (Serverless on Vercel)
- **Database**: PostgreSQL with Prisma ORM
- **WebSocket**: Node.js ws library (Render)
- **Authentication**: JWT

### Infrastructure
- **Frontend Hosting**: Vercel (syncbeats.app)
- **API Server**: Vercel (api.syncbeats.app)
- **WebSocket Server**: Render (sync-beats-qoe8.onrender.com)
- **Database**: PostgreSQL (Neon)

## Project Structure

```
sync-beats/
├── frontend/                 # Next.js frontend application
│   ├── app/
│   │   ├── page.tsx         # Landing page
│   │   ├── components/      # Reusable React components
│   │   ├── dashboard/       # Dashboard routes
│   │   │   ├── page.tsx     # Dashboard home
│   │   │   ├── join/        # Join room by code
│   │   │   └── room/        # Active room player
│   │   └── layout.tsx       # App layout
│   ├── .env                 # Local environment variables
│   ├── next.config.ts       # Next.js configuration
│   └── package.json
│
├── express-backend/         # Express.js API server
│   ├── src/
│   │   ├── app.js          # Express app setup
│   │   ├── auth/           # Authentication routes
│   │   ├── dashboard/      # Dashboard data routes
│   │   ├── middleware/     # JWT middleware
│   │   ├── rooms/          # Room management
│   │   └── routes/         # Main routes
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # Database migrations
│   ├── vercel.json         # Vercel configuration
│   └── package.json
│
├── sockets/                 # WebSocket sync server
│   ├── sever.js            # Express + WebSocket setup
│   ├── socket.js           # WebSocket sync engine
│   ├── render.yaml         # Render deployment config
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Local Development

#### 1. Setup Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs on `http://localhost:3000`

#### 2. Setup Express Backend
```bash
cd express-backend
npm install
npx prisma migrate dev
npm run dev
```

API runs on `http://localhost:5001`

#### 3. Setup WebSocket Server
```bash
cd sockets
npm install
npm run dev
```

WebSocket runs on `ws://localhost:6001`

### Environment Variables

#### Frontend (`.env`)
```
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_SOCKET_HOST=localhost:6001
NEXTAUTH_SECRET=your-secret-here
```

#### Backend (`.env`)
```
DATABASE_URL=postgresql://user:password@localhost:5432/sync_beats
JWT=your-jwt-secret
NODE_ENV=development
```

#### WebSocket (`.env`)
```
PORT=6001
NODE_ENV=development
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/dashboard` - Get current user info

### Rooms
- `POST /api/room` - Create room
- `GET /api/room/:code` - Get room details
- `POST /api/room/:code/join` - Join room
- `GET /api/room/nearby` - Get nearby rooms (WiFi-based)

### Dashboard
- `GET /auth/dashboard` - Get user dashboard data

## WebSocket Events

### Client → Server
- `join` - Join a room
- `time_ping` - Clock synchronization
- `PLAY` - Play track (host only)
- `PAUSE` - Pause playback (host only)
- `RESUME` - Resume playback (host only)

### Server → Client
- `joined` - Confirmation of room join
- `user_joined` - New user joined room
- `time_pong` - Clock sync response
- `PLAY` - Play track broadcast
- `PAUSE` - Pause broadcast
- `RESUME` - Resume broadcast

## Deployment

### Frontend (Vercel)
```bash
git push origin main
# Automatically deploys to syncbeats.app
```

### Backend (Vercel)
```bash
# Vercel automatically deploys Express serverless app
# Configured in express-backend/vercel.json
```

### WebSocket (Render)
```bash
# Push to repository with render.yaml
# Automatically deploys to sync-beats-qoe8.onrender.com
```

## Database Schema

### Users
- id (UUID)
- name (string)
- email (string, unique)
- password (hashed)
- createdAt (timestamp)

### Room
- id (UUID)
- code (string, unique)
- name (string)
- hostId (UUID, FK to Users)
- type (enum: 'single', 'multi')
- isPublic (boolean)
- wifiSSID (string, optional)
- createdAt (timestamp)

### Device
- id (UUID)
- name (string)
- DeviceUserId (UUID, FK to Users)
- status (enum: 'active', 'inactive')
- ip (string)
- updatedAt (timestamp)

## Key Features Explained

### Real-time Sync
- Server tracks playback start time and current offset
- Clients calculate delay based on server time to synchronize play
- Clock synchronization via `time_ping`/`time_pong` messages

### Host Authorization
- Only room host can trigger PLAY, PAUSE, RESUME
- Server validates host ID on every playback message
- Non-host users can only listen and control their own volume

### Room Codes
- 6-character unique room codes for easy sharing
- QR codes generated for mobile sharing
- WiFi-based room discovery for nearby users

## Troubleshooting

### WebSocket Connection Fails
- Ensure WebSocket server is running
- Check `NEXT_PUBLIC_SOCKET_HOST` environment variable
- Verify firewall allows WebSocket connections

### Audio Not Syncing
- Check clock offset (should be < 500ms)
- Verify all clients receive PLAY message
- Check browser console for sync calculation logs

### Database Errors
- Run `npx prisma migrate dev` to apply pending migrations
- Verify PostgreSQL connection string
- Check database user permissions

## Future Enhancements

- [ ] Spotify integration
- [ ] YouTube Music support
- [ ] Voice chat during playback
- [ ] Playlist creation and sharing
- [ ] User profiles and friend lists
- [ ] Mobile native apps (React Native)
- [ ] Bluetooth speaker support
- [ ] Audio spectrum visualizer

## License

MIT

## Support

For issues and questions, please open an issue on the GitHub repository.

---

**Built with ❤️ for synchronized music experiences**
