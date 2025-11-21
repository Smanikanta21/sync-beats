# Sync Beats Architecture: Server, Client & Sockets

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SYNC BEATS SYSTEM                              │
└─────────────────────────────────────────────────────────────────────────┘

THREE INDEPENDENT SERVERS:

┌────────────────────────┐      ┌────────────────────────┐      ┌─────────────────────────┐
│  EXPRESS BACKEND       │      │  WEBSOCKET SERVER      │      │   NEXT.JS FRONTEND      │
│  (Port 5001)           │      │  (Port 6001)           │      │   (Port 3000)           │
│                        │      │                        │      │                         │
│  • REST API            │      │  • Live Sync Engine    │      │  • React Components     │
│  • Authentication      │      │  • Room Management     │      │  • Audio Playback       │
│  • User Management     │      │  • State Broadcasting  │      │  • Real-time Updates    │
│  • Database Queries    │      │  • Latency Sync        │      │  • WebSocket Client     │
│                        │      │  • Drift Detection     │      │                         │
│  Database (Prisma)     │      │                        │      │  Audio Element          │
│  • Users               │      │  In-memory Room Map    │      │  (HTML5 <audio>)        │
│  • Rooms               │      │  • Tracks              │      │                         │
│  • Participants        │      │  • Playback State      │      │  Browser Storage        │
│  • Sessions            │      │  • Connected Clients   │      │                         │
└────────────────────────┘      └────────────────────────┘      └─────────────────────────┘
         ▲                                ▲                              ▲
         │                                │                              │
         │ REST Calls                     │ WebSocket                    │ HTTP/WebSocket
         │ (auth, user info)              │ (real-time sync)             │
         │                                │                              │
         └────────────────┬───────────────┴──────────────┬───────────────┘
                          │                              │
                    ┌─────────────────────────────────────────┐
                    │    COMMUNICATION FLOW (Next)            │
                    └─────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. EXPRESS BACKEND (Port 5001) - `express-backend/src/app.js`

**Purpose**: Handle authentication, user management, and REST API

**Key Features**:
```typescript
├── CORS Configuration
│   └── Allows connections from frontend & socket server
│
├── Authentication Routes
│   ├── POST /auth/signup       → Create user account
│   ├── POST /auth/login        → Authenticate user
│   ├── GET /auth/dashboard     → Get current user
│   └── GET /auth/logout        → Session cleanup
│
├── API Routes
│   ├── GET /api/rooms          → List all rooms
│   ├── POST /api/rooms         → Create room
│   ├── GET /api/rooms/:code    → Get room details
│   └── Participant management
│
├── Session Management
│   └── Express-session with secure cookies
│
└── Database (Prisma ORM)
    └── PostgreSQL/SQLite for persistent data
```

**Does NOT handle**:
- ❌ Real-time playback sync (sockets does this)
- ❌ Live broadcasting (sockets does this)

---

### 2. WEBSOCKET SERVER (Port 6001) - `sockets/socket.js`

**Purpose**: Real-time synchronized playback across all connected clients

**Architecture**:
```
Room-Based System:
┌─ liveRooms = Map<roomCode, Room>
│
├─ Room {
│  ├─ roomCode: string
│  ├─ hostUserId: string
│  ├─ clients: Set<WebSocket>  ← All connected users in this room
│  ├─ currentTrack: URL
│  ├─ startedAt: timestamp     ← When track started (server time)
│  ├─ duration: ms
│  ├─ isPaused: boolean
│  ├─ pausedAt: position
│  │
│  └─ Methods:
│     ├─ getPlaybackPosition() → Current playback position in milliseconds
│     └─ isTrackActive() → Is music currently playing?
│
└─ Client (WebSocket) connections:
   ├─ ws._id: unique identifier
   ├─ ws._userId: linked user
   ├─ ws._room: room code
   └─ ws.send() to send messages
```

**Message Flow**:

