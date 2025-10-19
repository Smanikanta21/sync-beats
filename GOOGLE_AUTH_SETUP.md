# Google OAuth Setup - Implementation Guide

## Overview
Google OAuth authentication has been successfully implemented for Sync Beats. Users can now sign up and log in using their Google accounts.

## Backend Changes

### 1. **Updated `/src/auth/auth.js`**
   - Added Passport.js imports for Google OAuth strategy
   - Implemented `GoogleStrategy` configuration with:
     - Client ID and Secret from environment variables
     - Callback URL: `http://localhost:5001/auth/auth/callback/google`
   - Created `serializeUser` and `deserializeUser` functions
   - Added `googleAuthCallback` function that:
     - Validates user existence
     - Creates new users if they don't exist
     - Generates JWT tokens
     - Registers devices
     - Redirects to frontend with token

### 2. **Updated `/src/routes/routes.js`**
   - Added Google OAuth routes:
     - `GET /auth/auth/google` - Initiates Google login
     - `GET /auth/auth/callback/google` - Handles callback from Google
   - Imported `googleAuthCallback` from auth module
   - Added Passport middleware

### 3. **Updated `/src/app.js`**
   - Added `cookie-session` middleware for maintaining OAuth sessions
   - Initialized Passport with `passport.initialize()` and `passport.session()`
   - Session configuration: 24-hour expiry

## Frontend Changes

### 1. **Updated `/app/components/LoginPage.tsx`**
   - Added `useEffect` hook to handle Google auth callback
   - Extracts token and user from URL query parameters
   - Stores token in localStorage
   - Redirects to dashboard on successful login
   - Updated Google auth button to call `/auth/auth/google`

### 2. **Updated `/app/components/SignUpPage.tsx`**
   - Added router import and `useEffect` for callback handling
   - Added `googleAuthFetcher` function
   - Added Google auth button in signup form
   - Handles OAuth redirect with token management

## Environment Variables Required (Already configured in `.env`)

```
GOOGLE_CLIENT_ID=1006171035854-ghtquob08eofkuveb3gnu5fjscgso1pn.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URL=http://localhost:5001/googleauth/auth/callback/google
```

## Flow Diagram

```
1. User clicks "Login/Signup with Google"
   ↓
2. Frontend redirects to: http://localhost:5001/auth/auth/google
   ↓
3. Passport initiates Google OAuth flow
   ↓
4. User authorizes on Google login page
   ↓
5. Google redirects to: http://localhost:5001/auth/auth/callback/google
   ↓
6. Passport validates token and checks/creates user in database
   ↓
7. Backend generates JWT token
   ↓
8. Backend redirects to: http://localhost:3000/dashboard?token={jwt}&user={name}
   ↓
9. Frontend extracts token from URL
   ↓
10. Token stored in localStorage
    ↓
11. User logged in and redirected to dashboard
```

## Database Changes
- No schema changes needed
- Existing `Users` model handles OAuth users
- OAuth users created with empty password field
- Username auto-generated from email + random string

## Testing Steps

### Local Testing:
1. Start backend: `npm start` (from `/backend`)
2. Start frontend: `npm run dev` (from `/frontend`)
3. Navigate to `http://localhost:3000`
4. Click "Login" or "Sign Up"
5. Click Google icon
6. Authorize with your Google account
7. Should be redirected to dashboard with token in localStorage

### What Gets Created:
- New user record if email doesn't exist
- New device record with current browser/OS information
- JWT token for session management

## Security Considerations
✅ Tokens stored in localStorage (consider moving to httpOnly cookies for production)
✅ Google OAuth validates all requests
✅ JWT secret from environment variables
✅ Password field optional for OAuth users
✅ Device tracking for all logins

## Packages Required
All packages already installed in `package.json`:
- `passport` - Authentication middleware
- `passport-google-oauth20` - Google OAuth strategy
- `cookie-session` - Session management
- `jsonwebtoken` - JWT token generation

## Troubleshooting

### Issue: "Invalid redirect URI"
- Ensure `GOOGLE_REDIRECT_URL` in `.env` matches Google Console settings
- Currently set to: `http://localhost:5001/auth/auth/callback/google`

### Issue: Token not persisting
- Check if localStorage is enabled in browser
- Token should be visible in browser DevTools → Application → LocalStorage

### Issue: Redirect loop
- Check frontend URL matches `FRONTEND_URL` in backend `.env`
- Currently: `https://www.syncbeats.app` (update for local dev if needed)

## Next Steps
1. Consider implementing refresh token rotation
2. Add logout functionality for OAuth sessions
3. Move tokens to httpOnly cookies for better security
4. Implement GitHub OAuth (optional)
5. Add user profile picture from Google account
