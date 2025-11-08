# Render Deployment Guide - Socket.IO Realtime Server

## Overview
This guide explains how to deploy **ONLY the Socket.IO realtime server** to Render. Your REST API will remain on Vercel.

**Architecture:**
- 🔵 REST API: Vercel (`https://sync-beats-814m.vercel.app`)
- 🟢 Socket.IO Server: Render (to be deployed)
- 🟠 Frontend: Vercel (connects to both)

## Prerequisites
- GitHub repository connected to Render
- Render account (free tier works)
- Environment variables from your backend configuration

## Deployment Steps

### 1. Create New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the `sync-beats` repository

### 2. Configure Build Settings

**Basic Settings:**
- **Name**: `syncbeats-realtime` (or your preferred name)
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: `backend`
- **Runtime**: `Node`

**Build & Deploy:**
- **Build Command**: 
  ```
  npm install && npx prisma generate
  ```
  ⚠️ **Important**: Make sure this is entered correctly - not just `npm`
  
- **Start Command**: 
  ```
  npm start
  ```

**Instance Type:**
- Free tier works for testing
- Upgrade to paid for production use (no cold starts)

### 3. Environment Variables

Add these environment variables in Render dashboard:

```env
# JWT Secret (must match your API server)
JWT=your_jwt_secret_here

# Port (Render provides this, but you can override)
PORT=5002

# Frontend URLs for CORS
FRONTEND_URL=https://your-frontend.vercel.app
FRONTEND_DEV_URL=http://localhost:3000

# Backend API URL (for reference)
BACKEND_URL=https://sync-beats-814m.vercel.app

# Node Environment
NODE_ENV=production
```

**Important Notes:**
- `JWT` must be the **same secret** used in your Vercel REST API backend
- `FRONTEND_URL` should match your actual Vercel frontend deployment
- `BACKEND_URL` is your existing Vercel API (already deployed at sync-beats-814m.vercel.app)
- Render automatically provides a `PORT` env var, which the socket server will use
- **Only the socket server runs on Render** - your REST API stays on Vercel

### 4. Deploy

1. Click "Create Web Service"
2. Render will build and deploy automatically
3. Wait for the build to complete (usually 2-3 minutes)
4. Note your service URL: `https://syncbeats-realtime.onrender.com`

### 5. Update Frontend Environment Variables

After deployment, update your Vercel frontend:

1. Go to Vercel Dashboard → Your Frontend Project → Settings → Environment Variables
2. Add/Update **ONLY** the realtime URL:
   ```env
   NEXT_PUBLIC_REALTIME_URL=https://syncbeats-realtime.onrender.com
   ```
3. Keep existing API URL unchanged:
   ```env
   NEXT_PUBLIC_API_URL=https://sync-beats-814m.vercel.app
   ```
4. Redeploy your frontend for changes to take effect

**Your frontend will now connect to:**
- REST API (auth, rooms, etc.) → Vercel backend
- WebSocket (realtime sync) → Render socket server

### 6. Verify Deployment

**Check Logs:**
- Go to Render Dashboard → Your Service → Logs
- Look for: `🚀 Realtime server running on http://0.0.0.0:5002`
- Look for: `📡 WebSocket signaling ready`

**Test Connection:**
1. Open your deployed frontend
2. Open browser console (F12)
3. Join or create a room
4. Look for connection messages:
   - `✅ Connected to realtime server: [socket-id]`
   - `⏰ Clock synced - offset: X ms, rtt: Y ms`

## Troubleshooting

### Cold Starts (Free Tier)
- Free tier services sleep after 15 minutes of inactivity
- First connection after sleep takes 30-60 seconds
- Solution: Upgrade to paid tier for 24/7 uptime

### CORS Issues
- Verify `FRONTEND_URL` in Render matches your Vercel frontend URL exactly
- Check browser console for CORS errors
- Ensure both http/https protocols match

### WebSocket Connection Failed
- Check if Render service is running (green status)
- Verify `NEXT_PUBLIC_REALTIME_URL` in Vercel is correct
- Check Render logs for errors during connection attempts

### JWT Authentication Failed
- Ensure `JWT` secret in Render matches the one in Vercel backend
- Verify frontend is sending valid JWT token in socket auth

## Production Considerations

### Performance
- Free tier has cold starts - not ideal for production
- Consider Starter plan ($7/month) for:
  - No cold starts
  - 512MB RAM
  - Better performance

### Monitoring
- Enable health checks in Render
- Set up alerts for service downtime
- Monitor socket connection count in logs

### Scaling
- Socket.IO requires sticky sessions if you scale horizontally
- Consider Redis adapter for multi-instance deployments
- Current setup works for single instance

## Cost Estimate

**Free Tier:**
- $0/month
- 750 hours/month free
- Sleeps after 15 min inactivity
- Good for testing

**Starter:**
- $7/month
- Always on
- 512MB RAM
- Good for small production

## Next Steps

After successful deployment:
1. ✅ Test from multiple devices
2. ✅ Verify clock sync accuracy over internet
3. ✅ Test synchronized playback
4. ✅ Test drag-and-drop file sharing
5. Consider implementing:
   - Health check endpoint
   - Connection metrics logging
   - Error tracking (Sentry)
   - Rate limiting for connections