#### A. User Joins Room
```
Client                                    Socket Server
  │                                            │
  ├─ WebSocket Connection ──────────────────→ │
  │                                            │
  ├─ {"type":"join", roomCode, userId}──────→ │
  │                                            ├─ joinLiveRoom()
  │                                            ├─ Add client to Room
  │                                            ├─ Get room playback state
  │                                            │
  │← {"type":"joined", isHost, hostId}────── │
  │                                            │
  │← {"type":"PLAY_SYNC", audioUrl, ...}──── │ (if music playing)
  │                                            ├─ Syncs late joiner to correct position
  │                                            │
  │                 (broadcast to others)      │
  │← {"type":"user_joined", totalClients}──── │
```

#### B. Host Plays a Song
```
Host Client                             Socket Server                 Other Clients
  │                                            │                           │
  ├─ {"type":"PLAY", audioUrl, duration}──→  │                           │
  │                                            ├─ Update room state       │
  │                                            ├─ Set startedAt = now     │
  │                                            ├─ Set currentTrack = url  │
  │                                            │                           │
  │                             Broadcast to all clients:                 │
  │                                            ├─→ {"type":"PLAY", ...}   │
  │                                            │                          ├─ Load audio
  │                                            │                          ├─ Calculate sync delay
  │                                            │                          ├─ Start playback
  │← {"type":"PLAY", ...}───────────────────┘                           │
  ├─ Load audio URL                                                      │
  ├─ Start playback immediately                                          │
```

#### C. Latency Synchronization
```
Client                                    Socket Server
  │                                            │
  ├─ {"type":"time_ping", t0: now}──────────→  │
  │   (t0 = client's current time)             │
  │                                            ├─ Calculate RTT
  │                                            ├─ timeOffset = server - (t0 + RTT/2)
  │                                            │
  │← {"type":"time_pong", ...}─────────────────┘│
  │   • t0 (client's timestamp)                │
  │   • serverTime (server's time)             │
  │   • timeOffset (sync offset)               │
  │   • playbackPosition (server's track pos)  │
  │                                            │
  ├─ RTT = now - t0   (round trip time)        │
  ├─ latency = RTT/2  (one-way)                │
  ├─ Update state with offset                  │
  └─ Client now knows how far behind server    │
```

#### D. Drift Detection & Correction
```
Client (every 2 seconds)                  Socket Server
  │                                           │
  ├─ {"type":"sync_check", clientPos}───────→ │
  │   (What client thinks current position)   │
  │                                           ├─ Compare with server position
  │                                           │
  │  IF drift > 500ms:                        │
  │  ├─→ {"type":"RESYNC", correctPos}──────┘ │
  │  │   (Correct the client)                 │
  │  │                                        │
  │  └─ Reset audio.currentTime = correctPos  │
  │                                           │
  │  ELSE:                                    │
  │      ✅ Client stays in sync              │
```

#### E. Other Playback Commands
```
Command: PAUSE
├─ Client: {"type":"PAUSE", currentTime}
├─ Server: room.isPaused = true
└─ Broadcast: All clients pause

Command: RESUME
├─ Client: {"type":"RESUME"}
├─ Server: room.isPaused = false, recalculate startedAt
└─ Broadcast: All clients resume

Command: SEEK
├─ Client: {"type":"SEEK", seekPositionMs}
├─ Server: room.startedAt = now - seekPositionMs
└─ Broadcast: All clients jump to position

Command: TRACK_CHANGE
├─ Client: {"type":"TRACK_CHANGE", trackData}
├─ Server: room.currentTrack = url
└─ Broadcast: All clients switch tracks
```

---

### 3. NEXT.JS FRONTEND (Port 3000) - React Components

**File**: `frontend/app/dashboard/room/[code]/page.tsx`

**Connection Flow**:

