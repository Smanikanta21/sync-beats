require("dotenv").config();
const jwt = require('jsonwebtoken');

function authMiddleWare(req, res, next) {
  try {
    const header = req.headers.authorization;
    const headerToken = header && header.startsWith('Bearer') ? header.split(' ')[1] : null;
    const cookieToken = req.cookies?.token;
    const token = headerToken || cookieToken;

    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { authMiddleWare };
