const express = require('express')
const {signup,login,logout,googleAuthCallback} = require('../auth/auth')
const {authMiddleWare} = require('../middleware/middleware')
const {getDashboardData} = require('../dashboard/route')
const { createRoom,joinRoom } = require('../rooms/room')
const passport = require('passport')
const router = express.Router()

router.post('/signup',signup);

router.post('/login',login);

router.post('/logout',logout);

router.get('/dashboard',authMiddleWare,getDashboardData);

router.post('/createroom', authMiddleWare, createRoom);

router.post('/joinroom', authMiddleWare, joinRoom);

// Google OAuth Routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/callback/google', passport.authenticate('google', { failureRedirect: '/' }), googleAuthCallback);

module.exports = router;