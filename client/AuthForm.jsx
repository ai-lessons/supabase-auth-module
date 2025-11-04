// supabase-auth-module/client/AuthForm.jsx
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Auth Form Component
 * React component for Supabase authentication with registration pair support
 */
const AuthForm = ({ 
  supabaseUrl, 
  supabaseAnonKey, 
  siteUrl = window.location.origin,
  redirectUrl = '/thank-you',
  onSuccess = () => {},
  onError = () => {},
  className = '',
  showMagicLink = true,
  showSocialLogin = true
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [activeTab, setActiveTab] = useState('signin'); // 'signin' or 'signup'

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Get registration pairs from environment or global config
  const registrationPairs = window.SUPABASE_CFG?.registrationPairs || [];

  useEffect(() => {
    // Check for existing session
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setMessage('Already signed in');
        setMessageType('success');
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setMessageType('');

    try {
      let result;

      if (activeTab === 'signin') {
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      } else {
        result = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${siteUrl}/auth/callback`,
          },
        });
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Send token to our callback endpoint for system user creation and logging
      if (result.data.session) {
        const callbackResult = await fetch('/api/auth/supabase-callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: result.data.session.access_token
          })
        });

        const callbackData = await callbackResult.json();

        if (!callbackResult.ok) {
          throw new Error(callbackData.error || 'Authentication failed');
        }

        setMessage(
          activeTab === 'signin' 
            ? 'Successfully signed in!' 
            : 'Account created successfully! Check your email for verification.'
        );
        setMessageType('success');

        // Call success callback
        onSuccess(callbackData);

        // Redirect based on registration pair or default
        if (callbackData.redirect_url) {
          window.location.href = callbackData.redirect_url;
        } else {
          window.location.href = redirectUrl;
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setMessage(error.message || 'Authentication failed');
      setMessageType('error');
      onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      });

      if (error) throw error;

      setMessage('Check your email for the magic link!');
      setMessageType('success');
    } catch (error) {
      setMessage(error.message || 'Failed to send magic link');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setIsLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error) {
      setMessage(error.message || `Failed to sign in with ${provider}`);
      setMessageType('error');
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setMessage('Successfully signed out');
      setMessageType('success');
      window.location.reload();
    } catch (error) {
      setMessage(error.message || 'Failed to sign out');
      setMessageType('error');
    }
  };

  return (
    <div className={`supabase-auth-form ${className}`}>
      <style jsx>{`
        .supabase-auth-form {
          max-width: 400px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: white;
        }
        .tabs {
          display: flex;
          margin-bottom: 20px;
          border-bottom: 1px solid #e0e0e0;
        }
        .tab {
          flex: 1;
          padding: 10px;
          text-align: center;
          background: none;
          border: none;
          cursor: pointer;
          border-bottom: 2px solid transparent;
        }
        .tab.active {
          border-bottom-color: #007bff;
          color: #007bff;
        }
        .form-group {
          margin-bottom: 15px;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
        }
        .form-group input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .btn {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          margin-bottom: 10px;
        }
        .btn-primary {
          background: #007bff;
          color: white;
        }
        .btn-google {
          background: #db4437;
          color: white;
        }
        .btn-facebook {
          background: #4267b2;
          color: white;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .message {
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
        }
        .message.success {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
        }
        .message.error {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }
        .divider {
          text-align: center;
          margin: 20px 0;
          position: relative;
        }
        .divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: #e0e0e0;
        }
        .divider span {
          background: white;
          padding: 0 10px;
          color: #666;
        }
        .social-buttons {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }
        .social-buttons .btn {
          flex: 1;
        }
      `}</style>

      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'signin' ? 'active' : ''}`}
          onClick={() => setActiveTab('signin')}
        >
          Sign In
        </button>
        <button 
          className={`tab ${activeTab === 'signup' ? 'active' : ''}`}
          onClick={() => setActiveTab('signup')}
        >
          Sign Up
        </button>
      </div>

      {showSocialLogin && (
        <div className="social-buttons">
          <button 
            className="btn btn-google"
            onClick={() => handleSocialLogin('google')}
            disabled={isLoading}
          >
            Google
          </button>
          <button 
            className="btn btn-facebook"
            onClick={() => handleSocialLogin('facebook')}
            disabled={isLoading}
          >
            Facebook
          </button>
        </div>
      )}

      <div className="divider">
        <span>or</span>
      </div>

      <form onSubmit={handleAuth}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="your@email.com"
          />
        </div>

        {activeTab === 'signin' && (
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Your password"
            />
          </div>
        )}

        {activeTab === 'signup' && (
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Create a password"
              minLength={6}
            />
          </div>
        )}

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : activeTab === 'signin' ? 'Sign In' : 'Sign Up'}
        </button>
      </form>

      {showMagicLink && activeTab === 'signin' && (
        <>
          <div className="divider">
            <span>or</span>
          </div>
          <button 
            className="btn"
            onClick={handleMagicLink}
            disabled={isLoading || !email}
          >
            Send Magic Link
          </button>
        </>
      )}

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
        By {activeTab === 'signin' ? 'signing in' : 'signing up'}, you agree to our Terms of Service and Privacy Policy.
      </div>
    </div>
  );
};

export default AuthForm;
