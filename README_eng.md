# Supabase Auth Module

A universal, production-ready Supabase authentication module with Express.js server, JWT validation, and middleware for secure user authentication and registration logging.

## 🔍 Security Check

**✅ SECURITY CONFIRMED**: The repository contains no secret keys, passwords, or tokens. All sensitive data is stored only in `.env.example` as placeholders.

## 📋 Module Description

### 1) Technical Features:

- **Express.js server** with authentication middleware
- **JWT verification** with JWKS caching (10 minutes)
- **Universal Supabase client** for server operations
- **Integration via API routes**
- **Cross-domain requests** with CORS support

### 2) Functionality:

**Server Part (`server/`):**
- `index.js` - main router with Supabase callback
- `verifyJwt.js` - secure token validation with JWKS caching
- `middleware/authMiddleware.js` - route protection with Bearer token validation

**Utilities:**
- Built-in Supabase client with disabled session for server operations

### 3) Key Routes:
- `POST /api/supabase-callback` - authentication processing and registration logging
- `GET /api/test-protected` - test protected route
- `GET /api/health` - health check endpoint

### 4) Security:
- **JWKS caching** for performance (10 minutes)
- **Bearer token validation** in middleware
- **Disabled session** for server operations
- **Error handling** with appropriate HTTP statuses
- **Issuer and audience validation** in JWT tokens

### 5) Project Integration:
- **Universal structure** for any Express.js application
- **Registration logging** to `wp_user_registrations` table
- **Analytics support** through tracking fields
- **Flexible configuration** through environment variables

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

Execute SQL query in your Supabase database using the provided schema file:

```sql
-- Use the complete schema from database/schema.sql
-- This creates wp_user_registrations and auth_events tables
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

### Step 5: Frontend Integration

#### React/Next.js Example:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const handleSupabaseAuth = async (email, password) => {
  try {
    // Authentication via Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Send token to custom callback
    if (data.session) {
      const response = await fetch('/api/auth/supabase-callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: data.session.access_token
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('User authenticated and logged:', result.user);
        return result.user;
      } else {
        throw new Error(result.error);
      }
    }
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
};
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
```

## 🤖 Prompts for VS Code AI Extensions

### Prompt 1: Module Integration

```
I need to integrate supabase-auth-module into my Express.js project.

Requirements:
1. Add authentication routes at /api/auth
2. Configure environment variables for Supabase
3. Create protected routes with authMiddleware
4. Integrate with React/Next.js frontend

Use module: npm install supabase-auth-module

Provide complete integration code with explanations.
```

### Prompt 2: Protected API Endpoints

```
Create protected API endpoints using authMiddleware from supabase-auth-module.

Requirements:
1. GET /api/user/profile - returns user data
2. POST /api/user/settings - updates user settings
3. GET /api/admin/users - admin access only
4. Add error handling and validation

Use: const { authMiddleware } = require('supabase-auth-module/server/middleware/authMiddleware');
```

### Prompt 3: React Frontend Integration

```
Write React components for integration with supabase-auth-module:

1. LoginForm component with Supabase authentication handling
2. Send access_token to /api/auth/supabase-callback after successful login
3. Handle responses and manage authentication state
4. Protected routes in React Router

Use: @supabase/supabase-js for client authentication.
```

## 🔧 Database Schema

The module uses the following tables (see `database/schema.sql`):

### wp_user_registrations
- Logs user registrations with email, user_id, and timestamp
- Used for analytics and user tracking

### auth_events (optional)
- Tracks authentication events (login, logout, registration)
- Useful for security monitoring

## 🐛 Troubleshooting

### Common Issues:

1. **"Invalid token" error**
   - Check SUPABASE_URL in environment variables
   - Ensure token hasn't expired
   - Verify JWT settings in Supabase Dashboard

2. **"Database insert error"**
   - Check existence of `wp_user_registrations` table
   - Verify SUPABASE_SERVICE_KEY is correct
   - Check database access permissions

3. **CORS errors**
   - Ensure frontend sends requests to correct port
   - Check CORS settings in your Express application

## 📞 Support

- Create GitHub issues for bugs and questions
- Check Supabase documentation for general authentication questions
- Use the prompts above for quick integration with AI assistants

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
