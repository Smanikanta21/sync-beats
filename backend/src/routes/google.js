const express = require('express')
const passport = require('../auth/googleauth')
const jwt = require('jsonwebtoken');
const router = express.Router()

router.get('/google',passport.authenticate('google',{scope:["profile","email"]}))

router.get('/auth/callback/google',passport.authenticate('google',{
    failureRedirect:"/login",
    session:false
}),

async(req,res)=>{

    try{
        const token = jwt.sign(
            {
                id:req.user.id,
                email:req.user.email
            },
            process.env.JWT,
        )
        res.cookie('token',token,{
            httpOnly:true,
            secure:process.env.NODE_ENV === 'production',
            sameSite:'lax'
        })
        res.redirect('http://localhost:3000/dashboard')
    }catch (err) {
      console.error('Google login error:', err);
      res.redirect('http://localhost:3000/login?error=auth_failed');
    }
}
)

module.exports = router;