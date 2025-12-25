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
      navigate('/home'); // <--- CHANGE THIS LINE
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
        navigate('/home'); // <--- CHANGE THIS LINE
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
      <div className="login-bg-decor" aria-hidden="true"></div>
      <div className="login-card">
        <Typography component="h5">Sign in to QNu Labs
          <br />Delivery Dashboard</Typography>
        <Typography className="login-subtext">Choose a sign-in method</Typography>

        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

        <div className="login-buttons">
          <Button variant="contained" color="primary" onClick={handlePopup} disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'SIGN IN (POP UP)'}
          </Button>
          <Button variant="outlined" color="primary" onClick={handleRedirect} disabled={loading}>
            SIGN IN (REDIRECT)
          </Button>
        </div>

        <Typography className="login-footer">After successful sign-in you'll be redirected to the Dashboard Home</Typography>
        <Typography className="login-credit">
          Photo: <a href="https://unsplash.com/photos/person-using-stylus-on-tablet-with-charts-vWkwul5Bpbs" target="_blank" rel="noopener noreferrer">Unsplash</a>
        </Typography>
      </div>
    </div>
  );
}