```
User Browser                   Frontend                    Express (5001)              Socket (6001)
     │                             │                              │                        │
     ├─ Navigate to room ─────────→│                              │                        │
     │                             │                              │                        │
     │                             ├─ Check auth ────────────────→│                        │
     │                             │                              │                        │
     │                             ├─ Get room data ─────────────→│                        │
     │                             │←────── User & room info ─────│                        │
     │                             │                              │                        │
     │                             ├─ WebSocket: ws://socket:6001 ──────────────────────→│
     │                             │                                                      │
     │◄─── Render room UI ────────┤                                                      │
     │                             ├─ Send: {"type":"join"} ───────────────────────────→│
     │                             │                                                      ├─ Add to room.clients
     │                             │◄─ Receive: {"type":"joined"} ────────────────────────│
     │                             │                                                      │
     │                             │ If music playing:                                   │
     │                             │◄─ {"type":"PLAY_SYNC", url, position} ──────────────│
     │                             │                                                      │
     │                             ├─ Load audio from URL                                │
     │                             ├─ Start at synced position                           │
     │                             │                                                      │
     │ (Host clicks "Play")        │                                                      │
     ├─ Audio play event ────────→ │                                                      │
     │                             ├─ Send: {"type":"PLAY", url} ────────────────────────→│
     │                             │                              (This goes to Socket)   │
     │                             │                                                      │
     │                             │                              Broadcast back:         │
     │                             │◄─ {"type":"PLAY"} ─────────────────────────────────│
     │                             │                                                      │
     │                             ├─ React: setIsPlaying(true)                          │
     │                             ├─ Audio: start playback                              │
     │                             │                                                      │
     │ (Every 3 secs)              │                                                      │
     │                             ├─ Send: {"type":"time_ping", t0} ────────────────────→│
     │                             │                                                      │
     │                             │◄─ {"type":"time_pong", offset} ────────────────────│
     │                             │                                                      │
     │                             ├─ Calculate latency & RTT                            │
     │                             ├─ Update offset                                      │
     │                             │                                                      │
     │ (Display debug panel)       │                                                      │
     │◄─ Show RTT, latency, offset │                                                     │
     │◄─ Show current track        │                                                     │
     │◄─ Show audio state          │                                                     │
```

**useSyncPlayback Hook** (`frontend/hooks/useSyncPlayback.ts`):

```typescript
// Core responsibilities:
├─ WebSocket Connection Management
│  ├─ Connect to socket server
│  ├─ Reconnection logic (exponential backoff)
│  └─ Error handling
│
├─ Playback State Sync
│  ├─ Receive PLAY/PAUSE/RESUME/SEEK/TRACK_CHANGE messages
│  ├─ Update audio element immediately
│  ├─ Sync React state
│  └─ Handle mobile autoplay restrictions
│
├─ Latency Measurement
│  ├─ Send time_ping every 3 seconds
│  ├─ Calculate RTT and one-way latency
│  ├─ Track server time offset
│  └─ Display in debug panel
│
├─ Drift Detection
│  ├─ Send sync_check every 2 seconds
│  ├─ Compare client position vs server position
│  ├─ Auto-resync if drift > 500ms
│  └─ Smooth sync without interrupting playback
│
└─ Command Broadcasting
   ├─ play(url, duration)    → Send to socket
   ├─ pause()                 → Send to socket
   ├─ resume()                → Send to socket
   ├─ seek(position)          → Send to socket
   └─ trackChange(trackData)  → Send to socket
```

---

## Data Flow: Complete Example

### Scenario: Two Users in a Room, One Plays a Song

