const verifyJwt = require('../verifyJwt');

/**
 * Authentication middleware for Express.js routes
 * Validates JWT tokens and attaches user data to request
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authorization header required',
        success: false
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({
        error: 'Token is required',
        success: false
      });
    }

    console.log('[AUTH-MIDDLEWARE] Validating token');

    // Verify JWT token
    const userData = await verifyJwt(token);
    
    if (!userData) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        success: false
      });
    }

    // Attach user data to request
    req.user = {
      id: userData.sub,
      email: userData.email,
      email_verified: userData.email_verified,
      role: userData.role || 'user'
    };

    console.log('[AUTH-MIDDLEWARE] User authenticated:', userData.email);
    next();

  } catch (error) {
    console.error('[AUTH-MIDDLEWARE] Error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      success: false
    });
  }
};

module.exports = { authMiddleware };
