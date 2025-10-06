require("dotenv").config();
const jwt = require('jsonwebtoken');

function authMiddleWare(req, res, next) {
  const header = req.headers.authorization;
  const tokenFromHeader = header && header.startsWith('Bearer ') ? header.split(' ')[1] : null;
  const token = req.cookies?.token || tokenFromHeader;

  console.log('auth middleware — token present?', !!token);

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT);
    req.user = decoded;
    console.log('auth middleware — decoded:', decoded);
    return next();
  } catch (err) {
    console.log('auth middleware — jwt verify error:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { authMiddleWare };
