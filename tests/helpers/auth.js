const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const ROLES = {
  ADMIN: 1,
  TEACHER: 2,
  STUDENT: 3,
};

const generateToken = (roleId, userId = 100) => {
  return jwt.sign(
    { 
      role_id: roleId, 
      user_id: userId,
      sub: userId,
    }, 
    JWT_SECRET, 
    { expiresIn: '1h' }
  );
};

module.exports = { generateToken, ROLES };
