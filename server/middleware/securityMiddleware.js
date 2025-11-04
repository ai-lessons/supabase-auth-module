// supabase-auth-module/server/middleware/securityMiddleware.js
// Security middleware based on original WordPress plugin functionality

const rateLimit = require('express-rate-limit');

/**
 * Rate limiting middleware based on original plugin's rate limiting
 */
function rateLimitMiddleware(maxRequests, windowMinutes) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000, // Convert minutes to milliseconds
    max: maxRequests,
    message: {
      error: 'Too many requests. Please try again later.',
      status: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use IP + user agent for more precise rate limiting (like original plugin)
      return `${req.ip}-${req.get('User-Agent')}`;
    },
    handler: (req, res) => {
      console.log(`Rate limit exceeded for IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`);
      res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
      });
    }
  });
}

/**
 * CSRF Protection middleware (based on original plugin's CSRF protection)
 */
function csrfProtection(req, res, next) {
  // Skip CSRF for GET, HEAD, OPTIONS requests (like original plugin)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.get('origin');
  const referer = req.get('referer');
  const allowedHost = process.env.SITE_URL ? new URL(process.env.SITE_URL).host : req.get('host');

  // Extract host from Origin or Referer header (like original plugin)
  let requestHost = null;
  if (origin) {
    try {
      requestHost = new URL(origin).host;
    } catch (e) {
      console.error('Invalid Origin header:', origin);
    }
  } else if (referer) {
    try {
      requestHost = new URL(referer).host;
    } catch (e) {
      console.error('Invalid Referer header:', referer);
    }
  }

  // MUST have Origin or Referer, and it MUST exactly match our host (like original plugin)
  if (!requestHost || requestHost !== allowedHost) {
    console.error('CSRF protection failed:', {
      requestHost,
      allowedHost,
      origin,
      referer,
      method: req.method,
      path: req.path
    });
    return res.status(403).json({ 
      error: 'Invalid request origin',
      details: 'CSRF protection: Origin/Referer header validation failed'
    });
  }

  next();
}

/**
 * Validate email address (based on original plugin's email validation)
 * @param {string} email Email to validate
 * @returns {string|false} Sanitized email or false if invalid
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Remove whitespace and convert to lowercase (like original plugin)
  const cleanEmail = email.trim().toLowerCase();

  // Basic email format validation (like original plugin)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    console.error('Invalid email format:', cleanEmail);
    return false;
  }

  // Additional check: Max length 254 characters (RFC 5321) - like original plugin
  if (cleanEmail.length > 254) {
    console.error('Email too long:', cleanEmail.length, 'characters');
    return false;
  }

  // Additional security: Check for common injection patterns
  const injectionPatterns = [
    /[\r\n]/,
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(cleanEmail)) {
      console.error('Email contains potential injection:', cleanEmail);
      return false;
    }
  }

  return cleanEmail;
}

/**
 * Validate UUID format (based on original plugin's UUID validation)
 * @param {string} uuid UUID to validate
 * @returns {string|false} Sanitized UUID or false if invalid
 */
function validateUuid(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }

  // Remove whitespace and convert to lowercase (like original plugin)
  const cleanUuid = uuid.trim().toLowerCase();

  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // Where y is one of [8, 9, a, b] (like original plugin)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  if (!uuidPattern.test(cleanUuid)) {
    console.error('Invalid UUID format:', cleanUuid);
    return false;
  }

  return cleanUuid;
}

/**
 * Validate URL path (based on original plugin's URL path validation)
 * @param {string} path URL path to validate
 * @returns {string|false} Sanitized path or false if invalid
 */
function validateUrlPath(path) {
  if (!path || typeof path !== 'string') {
    return false;
  }

  // Remove whitespace (like original plugin)
  const cleanPath = path.trim();

  // Must start with / (like original plugin)
  if (!cleanPath.startsWith('/')) {
    console.error('Invalid URL path (must start with /):', cleanPath);
    return false;
  }

  // Block path traversal attempts (like original plugin)
  if (cleanPath.includes('..')) {
    console.error('Path traversal attempt detected:', cleanPath);
    return false;
  }

  // Block protocol attempts (http://, https://, javascript:, etc.) - like original plugin
  if (/^[a-z]+:/i.test(cleanPath)) {
    console.error('Protocol in path not allowed:', cleanPath);
    return false;
  }

  // Additional security checks
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /data:/i,
    /onload=/i,
    /onerror=/i,
    /%0a/i,
    /%0d/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(cleanPath)) {
      console.error('URL path contains dangerous pattern:', cleanPath);
      return false;
    }
  }

  // Max length check (reasonable URL path) - like original plugin
  if (cleanPath.length > 2000) {
    console.error('URL path too long:', cleanPath.length, 'characters');
    return false;
  }

  return cleanPath;
}

/**
 * Validate and sanitize site URL (based on original plugin's site URL validation)
 * @param {string} url Site URL to validate
 * @returns {string|false} Sanitized URL or false if invalid
 */
function validateSiteUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Basic URL validation (like original plugin)
  try {
    const urlObj = new URL(url);
    
    // Must be http or https (like original plugin)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      console.error('Site URL must use http or https protocol:', url);
      return false;
    }

    // Additional security: Check for common attack patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /data:/i,
      /%0a/i,
      /%0d/i
    ];

    const fullUrl = urlObj.toString();
    for (const pattern of dangerousPatterns) {
      if (pattern.test(fullUrl)) {
        console.error('Site URL contains dangerous pattern:', fullUrl);
        return false;
      }
    }

    return fullUrl;
  } catch (e) {
    console.error('Invalid site URL format:', url, e.message);
    return false;
  }
}

/**
 * Input sanitization middleware (based on original plugin's input validation)
 */
function sanitizeInput(req, res, next) {
  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    }
  }

  // Sanitize body parameters
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    }
  }

  next();
}

/**
 * Security headers middleware (based on original plugin's security headers)
 */
function securityHeaders(req, res, next) {
  // Prevent clickjacking attacks (like original plugin)
  res.set('X-Frame-Options', 'SAMEORIGIN');
  
  // Prevent MIME-type sniffing (like original plugin)
  res.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection in older browsers (like original plugin)
  res.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy for privacy (like original plugin)
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy (like original plugin, but adjusted for Express)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "connect-src 'self' https://*.supabase.co",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "frame-ancestors 'self'"
  ].join('; ');

  res.set('Content-Security-Policy', csp);

  next();
}

/**
 * Audit logging middleware (based on original plugin's audit logging)
 */
function auditLog(req, res, next) {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'unknown';

  // Log request details
  console.log(`[AUDIT] ${req.method} ${req.path} - IP: ${clientIp}, User-Agent: ${userAgent}`);

  // Override res.end to log response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    console.log(`[AUDIT] ${req.method} ${req.path} - Status: ${res.statusCode}, Duration: ${duration}ms`);
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

module.exports = {
  rateLimitMiddleware,
  csrfProtection,
  validateEmail,
  validateUuid,
  validateUrlPath,
  validateSiteUrl,
  sanitizeInput,
  securityHeaders,
  auditLog
};
