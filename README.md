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