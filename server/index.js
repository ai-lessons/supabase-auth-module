// supabase-auth-module/server/index.js
const express = require('express');
const bodyParser = require('body-parser');
const { verifyJwt } = require('./verifyJwt');
const supabase = require('../utils/supabaseClient');
const { authMiddleware } = require('./middleware/authMiddleware');
const { 
  validateEmail, 
  validateUuid, 
  validateUrlPath, 
  validateSiteUrl,
  csrfProtection,
  rateLimitMiddleware 
} = require('./middleware/securityMiddleware');

const router = express.Router();
router.use(bodyParser.json());

// Rate limiting for authentication endpoints
router.use('/supabase-callback', rateLimitMiddleware(10, 60)); // 10 attempts per 60 seconds
router.use('/admin/*', rateLimitMiddleware(20, 60)); // 20 attempts per 60 seconds for admin

/**
 * Create system user in our database
 */
async function createSystemUser(supabaseUserId, email, username = null, displayName = null) {
  try {
    const { data, error } = await supabase
      .from('system_users')
      .insert([
        {
          supabase_user_id: supabaseUserId,
          email: email,
          username: username || email.split('@')[0],
          display_name: displayName || email.split('@')[0],
          role: 'user',
          last_login: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('System user creation error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, user: data[0] };
  } catch (err) {
    console.error('System user creation exception:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get or create system user (handles race conditions)
 */
async function getOrCreateSystemUser(supabaseUserId, email) {
  try {
    // First, try to find existing user by supabase_user_id
    const { data: existingUsers, error: findError } = await supabase
      .from('system_users')
      .select('*')
      .eq('supabase_user_id', supabaseUserId)
      .limit(1);

    if (findError) {
      console.error('Error finding system user:', findError.message);
      return { success: false, error: findError.message };
    }

    if (existingUsers && existingUsers.length > 0) {
      // Update last login
      await supabase
        .from('system_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', existingUsers[0].id);
      
      return { success: true, user: existingUsers[0], existed: true };
    }

    // If not found, create new user
    return await createSystemUser(supabaseUserId, email);
  } catch (err) {
    console.error('Error in getOrCreateSystemUser:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Log authentication event
 */
async function logAuthEvent(userId, eventType, ipAddress = null, userAgent = null) {
  try {
    const { error } = await supabase
      .from('auth_events')
      .insert([
        {
          user_id: userId,
          event_type: eventType,
          ip_address: ipAddress,
          user_agent: userAgent
        }
      ]);

    if (error) {
      console.error('Auth event logging error:', error.message);
    }
  } catch (err) {
    console.error('Auth event logging exception:', err.message);
  }
}

/**
 * Find registration pair by URL
 */
async function findRegistrationPair(registrationUrl) {
  try {
    const { data, error } = await supabase
      .from('wp_registration_pairs')
      .select('*')
      .eq('registration_page_url', registrationUrl)
      .limit(1);

    if (error) {
      console.error('Error finding registration pair:', error.message);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error('Exception finding registration pair:', err.message);
    return null;
  }
}

/**
 * Enhanced registration logging with pair information
 */
async function logRegistrationWithPair(userEmail, supabaseUserId, registrationUrl, siteUrl) {
  try {
    // Find matching registration pair
    const pair = await findRegistrationPair(registrationUrl);
    
    const logData = {
      user_email: userEmail,
      user_id: supabaseUserId,
      site_url: siteUrl,
      registration_url: registrationUrl,
      pair_id: pair ? pair.id : null,
      thankyou_page_url: pair ? pair.thankyou_page_url : null
    };

    const { data, error } = await supabase
      .from('wp_user_registrations')
      .insert([logData])
      .select();

    if (error) {
      console.error('Registration logging error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, registration: data[0] };
  } catch (err) {
    console.error('Registration logging exception:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Основной callback для Supabase авторизации с расширенной функциональностью
 */
router.post('/supabase-callback', csrfProtection, async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) {
      return res.status(400).json({ error: 'Missing access_token' });
    }

    // Проверяем токен
    const payload = await verifyJwt(access_token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Извлекаем данные пользователя из токена
    const { sub: supabase_user_id, email, aud } = payload;

    // SECURITY: Validate all inputs
    const validatedEmail = validateEmail(email);
    const validatedUserId = validateUuid(supabase_user_id);
    
    if (!validatedEmail || !validatedUserId) {
      return res.status(400).json({ error: 'Invalid user data' });
    }

    // Get site URL from environment or request
    const siteUrl = process.env.SITE_URL || req.headers.origin || 'unknown';
    const validatedSiteUrl = validateSiteUrl(siteUrl);

    // Get registration URL from referer
    const registrationUrl = req.headers.referer ? new URL(req.headers.referer).pathname : '/';
    const validatedRegistrationUrl = validateUrlPath(registrationUrl);

    // Create or get system user
    const userResult = await getOrCreateSystemUser(validatedUserId, validatedEmail);
    if (!userResult.success) {
      return res.status(500).json({ error: 'Failed to create system user: ' + userResult.error });
    }

    // Log registration with pair information
    const logResult = await logRegistrationWithPair(
      validatedEmail, 
      validatedUserId, 
      validatedRegistrationUrl, 
      validatedSiteUrl
    );

    // Log authentication event
    await logAuthEvent(
      validatedUserId, 
      'registration', 
      req.ip, 
      req.get('User-Agent')
    );

    // Determine redirect URL based on registration pair
    let redirectUrl = '/thank-you'; // Default fallback
    if (logResult.success && logResult.registration && logResult.registration.thankyou_page_url) {
      redirectUrl = logResult.registration.thankyou_page_url;
    }

    // Возвращаем успешный ответ с расширенной информацией
    res.status(200).json({
      message: 'User verified and registration logged successfully',
      user: { 
        email: validatedEmail, 
        supabase_user_id: validatedUserId, 
        aud,
        system_user_id: userResult.user.id,
        role: userResult.user.role
      },
      registration: logResult.registration,
      redirect_url: redirectUrl,
      system_user_created: !userResult.existed
    });
  } catch (err) {
    console.error('Callback error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Тестовый маршрут для проверки middleware аутентификации
 */
router.get('/test-protected', authMiddleware, (req, res) => {
  res.json({ 
    message: 'Access granted', 
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

/**
 * Admin routes for registration pairs management
 */
const adminRouter = express.Router();

// Apply authentication middleware to all admin routes
adminRouter.use(authMiddleware);
adminRouter.use(csrfProtection);

/**
 * Get all registration pairs
 */
adminRouter.get('/pairs', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('wp_registration_pairs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ pairs: data });
  } catch (err) {
    console.error('Admin pairs error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create new registration pair
 */
adminRouter.post('/pairs', async (req, res) => {
  try {
    const { site_url, registration_page_url, thankyou_page_url, registration_page_id, thankyou_page_id } = req.body;

    // Validate inputs
    const validatedSiteUrl = validateSiteUrl(site_url);
    const validatedRegUrl = validateUrlPath(registration_page_url);
    const validatedTyUrl = validateUrlPath(thankyou_page_url);

    if (!validatedSiteUrl || !validatedRegUrl || !validatedTyUrl) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    const { data, error } = await supabase
      .from('wp_registration_pairs')
      .insert([
        {
          site_url: validatedSiteUrl,
          registration_page_url: validatedRegUrl,
          thankyou_page_url: validatedTyUrl,
          registration_page_id: registration_page_id || null,
          thankyou_page_id: thankyou_page_id || null
        }
      ])
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ pair: data[0] });
  } catch (err) {
    console.error('Admin create pair error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update registration pair
 */
adminRouter.put('/pairs/:id', async (req, res) => {
  try {
    const pairId = req.params.id;
    const { site_url, registration_page_url, thankyou_page_url, registration_page_id, thankyou_page_id } = req.body;

    // Validate UUID
    const validatedPairId = validateUuid(pairId);
    if (!validatedPairId) {
      return res.status(400).json({ error: 'Invalid pair ID' });
    }

    // Validate inputs
    const validatedSiteUrl = validateSiteUrl(site_url);
    const validatedRegUrl = validateUrlPath(registration_page_url);
    const validatedTyUrl = validateUrlPath(thankyou_page_url);

    if (!validatedSiteUrl || !validatedRegUrl || !validatedTyUrl) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    const { data, error } = await supabase
      .from('wp_registration_pairs')
      .update({
        site_url: validatedSiteUrl,
        registration_page_url: validatedRegUrl,
        thankyou_page_url: validatedTyUrl,
        registration_page_id: registration_page_id || null,
        thankyou_page_id: thankyou_page_id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', validatedPairId)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Pair not found' });
    }

    res.json({ pair: data[0] });
  } catch (err) {
    console.error('Admin update pair error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete registration pair
 */
adminRouter.delete('/pairs/:id', async (req, res) => {
  try {
    const pairId = req.params.id;

    // Validate UUID
    const validatedPairId = validateUuid(pairId);
    if (!validatedPairId) {
      return res.status(400).json({ error: 'Invalid pair ID' });
    }

    const { error } = await supabase
      .from('wp_registration_pairs')
      .delete()
      .eq('id', validatedPairId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Pair deleted successfully' });
  } catch (err) {
    console.error('Admin delete pair error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Admin dashboard - serve HTML interface
 */
adminRouter.get('/dashboard', (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Supabase Auth Module - Admin</title>
      <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
          .tabs { display: flex; gap: 10px; margin-bottom: 20px; }
          .tab { padding: 10px 20px; background: #e9ecef; border: none; border-radius: 4px; cursor: pointer; }
          .tab.active { background: #007bff; color: white; }
          .table { width: 100%; border-collapse: collapse; }
          .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
          .table th { background: #f8f9fa; font-weight: 600; }
          .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
          .btn-primary { background: #007bff; color: white; }
          .btn-danger { background: #dc3545; color: white; }
          .form-group { margin-bottom: 15px; }
          .form-group label { display: block; margin-bottom: 5px; font-weight: 600; }
          .form-group input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); }
          .modal-content { background: white; margin: 50px auto; padding: 20px; width: 500px; border-radius: 8px; }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h1>🚀 Supabase Auth Module - Admin</h1>
              <div>Welcome, ${req.user.email}</div>
          </div>

          <div class="tabs">
              <button class="tab active" onclick="showTab('pairs')">Registration Pairs</button>
              <button class="tab" onclick="showTab('users')">System Users</button>
              <button class="tab" onclick="showTab('logs')">Registration Logs</button>
          </div>

          <div id="pairs-tab" class="tab-content">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                  <h2>Registration Pairs</h2>
                  <button class="btn btn-primary" onclick="showAddPairModal()">Add New Pair</button>
              </div>
              <div id="pairs-table-container">
                  Loading...
              </div>
          </div>

          <div id="users-tab" class="tab-content" style="display: none;">
              <h2>System Users</h2>
              <div id="users-table-container">
                  Loading...
              </div>
          </div>

          <div id="logs-tab" class="tab-content" style="display: none;">
              <h2>Registration Logs</h2>
              <div id="logs-table-container">
                  Loading...
              </div>
          </div>
      </div>

      <!-- Add/Edit Pair Modal -->
      <div id="pair-modal" class="modal">
          <div class="modal-content">
              <h2 id="modal-title">Add Registration Pair</h2>
              <form id="pair-form">
                  <div class="form-group">
                      <label for="site_url">Site URL</label>
                      <input type="url" id="site_url" name="site_url" required>
                  </div>
                  <div class="form-group">
                      <label for="registration_page_url">Registration Page URL</label>
                      <input type="text" id="registration_page_url" name="registration_page_url" placeholder="/register" required>
                  </div>
                  <div class="form-group">
                      <label for="thankyou_page_url">Thank You Page URL</label>
                      <input type="text" id="thankyou_page_url" name="thankyou_page_url" placeholder="/thank-you" required>
                  </div>
                  <div style="display: flex; gap: 10px; margin-top: 20px;">
                      <button type="button" class="btn btn-primary" onclick="savePair()">Save</button>
                      <button type="button" class="btn" onclick="closeModal()">Cancel</button>
                  </div>
              </form>
          </div>
      </div>

      <script>
          let currentTab = 'pairs';
          let editingPairId = null;

          function showTab(tabName) {
              currentTab = tabName;
              document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
              document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
              
              document.getElementById(tabName + '-tab').style.display = 'block';
              event.target.classList.add('active');
              
              loadTabData(tabName);
          }

          function loadTabData(tabName) {
              const token = localStorage.getItem('auth_token');
              
              fetch(\`/api/auth/admin/\${tabName}\`, {
                  headers: { 'Authorization': \`Bearer \${token}\` }
              })
              .then(response => response.json())
              .then(data => {
                  if (tabName === 'pairs') {
                      renderPairsTable(data.pairs);
                  } else if (tabName === 'users') {
                      renderUsersTable(data.users);
                  } else if (tabName === 'logs') {
                      renderLogsTable(data.logs);
                  }
              })
              .catch(error => {
                  console.error('Error loading data:', error);
                  document.getElementById(tabName + '-tab').innerHTML = 'Error loading data';
              });
          }

          function renderPairsTable(pairs) {
              const container = document.getElementById('pairs-table-container');
              
              if (!pairs || pairs.length === 0) {
                  container.innerHTML = '<p>No registration pairs found.</p>';
                  return;
              }

              let html = \`
                  <table class="table">
                      <thead>
                          <tr>
                              <th>Site URL</th>
                              <th>Registration URL</th>
                              <th>Thank You URL</th>
                              <th>Created</th>
                              <th>Actions</th>
                          </tr>
                      </thead>
                      <tbody>
              \`;

              pairs.forEach(pair => {
                  html += \`
                      <tr>
                          <td>\${pair.site_url}</td>
                          <td>\${pair.registration_page_url}</td>
                          <td>\${pair.thankyou_page_url}</td>
                          <td>\${new Date(pair.created_at).toLocaleDateString()}</td>
                          <td>
                              <button class="btn" onclick="editPair('\${pair.id}')">Edit</button>
                              <button class="btn btn-danger" onclick="deletePair('\${pair.id}')">Delete</button>
                          </td>
                      </tr>
                  \`;
              });

              html += '</tbody></table>';
              container.innerHTML = html;
          }

          function showAddPairModal() {
              editingPairId = null;
              document.getElementById('modal-title').textContent = 'Add Registration Pair';
              document.getElementById('pair-form').reset();
              document.getElementById('pair-modal').style.display = 'block';
          }

          function closeModal() {
              document.getElementById('pair-modal').style.display = 'none';
          }

          function savePair() {
              const formData = new FormData(document.getElementById('pair-form'));
              const data = Object.fromEntries(formData);
              const token = localStorage.getItem('auth_token');

              const url = editingPairId 
                  ? \`/api/auth/admin/pairs/\${editingPairId}\`
                  : '/api/auth/admin/pairs';
              
              const method = editingPairId ? 'PUT' : 'POST';

              fetch(url, {
                  method: method,
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': \`Bearer \${token}\`
                  },
                  body: JSON.stringify(data)
              })
              .then(response => response.json())
              .then(result => {
                  if (result.error) {
                      alert('Error: ' + result.error);
                  } else {
                      closeModal();
                      loadTabData('pairs');
                  }
              })
              .catch(error => {
                  alert('Error saving pair: ' + error.message);
              });
          }

          function editPair(pairId) {
              const token = localStorage.getItem('auth_token');
              
              fetch(\`/api/auth/admin/pairs\`, {
                  headers: { 'Authorization': \`Bearer \${token}\` }
              })
              .then(response => response.json())
              .then(data => {
                  const pair = data.pairs.find(p => p.id === pairId);
                  if (pair) {
                      editingPairId = pairId;
                      document.getElementById('modal-title').textContent = 'Edit Registration Pair';
                      document.getElementById('site_url').value = pair.site_url;
                      document.getElementById('registration_page_url').value = pair.registration_page_url;
                      document.getElementById('thankyou_page_url').value = pair.thankyou_page_url;
                      document.getElementById('pair-modal').style.display = 'block';
                  }
              });
          }

          function deletePair(pairId) {
              if (!confirm('Are you sure you want to delete this registration pair?')) return;

              const token = localStorage.getItem('auth_token');
              
              fetch(\`/api/auth/admin/pairs/\${pairId}\`, {
                  method: 'DELETE',
                  headers: { 'Authorization': \`Bearer \${token}\` }
              })
              .then(response => response.json())
              .then(result => {
                  if (result.error) {
                      alert('Error: ' + result.error);
                  } else {
                      loadTabData('pairs');
                  }
              })
              .catch(error => {
                  alert('Error deleting pair: ' + error.message);
              });
          }

          // Load initial data
          loadTabData('pairs');
      </script>
  </body>
  </html>
  `;

  res.send(html);
});

// Mount admin routes
router.use('/admin', adminRouter);

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;
