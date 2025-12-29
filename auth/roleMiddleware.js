const jwt = require('jsonwebtoken');
const { getUserContext, clearUserContext } = require('./contextStore');

const ROLES = Object.freeze({
  ADMIN: 1,
  TEACHER: 2,
  STUDENT: 3,
});

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  if (req.cookies?.token) {
    return req.cookies.token;
  }

  return null;
};

const roleMiddleware = (...allowedRoles) => {
  const hasRoleRestrictions = allowedRoles.length > 0;

  return (req, res, next) => {
    let token;
    try {
      token = getTokenFromRequest(req);
      if (!token) {
        return res.status(401).json({ error: 'Missing authorization token' });
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        // Misconfiguration that should be fixed during setup; fail fast.
        console.error('JWT_SECRET is not configured in the environment.');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const payload = jwt.verify(token, jwtSecret);

      if (!payload?.role_id) {
        return res.status(403).json({ error: 'Missing role in token payload' });
      }

      req.user = payload;
      req.context = req.context || {};
      req.context.user =
        getUserContext(token) || {
          id: payload.user_id,
          roleId: payload.role_id,
        };
      req.context.token = token;

      if (hasRoleRestrictions && !allowedRoles.includes(payload.role_id)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      return next();
    } catch (error) {
      console.error('Authorization middleware error:', error.message);
      const isJwtError =
        error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError';

      if (isJwtError) {
        clearUserContext(token);
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      return res.status(500).json({ error: 'Authorization failed' });
    }
  };
};

module.exports = {
  roleMiddleware,
  ROLES,
};

