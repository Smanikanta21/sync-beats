const express = require('express')
const {signup,login,logout} = require('../auth/auth')
const {authMiddleWare} = require('../middleware/middleware')
const {getDashboardData} = require('../dashboard/route')
const {createRoom} = require('../rooms/room')
const router = express.Router()

router.post('/signup',signup);

router.post('/login',login);

router.post('/logout',logout);

router.get('/dashboard',authMiddleWare,getDashboardData);

router.post('/createroom', authMiddleWare, createRoom);

module.exports = router;