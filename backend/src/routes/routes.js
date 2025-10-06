const express = require('express')
const {signup,login,logout} = require('../auth/auth')
const {authMiddleWare} = require('../middleware/middleware')
const router = express.Router()

router.post('/signup',signup);

router.post('/login',login);

router.post('/logout',logout);

router.get('/dashboard',authMiddleWare,(req,res)=>{
    res.json({message:`Welcome Back ${req.user.name}`})
})


module.exports = router;