# Supabase Auth Module v2.0.0

A full-featured, production-ready Supabase authentication module with Express.js server, user management, registration pairs system, admin interface, and React components.

## 🔍 Security Check

**✅ SECURITY CONFIRMED**: The repository contains no secret keys, passwords, or tokens. All sensitive data is stored only in `.env.example` as placeholders.

## 🚀 What's New in v2.0.0

### Complete Feature Set from Original WordPress Plugin:

- **✅ System Users Management** - Create and manage users in dedicated Supabase table
- **✅ Registration Pairs System** - Map registration pages to thank you pages (full logic from original plugin)
- **✅ Admin Dashboard** - Full web interface for managing pairs and users
- **✅ Enhanced Security** - CSRF protection, rate limiting, input validation (all security measures from original)
- **✅ React Components** - Ready-to-use AuthForm component for frontend integration
- **✅ Audit Logging** - Comprehensive authentication event tracking
- **✅ Production Ready** - All original WordPress plugin features without WordPress dependency

## 📋 Module Description

### 1) Technical Features:

- **Express.js server** with authentication middleware and admin interface
- **JWT verification** with JWKS caching (10 minutes)
- **Universal Supabase client** for server operations
- **System users management** in dedicated Supabase table
- **Registration pairs system** with full CRUD operations
- **Admin web interface** for easy management
- **Enhanced security** with CSRF protection, rate limiting, and input validation
- **React components** for frontend integration
- **Audit logging** for security monitoring

### 2) Functionality:

**Server Part (`server/`):**
- `index.js` - main router with Supabase callback and admin routes
- `verifyJwt.js` - secure token validation with JWKS caching
- `middleware/authMiddleware.js` - route protection with Bearer token validation
- `middleware/securityMiddleware.js` - CSRF protection, rate limiting, input validation

**Client Part (`client/`):**
- `AuthForm.jsx` - React component for authentication forms

**Database (`database/`):**
- `schema.sql` - complete database schema with all tables

**Utilities:**
- Built-in Supabase client with disabled session for server operations

### 3) Key Routes:
- `POST /api/auth/supabase-callback` - authentication processing, user creation, and registration logging
- `GET /api/auth/test-protected` - test protected route
- `GET /api/auth/health` - health check endpoint
- `GET /api/auth/admin/dashboard` - admin web interface
- `GET/POST/PUT/DELETE /api/auth/admin/pairs` - registration pairs management API
- `GET /api/auth/admin/users` - system users management

### 4) Security (All measures from original plugin):
- **JWKS caching** for performance (10 minutes)
- **Bearer token validation** in middleware
- **CSRF protection** with Origin/Referer validation
- **Rate limiting** for authentication endpoints
- **Input validation** for email, UUID, URL paths
- **Security headers** (CSP, X-Frame-Options, etc.)
- **Audit logging** for all authentication events

### 5) Database Schema:

**system_users** - System user accounts (replaces WordPress users):
- `supabase_user_id` - Reference to Supabase auth user
- `email` - User email
- `username` - Username
- `display_name` - Display name
- `role` - User role (user, admin, etc.)
- `last_login` - Last login timestamp

**wp_registration_pairs** - Registration pairs (from original plugin):
- `site_url` - Site URL
- `registration_page_url` - Registration page URL
- `thankyou_page_url` - Thank you page URL
- `registration_page_id` - External page ID
- `thankyou_page_id` - External page ID

**wp_user_registrations** - Registration logging (from original plugin):
- `user_email` - User email
- `user_id` - Supabase user ID
- `pair_id` - Reference to registration pair
- `registration_url` - URL where user registered
- `thankyou_page_url` - URL of thank you page

**auth_events** - Authentication events logging:
- `user_id` - User ID
- `event_type` - Event type (login, logout, registration)
- `ip_address` - Client IP address
- `user_agent` - Client user agent

## 🚀 Step-by-Step Integration Guide

### Step 1: Module Installation

```bash
# Via npm (recommended)
npm install supabase-auth-module

# Or via git
npm install github:ai-lessons/supabase-auth-module
```

### Step 2: Environment Setup

Create `.env` file in your project root:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=3001
NODE_ENV=development

# Application Configuration
SITE_URL=your_application_url
```

### Step 3: Database Setup

Execute SQL script in your Supabase database:

```sql
-- Use the complete schema from database/schema.sql
-- This creates all necessary tables:
-- system_users, wp_registration_pairs, wp_user_registrations, auth_events
```

### Step 4: Integration in Express.js Application

```javascript
const express = require('express');
const supabaseAuth = require('supabase-auth-module');

const app = express();

// Middleware for JSON parsing
app.use(express.json());

// Connect authentication module
app.use('/api/auth', supabaseAuth);

// Your regular routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
```

### Step 5: Frontend Integration with React Component

```javascript
import AuthForm from 'supabase-auth-module/client/AuthForm';

