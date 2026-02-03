/**
 * Shared axios proxy configuration for outbound Jira and Excel/Graph API calls.
 * When HTTPS_PROXY, HTTP_PROXY, or PROXY_URL is set, all axios requests use that proxy.
 */
require('dotenv').config();
const { HttpsProxyAgent } = require('https-proxy-agent');

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.PROXY_URL;

let httpsAgent = null;

if (proxyUrl) {
  try {
    httpsAgent = new HttpsProxyAgent(proxyUrl);
  } catch (err) {
    console.warn('[proxyAxios] Failed to create proxy agent:', err.message);
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
