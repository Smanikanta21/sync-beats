const express = require('express')
const {signup,login,logout} = require('../auth/auth')
const {authMiddleWare} = require('../middleware/middleware')
const {getDashboardData} = require('../dashboard/route')
const { createRoom,joinRoom } = require('../rooms/room')
const router = express.Router()

router.post('/signup',signup);

router.post('/login',login);

router.post('/logout',logout);

router.get('/dashboard',authMiddleWare,getDashboardData);

router.post('/createroom', authMiddleWare, createRoom);

router.post('/joinroom', authMiddleWare, joinRoom);

module.exports = router;