```
TIME    HOST (User A)                SERVER                    GUEST (User B)
────────────────────────────────────────────────────────────────────────────

T+0s
        ├─ User A clicks "Play"
        ├─ Sets audioRef.src = url
        ├─ audioRef.play()
        ├─ sends {type:PLAY, url}
        │                               ├─ Receives PLAY msg
        │                               ├─ room.currentTrack = url
        │                               ├─ room.startedAt = now + 200ms
        │                               ├─ Sets room.isPaused = false
        │                               │
        │                               ├─ Broadcasts PLAY to all
        │                                                        ├─ Receives PLAY
        │                                                        ├─ Sets audio.src = url
        │                                                        ├─ Calculates delay: 200ms
        │                                                        ├─ Waits 200ms
        │                                                        ├─ audio.play()

T+0.3s  ✓ Audio started (host)                                 (still loading)

T+0.2s  (already playing)                                      ✓ Audio started (guest)

T+1s    ├─ Sends {type:time_ping, t0:now}
        │                               ├─ Records t0, serverTime
        │                               ├─ Calculates RTT = ~10ms
        │                               ├─ Calculates offset = ~5ms
        │                               ├─ Sends time_pong
        │                                                        (tracks synced!)
        ├─ Receives time_pong
        ├─ playbackState.rttMs = 10
        ├─ playbackState.latencyMs = 5
        ├─ playbackState.serverOffsetMs = 5

T+2s    ├─ Sends {type:sync_check, clientPos: 2000}
        │                               ├─ serverPos = 2010 (expected)
        │                               ├─ drift = 10ms (< 500ms, OK)
        │                               └─ No resync needed

T+10s   ├─ Sends {type:PAUSE}
        │                               ├─ room.isPaused = true
        │                               ├─ room.pausedAt = position
        │                               ├─ Broadcasts PAUSE
        │                                                        ├─ Receives PAUSE
        │                                                        ├─ audio.pause()
        ├─ audio.pause()                                        ├─ UI updates

T+15s   ├─ Sends {type:SEEK, 5000}
        │                               ├─ Recalculates startedAt
        │                               ├─ Broadcasts SEEK
        │                                                        ├─ Receives SEEK
        │                                                        ├─ audio.currentTime = 5
        ├─ audio.currentTime = 5                                ├─ UI updates
        ├─ audio.play()                                         ├─ audio.play()
        │
        ├─ Sends {type:RESUME}
        │                               ├─ room.isPaused = false
        │                               ├─ Broadcasts RESUME
        │                                                        ├─ Receives RESUME

T+20s   ├─ Sends {type:TRACK_CHANGE,
        │          trackData:{...}}
        │                               ├─ room.currentTrack = new URL
        │                               ├─ Broadcasts TRACK_CHANGE
        │                                                        ├─ Receives TRACK_CHANGE
        ├─ audio.src = new URL                                  ├─ audio.src = new URL
        ├─ audio.play()                                         ├─ audio.play()
        │                                                        └─ New song playing!
        └─ New song playing!
```

---

## Key Synchronization Techniques

### 1. Server-Side Playback Position Calculation

```javascript
// Socket Server stores:
room.startedAt = Date.now() + delayMs  // When track WILL start

// When we need current position:
getPlaybackPosition() {
  if (isPaused) return pausedAt;
  return Date.now() - startedAt;  // Server calculates elapsed time
}

// This is CANONICAL - the truth
// All clients sync to this value
```

### 2. Client Latency Compensation

```typescript
// Client receives: startServerMs (when server started playing)
// Client calculates:
const rtt = now - t0  (round trip time)
const latency = rtt / 2  (one-way delay)
const offset = serverTime - (t0 + rtt/2)

// Client plays at:
delay = startServerMs - (Date.now() + offset)
setTimeout(() => audio.play(), delay)
```

### 3. Drift Correction

```javascript
// Every 2 seconds, client reports position
// Server compares:
const clientReportedPos = 5000ms
const actualServerPos = 5050ms
const drift = 50ms

// If drift > 500ms:
// Send RESYNC message with correct position
// Client jumps audio to correct position
```

---

## Port Map

```
localhost:3000    ← Frontend (Next.js) - User accesses here
localhost:5001    ← Express Backend - REST API
localhost:6001    ← WebSocket Server - Real-time sync
```

## Environment Variables

```env
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_SOCKET_HOST=localhost:6001

# Express Backend
DATABASE_URL=postgresql://user:pass@host/db
PORT=5001

# Socket Server
PORT=6001
```

---

## Summary

| Component | Purpose | Port | Connection |
|-----------|---------|------|-----------|
| **Express** | Auth, REST API, Database | 5001 | HTTP |
| **Socket** | Real-time playback sync | 6001 | WebSocket |
| **Frontend** | UI, Audio player | 3000 | Browser |

**Flow**: User → Frontend → Express (auth) → Socket (sync) → Audio playback → All users stay in sync

