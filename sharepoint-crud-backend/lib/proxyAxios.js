/**
 * Shared axios proxy configuration for outbound Jira and Excel/Graph API calls.
 * - No proxy env (HTTPS_PROXY/HTTP_PROXY/PROXY_URL) → direct connection.
 * - Proxy env set → use proxy, unless BACKEND_USE_PROXY=false (force direct).
 */
require('dotenv').config();
const { HttpsProxyAgent } = require('https-proxy-agent');

const proxyEnv = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.PROXY_URL;
const useProxyEnv = process.env.BACKEND_USE_PROXY;
const useProxy = proxyEnv && useProxyEnv !== 'false' && useProxyEnv !== '0';

let httpsAgent = null;

if (useProxy && proxyEnv) {
  try {
    httpsAgent = new HttpsProxyAgent(proxyEnv);
    const safeUrl = proxyEnv.replace(/:[^:@]+@/, ':****@');
    console.log('[proxyAxios] Outbound: proxy', safeUrl);
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
 * Returns axios config (httpsAgent) to use the proxy when configured.
 * Use as: axios.get(url, { ...getProxyConfig(), headers, params, ... })
 */
function getProxyConfig() {
  if (!httpsAgent) return {};
  return { httpsAgent };
}

/**
 * Whether proxy is currently configured.
 */
function isProxyEnabled() {
  return !!httpsAgent;
}

module.exports = { getProxyConfig, isProxyEnabled };