// In your React component
function LoginPage() {
  return (
    <div>
      <h1>Welcome to Our App</h1>
      <AuthForm
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL}
        supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
        onSuccess={(userData) => {
          console.log('User authenticated:', userData);
          // Handle successful authentication
        }}
        onError={(error) => {
          console.error('Authentication failed:', error);
          // Handle authentication errors
        }}
      />
    </div>
  );
}
```

### Step 6: Route Protection

```javascript
const { authMiddleware } = require('supabase-auth-module/server/middleware/authMiddleware');

// Protect individual routes
app.get('/api/user/profile', authMiddleware, (req, res) => {
  res.json({
    message: 'Access granted to protected profile',
    user: req.user
  });
});

// Admin routes protection
app.get('/api/admin/*', authMiddleware, (req, res, next) => {
  // Additional admin role check if needed
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
});
```

### Step 7: Admin Interface Access

Access the admin dashboard at:
```
GET /api/auth/admin/dashboard
```

The admin interface provides:
- Registration pairs management (CRUD operations)
- System users overview
- Registration logs viewing
- Easy configuration management

## 🔧 Registration Pairs System

The registration pairs system allows you to map specific registration pages to their corresponding thank you pages, exactly like the original WordPress plugin.

### Creating Registration Pairs:

```javascript
// Via API
fetch('/api/auth/admin/pairs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    site_url: 'https://yoursite.com',
    registration_page_url: '/services/register',
    thankyou_page_url: '/services/thank-you',
    registration_page_id: 'services-register',
    thankyou_page_id: 'services-thankyou'
  })
});

// Or via the admin dashboard at /api/auth/admin/dashboard
```

### How Registration Pairs Work:

1. User registers on `/services/register`
2. System finds matching registration pair
3. User is redirected to `/services/thank-you`
4. Registration is logged with pair context for analytics

## 🤖 Prompts for VS Code AI Extensions

### Prompt 1: Complete Module Integration

```
I need to integrate supabase-auth-module v2.0.0 into my Express.js project.

Requirements:
1. Add authentication routes at /api/auth
2. Configure environment variables for Supabase
3. Set up database tables using provided schema
4. Create protected routes with authMiddleware
5. Integrate React AuthForm component
6. Set up registration pairs system
7. Configure admin dashboard access

Use module: npm install supabase-auth-module

Provide complete integration code with explanations.
```

### Prompt 2: Registration Pairs Management

```
Implement registration pairs management in my application using supabase-auth-module:

Requirements:
1. Create API endpoints for managing registration pairs
2. Integrate admin dashboard for visual management
3. Handle registration redirects based on pairs
4. Log registrations with pair context
5. Add validation and error handling

Use: supabase-auth-module admin routes and React components.
```

### Prompt 3: React Frontend with Registration Pairs

```
Create a React application with supabase-auth-module integration:

1. Multiple registration pages with different thank you pages
2. AuthForm component on each registration page
3. Dynamic redirects based on registration pairs
4. User session management
5. Admin interface for managing pairs

Use: @supabase/supabase-js and supabase-auth-module/client/AuthForm
```

### Prompt 4: Security Implementation

```
Implement comprehensive security for my authentication system:

1. CSRF protection for all endpoints
2. Rate limiting for authentication routes
3. Input validation for all user inputs
4. Security headers configuration
5. Audit logging for security events

Use: supabase-auth-module security middleware and validation functions.
```

## 🐛 Troubleshooting

### Common Issues:

1. **"Invalid token" error**
   - Check SUPABASE_URL in environment variables
   - Ensure token hasn't expired
   - Verify JWT settings in Supabase Dashboard

2. **"Database insert error"**
   - Check existence of all required tables
   - Verify SUPABASE_SERVICE_KEY is correct
   - Check database access permissions and RLS policies

3. **"CSRF protection failed"**
   - Ensure requests include proper Origin/Referer headers
   - Verify SITE_URL environment variable matches your domain
   - Check if request is coming from same origin

4. **"Rate limit exceeded"**
   - Wait for rate limit window to reset
   - Implement exponential backoff in your client
   - Consider increasing rate limits for high-traffic applications

5. **Admin dashboard not loading**
   - Verify user has valid JWT token
   - Check if user has appropriate permissions
   - Ensure all required tables are created

6. **Registration pairs not working**
   - Verify registration pair URLs match exactly
   - Check if pair is properly saved in database
   - Ensure registration URL is captured from referer

## 🔒 Security Best Practices

### Environment Variables:
- Never commit `.env` files to version control
- Use different keys for development and production
- Rotate SUPABASE_SERVICE_KEY regularly

### Database Security:
- Enable RLS policies on Supabase tables
- Use service role key only for server-side operations
- Implement proper indexing for performance

### Application Security:
- Always use HTTPS in production
- Implement proper CORS configuration
- Regularly update dependencies
- Monitor audit logs for suspicious activity

## 📞 Support

- Create GitHub issues for bugs and questions: [GitHub Repository](https://github.com/ai-lessons/supabase-auth-module)
- Check Supabase documentation for general authentication questions
- Use the prompts above for quick integration with AI assistants

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Version**: 2.0.0  
**Last Updated**: November 2025  
**Compatibility**: Node.js >= 16.0.0, Express.js 4.x, React 16.8+
