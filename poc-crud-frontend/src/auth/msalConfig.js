// MSAL configuration for browser-based interactive login
const CLIENT_ID = process.env.REACT_APP_AZURE_CLIENT_ID || '';
const TENANT_ID = process.env.REACT_APP_AZURE_TENANT_ID || '';
// Default redirect: point to SPA callback route so redirect flows return to the app
const REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI || `${window.location.origin}/auth/callback`;

const msalConfig = {
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: REDIRECT_URI
  }
};

// Enable MSAL logging (non-PII) to help debug auth/token issues
const loggerCallback = (logLevel, message, containsPii) => {
  if (containsPii) return; // do not log personally identifiable info
  try {
    // prefix to make MSAL logs easy to find in console
    switch (logLevel) {
      case 0: // Error
        console.error('[msal]', message);
        break;
      case 1: // Warning
        console.warn('[msal]', message);
        break;
      case 2: // Info
        console.info('[msal]', message);
        break;
      default:
        console.log('[msal]', message);
    }
  } catch (e) {
    // ignore logging failures
  }
};

msalConfig.system = {
  loggerOptions: {
    loggerCallback,
    logLevel: 2, // Info
    piiLoggingEnabled: false
  }
};

// Build scopes array from env (support comma or space separated strings)
const rawScopes = process.env.REACT_APP_API_SCOPE || process.env.REACT_APP_GRAPH_SCOPES || 'openid';
const scopes = Array.isArray(rawScopes)
  ? rawScopes
  : String(rawScopes).split(/[\s,]+/).filter(Boolean);

const loginRequest = {
  scopes
};

// Non-sensitive runtime debug to help troubleshooting AAD errors (prints clientId and tenant only)
if (typeof console !== 'undefined') {
  console.log('[msalConfig] CLIENT_ID=', CLIENT_ID ? '<present>' : '<missing>', 'TENANT_ID=', TENANT_ID ? '<present>' : '<missing>', 'REDIRECT_URI=', REDIRECT_URI);
  console.log('[msalConfig] requested scopes=', scopes);
}

export { msalConfig, loginRequest };
