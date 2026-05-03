const jwt = require('jsonwebtoken');
const authService = require('../services/service');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const publicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');

    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });


    const isRevoked = await authService.isJtiDenylisted(decoded.jti);
    if (isRevoked) {
      logger.warn(`Attempt to use revoked token: jti=${decoded.jti}, user=${decoded.sub}`);
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired' });
    }
    logger.error('Token verification failed', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = {
  authenticate,
};
