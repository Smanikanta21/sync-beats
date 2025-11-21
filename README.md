1. Project Title
Sync Beats – A Cross-Platform Music Synchronization System
2. Problem Statement
Existing music synchronization systems like Apple’s AirPlay are restricted to their ecosystems
(Apple-only), which prevents seamless use across devices from different platforms. There is
currently no universal system that allows synchronized playback of music across Android, iOS,
Windows, and macOS devices.
Sync Beats solves this by providing a platform-independent music synchronization system
that ensures perfect playback alignment across all connected devices using network-based
clock synchronization and drift correction.
3. System Architecture
Architecture:
Frontend → Backend (API) → Database
Stack Overview:
●   Frontend: Next.js (React-based framework) with TailwindCSS
●   Backend: Node.js + Express.js (hosted on Vercel as serverless functions)
●   Database: PostgreSQL(prisma) via Neon.tech
●   Authentication: JWT-based authentication stored in HttpOnly cookies
●   Hosting:


○   Frontend → Vercel: 
○   Backend → Vercel and render
○   Database → Neon.tech


5. Key Features
Category Features

Authentication & Authorization Secure JWT login/signup system
Session Persistence Keeps user logged in until JWT expires
Device Management Detect and display online/offline devices
Music Playback(comming Soon) Upload and play local songs directly from the app
Synchronization(comming Soon)

Real-time music playback synchronization across
connected devices
Dashboard Shows connected devices, playback info, recent tracks
Streaming Integrations (Coming
Soon)
Spotify & Apple Music authorization and sync
Responsive UI Fully responsive interface
Hosting Entire system (frontend + backend) deployed on
Vercel


6. Tech Stack

Layer Technologies
Frontend Next.js, React.js, TailwindCSS
Backend Node.js, Express.js (Serverless on
Vercel),websockets
Database PostgreSQL (Neon.tech via Prisma ORM)
Authentication JWT with HttpOnly cookies
Networking WebSocket-based synchronization
(Planned)
Hosting Vercel,Render (frontend + backend + Sockets), Neon.tech (DB)

7. API Overview

Endpoint Method Description Access
/auth/signup POST Register a new user Public
/auth/login POST Authenticate user and issue JWT Public
/auth/logout POST Logout user and clear cookie Authenticated
/auth/dashboard GET Fetch user data & connected
devices

Authenticated
/auth/dashboard/devices
POST Register a device to user session Authenticated
/auth/profile POST Fetches profiles Authenticated
/dashboard/createroom
POST Creates room Authenticated
/dashboard/room/id:

8. WebSocket Sync Environment
- Set `NEXT_PUBLIC_SOCKET_HOST` to your LAN IP (e.g. `192.168.1.23:6001`) for mobile device testing.
- Optionally set `NEXT_PUBLIC_SOCKET_PORT` if not embedded in host.
- In production use a wss host (e.g. `wss://your-render-service.onrender.com`). Ensure Render service allows WebSockets.
- Frontend passes `roomCode`, `userId`, and `hostId` when joining; server assigns host from `hostId` (never by first connection).

9. Playback Sync Handshake
- Host issues `PLAY` -> server starts handshake: broadcasts `PREPARE_TRACK` then `device_health_check`.
- Each client preloads audio then responds with `device_health_check_response` including `audioLoaded`, `deviceReady`, `rttMs`.
- Server waits (timeout fallback 5s) then broadcasts authoritative `PLAY` with `masterClockMs` (monotonic) & `startDelayMs`.
- Late joiners receive `PLAY_SYNC` with current `playbackPosition`.

10. Precise Scheduling
- Clients use WebAudioScheduler to schedule playback against `masterClockMs` plus latency compensation.
- Drift correction: small drift -> temporary playbackRate tweak; large drift -> micro re-seek.
- Periodic `sync_check` lets server issue `RESYNC` if drift > threshold.

11. Mobile Audio Unlock
- iOS/Android require a user gesture before audio can start. First tap triggers context `initialize()` and `resumeContext()`.
- If autoplay blocked, UI shows toast prompting user to tap again.

12. Local Development Run
```bash
# Terminal 1 - Sockets server (Render equivalent)
node sockets/server.js   # or npm run dev inside sockets

# Terminal 2 - Express API
cd express-backend && npm run dev

# Terminal 3 - Frontend
cd frontend && npm run dev
```
Set `.env.local` for frontend:
```
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_SOCKET_HOST=localhost:6001
```

Endpoints note: Express mounts all routes under both `/api` and `/auth`. Use `/api/room/:code` or `/auth/room/:code` (not bare `/room/:code`). Example room details fetch:
```bash
curl -i http://localhost:5001/api/room/12345 -H "Cookie: token=..."
```

13. Manual Test Plan
1. Host creates room on desktop; verify room loads.
2. Open same room on phone (same LAN) – ensure `NEXT_PUBLIC_SOCKET_HOST` points to desktop IP.
3. Click Play on host: observe server logs: handshake start, `PREPARE_TRACK`, device health responses, final `PLAY`.
4. Phone logs show `PREPARE_TRACK` then `PLAY`; audio starts in sync (compare timestamps / ears).
5. Pause/Resume/Seek from host; phone reflects changes within drift tolerance (<60ms ideal).
6. Late join a new client; receives `PLAY_SYNC` and schedules midpoint correctly.
7. Induce artificial delay (e.g., throttle network); confirm `sync_check` can trigger `RESYNC`.
8. Verify QR join code works and copying room code shares properly.

14. Deployment Notes (Render)
- Point Render service start command to `node sockets/server.js`.
- Ensure `PORT` environment variable is respected by the HTTP server you pass into `createSyncEngine`.
- Use health checks or logs to confirm WebSocket upgrade success.

15. Troubleshooting
- Stuck on "Loading room...": confirm `/room/:code` API reachable and JWT valid.
- No audio on mobile: ensure a tap occurred to unlock AudioContext; check console for `AudioContext state: suspended`.
- Desync > 500ms repeatedly: inspect network RTT (`playbackState.rttMs`) and verify scheduler logs; consider increasing handshake `startDelayMs`.