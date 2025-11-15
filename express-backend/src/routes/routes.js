const express = require('express')
const {signup,login,logout,googleAuthCallback} = require('../auth/auth')
const {authMiddleWare} = require('../middleware/middleware')
const {getDashboardData} = require('../dashboard/route')
const { createRoom, joinRoom, verifyRoom, getRoomDetails, getRecentRooms, getNearbyRooms } = require('../rooms/room')
const passport = require('passport')
const router = express.Router()

router.post('/signup',signup);

router.post('/login',login);

router.post('/logout',logout);

router.get('/dashboard',authMiddleWare,getDashboardData);

router.post('/createroom', authMiddleWare, createRoom);

router.post('/joinroom', authMiddleWare, joinRoom);

router.get('/verifyroom/:code', authMiddleWare, verifyRoom);

router.get('/room/:code', authMiddleWare, getRoomDetails);

router.get('/recent-rooms', authMiddleWare, getRecentRooms);

router.post('/nearby-rooms', authMiddleWare, getNearbyRooms);

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/callback/google', passport.authenticate('google', { failureRedirect: '/' }), googleAuthCallback);



module.exports = router;
