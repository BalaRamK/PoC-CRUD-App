import React, { useState, useEffect } from 'react';
import { Button, Box, Typography, Alert, CircularProgress } from '@mui/material';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import './LoginScreen.css';

export default function LoginScreen() {
  const { login, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    // If user is already signed in, navigate to the app home
    if (user) {
      console.log('[LoginScreen] user already signed in; navigating to /home');
      navigate('/home');
    }
  }, [user, navigate]);

  async function handlePopup() {
    setError(null);
    setLoading(true);
    try {
      const resp = await login(true);
      // login(true) returns the response when popup is used; check for success
      if (resp && resp.account) {
        console.log('[LoginScreen] popup login successful; navigating to /home');
        navigate('/home');
      } else {
        // resp may be null if redirect fallback occurred; wait briefly to let msal update account
        setTimeout(() => {
          setLoading(false);
          setError('Login did not complete. Please try redirect sign-in.');
        }, 1200);
      }
    } catch (e) {
      console.error('Popup login failed', e);
      setError(e?.message || 'Popup login failed');
      setLoading(false);
    }
  }

  async function handleRedirect() {
    setError(null);
    setLoading(true);
    try {
      // This will redirect the browser to Azure and Azure will redirect back to the configured redirect URI
      // For redirect flow we expect Azure to return to /auth/callback which will finalize login and navigate
      await login(false);
      // page will unload; if it doesn't, indicate fallback
      setLoading(false);
    } catch (e) {
      console.error('Redirect login failed', e);
      setError(e?.message || 'Redirect login failed');
      setLoading(false);
    }
  }

  return (
    <div className="login-root">
      {/* Left Panel - Image Section */}
      <div className="login-left-panel">
        <div className="login-left-content">
          <div className="login-left-header">
            <span className="login-theme-text">Welcome</span>
          </div>
          <div className="login-image-overlay"></div>
        </div>
      </div>

      {/* Right Panel - Form Section */}
      <div className="login-right-panel">
        <div className="login-form-container">
          <div className="login-brand">
            <h1 className="login-brand-name">QNU LABS</h1>
          </div>

          <div className="login-welcome">
            <h2 className="login-title">Welcome Back!</h2>
            <p className="login-subtitle">Welcome to QNu Labs Delivery Dashboard</p>
          </div>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
              {error}
            </Alert>
          )}

          <div className="login-form">
            <div className="login-divider">
              <span className="login-divider-text">Sign in with Microsoft</span>
            </div>

            <Button
              variant="outlined"
              className="login-btn-microsoft"
              onClick={handlePopup}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <>
                  <svg className="login-microsoft-icon" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 0h11v11H0z" fill="#f25022"/>
                    <path d="M12 0h11v11H12z" fill="#7fba00"/>
                    <path d="M0 12h11v11H0z" fill="#00a4ef"/>
                    <path d="M12 12h11v11H12z" fill="#ffb900"/>
                  </svg>
                  Sign in with Microsoft (Popup)
                </>
              )}
            </Button>

            <Button
              variant="contained"
              className="login-btn-primary"
              onClick={handleRedirect}
              disabled={loading}
            >
              Sign in with Microsoft (Redirect)
            </Button>

            <p className="login-signup-text">
              Secure authentication via Azure Active Directory
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
