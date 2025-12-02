import React, { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { CircularProgress, Box, Typography, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const { instance } = useMsal();
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function handle() {
      try {
        const resp = await instance.handleRedirectPromise();
        // If resp contains account, set active account and navigate to home
        if (!cancelled) {
          if (resp && resp.account) {
            try {
              if (instance.setActiveAccount) instance.setActiveAccount(resp.account);
            } catch (e) {
              console.warn('setActiveAccount failed', e);
            }
            navigate('/home'); // <--- CHANGE THIS LINE
          } else {
            // No account in response — still try to navigate to home if an account exists
            const active = instance.getActiveAccount && instance.getActiveAccount();
            if (active) navigate('/home'); // <--- CHANGE THIS LINE
            else setError('Could not complete sign-in. No account available.');
          }
        }
      } catch (e) {
        console.error('Auth callback error', e);
        if (!cancelled) setError(e?.message || String(e));
      }
    }
    handle();
    return () => { cancelled = true; };
  }, [instance, navigate]);

  if (error) return <Box sx={{ p: 4 }}><Alert severity="error">{error}</Alert></Box>;
  return (
    <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <CircularProgress />
      <Typography>Completing sign-in and redirecting...</Typography>
    </Box>
  );
}
