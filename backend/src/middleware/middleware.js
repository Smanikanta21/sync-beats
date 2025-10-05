require("dotenv").config()
const jwt = require('jsonwebtoken');
function authMiddleWare(req, res, next) {
    try {
        const header = req.headers.authorization;
        console.log(header)
        if (!header) return res.status(401).json({ message: 'Unknown Error' });
        const token = header.split('')[1];
        if (!token) { return res.status(401).json({ message: "User not allowed" }) }
        const decode = jwt.verify(token, process.env.JWT)
        req.user = decode

        next()
    }catch(err){
        return res.status(400).json({message:"Expired Token"})
    }
}

module.exports = {authMiddleWare}
