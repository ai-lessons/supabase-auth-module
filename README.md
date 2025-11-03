# Supabase Auth Module

A custom Supabase authentication module with Express.js server, JWT validation, and middleware for secure user authentication and registration logging.

## Features

- 🔐 **Custom Supabase Authentication** - Process Supabase auth callbacks
- 🛡️ **JWT Validation** - Secure token verification with JWKS
- 📝 **Registration Logging** - Automatically log user registrations to database
- 🚀 **Express.js Middleware** - Easy-to-use authentication middleware
- 🔒 **Protected Routes** - Secure your API endpoints
- 📊 **Health Checks** - Monitor server status

## Installation

```bash
npm install supabase-auth-module
```

## Quick Start

### 1. Environment Setup

Copy `.env.example` to `.env` and configure:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
PORT=3001
SITE_URL=your_application_url
```

### 2. Database Setup

Create the `wp_user_registrations` table in your Supabase database:

```sql
CREATE TABLE wp_user_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_id UUID NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  site_url TEXT
);
```

### 3. Basic Usage

```javascript
const express = require('express');
const supabaseAuth = require('supabase-auth-module');

const app = express();
app.use('/api/auth', supabaseAuth);

app.listen(3001, () => {
  console.log('Auth server running on port 3001');
});
```

## API Endpoints

### POST `/api/auth/supabase-callback`

Process Supabase authentication callbacks and log registrations.

**Request:**
```json
{
  "access_token": "supabase_jwt_token"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_uuid",
    "email": "user@example.com",
    "email_verified": true
  },
  "message": "Authentication successful"
}
```

### GET `/api/auth/test-protected`

Protected route example (requires authentication).

**Headers:**
```
Authorization: Bearer your_jwt_token
```

### GET `/api/auth/health`

Health check endpoint.

## Middleware Usage

### Authentication Middleware

Protect your routes with the included auth middleware:

```javascript
const { authMiddleware } = require('supabase-auth-module/server/middleware/authMiddleware');

app.get('/protected-route', authMiddleware, (req, res) => {
  res.json({
    message: 'Access granted',
    user: req.user
  });
});
```

## Integration with Frontend

### React/Next.js Example

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// After successful Supabase auth
const handleAuthSuccess = async (user) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    const response = await fetch('/api/auth/supabase-callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: session.access_token
      })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('User registration logged:', result.user);
    }
  }
};
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_KEY` | Your Supabase anon/public key | Yes |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key | No |
| `PORT` | Server port (default: 3001) | No |
| `SITE_URL` | Your application URL for logging | No |

## Error Handling

The module includes comprehensive error handling:

- Invalid tokens return 401
- Missing parameters return 400
- Database errors are logged but don't block authentication
- All errors include descriptive messages

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the example implementations
