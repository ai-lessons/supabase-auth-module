const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Cache for JWKS keys to avoid fetching on every request
let jwksCache = null;
let cacheExpiry = null;

// Create JWKS client for Supabase
const client = jwksClient({
  jwksUri: `${process.env.SUPABASE_URL}/auth/v1/jwks`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000 // 10 minutes
});

/**
 * Get signing key from JWKS
 */
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('[JWT-VERIFY] Error getting signing key:', err);
      return callback(err);
    }
    
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Verify JWT token from Supabase
 */
async function verifyJwt(token) {
  try {
    if (!token) {
      console.error('[JWT-VERIFY] No token provided');
      return null;
    }

    console.log('[JWT-VERIFY] Verifying token');

    return new Promise((resolve, reject) => {
      jwt.verify(token, getKey, {
        algorithms: ['RS256'],
        issuer: `${process.env.SUPABASE_URL}/auth/v1`,
        audience: 'authenticated'
      }, (err, decoded) => {
        if (err) {
          console.error('[JWT-VERIFY] Token verification failed:', err.message);
          resolve(null);
        } else {
          console.log('[JWT-VERIFY] Token verified for user:', decoded.email);
          resolve(decoded);
        }
      });
    });

  } catch (error) {
    console.error('[JWT-VERIFY] Unexpected error:', error);
    return null;
  }
}

module.exports = verifyJwt;
