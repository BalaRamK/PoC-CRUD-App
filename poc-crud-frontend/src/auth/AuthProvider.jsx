import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { MsalProvider, useMsal } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from './msalConfig';

// NOTE: msal-browser requires the Web Crypto API (window.crypto.subtle).
// In some origins (e.g. raw IP over http) that API is not available and msal will throw.
// We'll lazily create the PublicClientApplication only when crypto is available and
// show a friendly message otherwise.

const AuthContext = createContext({});

function AuthInner({ children }) {
  const { instance, accounts } = useMsal();

  // When using redirect flow, ensure redirect response is processed and active account is set.
  useEffect(() => {
    let cancelled = false;
    if (!instance || !instance.handleRedirectPromise) return;
    instance.handleRedirectPromise()
      .then((resp) => {
        if (cancelled) return;
        if (resp && resp.account && instance.setActiveAccount) {
          try {
            instance.setActiveAccount(resp.account);
          } catch (e) {
            console.warn('Failed to set active account from redirect response', e);
          }
        }
      })
      .catch((e) => {
        console.warn('handleRedirectPromise error', e);
      });
    return () => { cancelled = true; };
  }, [instance]);

  // helper to get token for given scopes
  async function getToken(scopes = loginRequest.scopes) {
    // prefer MSAL active account, fall back to the first known account
    const account = (instance && instance.getActiveAccount && instance.getActiveAccount()) || (accounts && accounts[0]);
    if (!account) return null;
    try {
      const resp = await instance.acquireTokenSilent({ scopes, account });
      return resp.accessToken;
    } catch (e) {
      // fallback to interactive (popup) then redirect if popup blocked
      try {
        const resp = await instance.acquireTokenPopup({ scopes });
        return resp.accessToken;
      } catch (err) {
        // as a last resort, do redirect
        await instance.acquireTokenRedirect({ scopes });
        return null;
      }
    }
  }

  async function login(popup = true) {
    try {
      if (popup) {
        const resp = await instance.loginPopup(loginRequest);
        return resp;
      } else {
        await instance.loginRedirect(loginRequest);
        return null;
      }
    } catch (e) {
      // if popup fails, fallback to redirect
      if (popup) {
        await instance.loginRedirect(loginRequest);
        return null;
      } else throw e;
    }
  }

  async function logout(popup = true) {
    const account = accounts && accounts[0];
    try {
      if (popup && instance.logoutPopup) {
        await instance.logoutPopup({ account });
      } else {
        await instance.logoutRedirect({ account });
      }
    } catch (e) {
      console.warn('Logout failed, attempting redirect logout', e);
      await instance.logoutRedirect({ account });
    }
  }

  const user = accounts && accounts[0] ? { username: accounts[0].username, name: accounts[0].name || accounts[0].username } : null;

  const value = useMemo(() => ({ getToken, login, logout, user, instance }), [accounts]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProviderWrapper({ children }) {
  const [pca, setPca] = useState(null);
  const [cryptoOk, setCryptoOk] = useState(true);

  useEffect(() => {
    // detect Web Crypto availability
    const hasCrypto = typeof window !== 'undefined' && window.crypto && (window.crypto.subtle || window.crypto.webkitSubtle);
    if (!hasCrypto) {
      setCryptoOk(false);
      return;
    }
    try {
      const _pca = new PublicClientApplication(msalConfig);
      setPca(_pca);
    } catch (e) {
      console.warn('Failed to initialize MSAL PublicClientApplication', e);
      setCryptoOk(false);
    }
  }, []);

  if (!cryptoOk) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Web Crypto not available</h2>
        <p>The browser environment does not expose the Web Crypto API required for login.</p>
        <p>Common fixes:</p>
        <ul>
          <li>Open the app on <strong>http://localhost:3001</strong> instead of using the machine IP (localhost is a secure origin).</li>
          <li>Serve the app over <strong>HTTPS</strong> (set <code>HTTPS=true</code> in your `.env.local` or use a tunneling service like <code>ngrok</code>).</li>
          <li>Register and use a secure origin URL in Azure AD if accessing from a different host.</li>
        </ul>
        <p>After making the change, reload the page.</p>
      </div>
    );
  }

  if (!pca) {
    // still initializing
    return null;
  }

  return (
    <MsalProvider instance={pca}>
      <AuthInner>{children}</AuthInner>
    </MsalProvider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthProviderWrapper;
