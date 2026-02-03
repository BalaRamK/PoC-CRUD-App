/**
 * Shared axios proxy configuration for outbound Jira and Excel/Graph API calls.
 * - No proxy env (HTTPS_PROXY/HTTP_PROXY/PROXY_URL) → direct connection.
 * - Proxy env set → use proxy, unless BACKEND_USE_PROXY=false (force direct).
 * - Optional: PROXY_USERNAME, PROXY_PASSWORD for proxy auth.
 * - When using proxy: longer timeout (30s) and User-Agent to reduce 503 from strict proxies.
 */
require('dotenv').config();
const { HttpsProxyAgent } = require('https-proxy-agent');

const proxyEnv = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.PROXY_URL;
const useProxyEnv = process.env.BACKEND_USE_PROXY;
const useProxy = proxyEnv && useProxyEnv !== 'false' && useProxyEnv !== '0';

// Build proxy URL with optional auth (some proxies require it)
function buildProxyUrl() {
  if (!proxyEnv) return null;
  const user = process.env.PROXY_USERNAME;
  const pass = process.env.PROXY_PASSWORD;
  if (!user && !pass) return proxyEnv;
  try {
    const u = new URL(proxyEnv);
    u.username = user || '';
    u.password = pass || '';
    return u.toString();
  } catch (e) {
    return proxyEnv;
  }
}

const PROXY_TIMEOUT_MS = 30000; // 30s for proxy + upstream (Microsoft can be slow)
// Some Squid proxies 503 Node.js CONNECT but allow curl; use curl-like UA when requested
const PROXY_MIMIC_CURL = process.env.PROXY_MIMIC_CURL === 'true' || process.env.PROXY_MIMIC_CURL === '1';
const USER_AGENT = process.env.PROXY_USER_AGENT
  || (PROXY_MIMIC_CURL ? 'curl/7.68.0' : 'PoC-CRUD-Backend/1.0 (Node; Microsoft Graph)');

let httpsAgent = null;

if (useProxy && proxyEnv) {
  try {
    const proxyUrl = buildProxyUrl();
    // CONNECT request: curl-like = no keep-alive, Proxy-Connection: close (avoids Squid 503 on reuse)
    httpsAgent = new HttpsProxyAgent(proxyUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Proxy-Connection': 'close'
      },
      keepAlive: false
    });
    const safeUrl = (proxyUrl || proxyEnv).replace(/:[^:@]+@/, ':****@');
    console.log('[proxyAxios] Outbound: proxy', safeUrl, 'timeout=', PROXY_TIMEOUT_MS + 'ms', 'UA=', USER_AGENT.substring(0, 30) + (USER_AGENT.length > 30 ? '...' : ''));
  } catch (err) {
    console.warn('[proxyAxios] Failed to create proxy agent:', err.message);
  }
} else {
  if (proxyEnv && (useProxyEnv === 'false' || useProxyEnv === '0')) {
    console.log('[proxyAxios] Outbound: direct (BACKEND_USE_PROXY=false)');
  } else {
    console.log('[proxyAxios] Outbound: direct (no proxy configured)');
  }
}

/**
 * Returns axios config (httpsAgent, timeout) to use the proxy when configured.
 * Use as: axios.get(url, { ...getProxyConfig(), headers: { ...getProxyHeaders(), Authorization: '...' } })
 */
function getProxyConfig() {
  if (!httpsAgent) return {};
  return { httpsAgent, timeout: PROXY_TIMEOUT_MS };
}

/** Headers to send when using proxy (e.g. User-Agent); merge into your headers. */
function getProxyHeaders() {
  if (!httpsAgent) return {};
  return { 'User-Agent': USER_AGENT };
}

/**
 * Whether proxy is currently configured.
 */
function isProxyEnabled() {
  return !!httpsAgent;
}

/**
 * Proxy URL string for use with curl -x (includes auth if PROXY_USERNAME/PROXY_PASSWORD set).
 * Returns null if no proxy. Used when PROXY_USE_CURL_FALLBACK=true.
 */
function getProxyUrlForCurl() {
  if (!proxyEnv || useProxyEnv === 'false' || useProxyEnv === '0') return null;
  return buildProxyUrl();
}

module.exports = { getProxyConfig, getProxyHeaders, isProxyEnabled, getProxyUrlForCurl };
