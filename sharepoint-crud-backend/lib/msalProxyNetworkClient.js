/**
 * Custom MSAL network client that sends all requests (login.microsoftonline.com) through the proxy.
 * When PROXY_USE_CURL_FALLBACK is set, uses curl subprocess (same as Jira) so token works behind Squid.
 */
const axios = require('axios');
const { getProxyConfig, getProxyHeaders } = require('./proxyAxios');
const { isCurlFallbackActive, curlRequest } = require('./curlProxyClient');

const MSAL_TIMEOUT_MS = 30000; // 30s for proxy + login.microsoftonline.com

function toHeaderObj(headers) {
  const out = {};
  if (headers && typeof headers === 'object') {
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === 'string') out[k] = v;
      else if (v != null) out[k] = String(v);
    }
  }
  return out;
}

/**
 * Implements INetworkModule for @azure/msal-node so token requests go through the proxy.
 */
const msalProxyNetworkClient = {
  async sendGetRequestAsync(url, options = {}, timeout) {
    if (isCurlFallbackActive()) {
      const headers = { ...(options.headers || {}) };
      const { statusCode, data } = curlRequest({ method: 'GET', url, headers });
      if (statusCode >= 400) {
        console.error(`[ITEMS_DEBUG] MSAL token (GET) returned ${statusCode} url=${(url || '').substring(0, 60)} body=${(data || '').substring(0, 300)}`);
      }
      return { status: statusCode, body: data, headers: {} };
    }
    const axiosConfig = {
      ...getProxyConfig(),
      method: 'GET',
      url,
      headers: { ...getProxyHeaders(), ...(options.headers || {}) },
      timeout: timeout || MSAL_TIMEOUT_MS,
      validateStatus: () => true,
    };
    const response = await axios(axiosConfig);
    if (response.status >= 400) {
      const bodyPreview = typeof response.data === 'string' ? response.data.substring(0, 300) : JSON.stringify(response.data).substring(0, 300);
      console.error(`[ITEMS_DEBUG] MSAL token (GET) returned ${response.status} url=${(url || '').substring(0, 60)} body=${bodyPreview}`);
    }
    return { status: response.status, body: response.data, headers: toHeaderObj(response.headers) };
  },

  async sendPostRequestAsync(url, options = {}) {
    if (isCurlFallbackActive()) {
      const headers = { 'Content-Type': 'application/x-www-form-urlencoded', ...(options.headers || {}) };
      const body = options.body != null ? String(options.body) : undefined;
      const { statusCode, data } = curlRequest({ method: 'POST', url, headers, body });
      if (statusCode >= 400) {
        console.error(`[ITEMS_DEBUG] MSAL token (POST) returned ${statusCode} url=${(url || '').substring(0, 60)} body=${(data || '').substring(0, 300)}`);
      }
      return { status: statusCode, body: data, headers: {} };
    }
    const axiosConfig = {
      ...getProxyConfig(),
      method: 'POST',
      url,
      headers: { ...getProxyHeaders(), ...(options.headers || {}) },
      data: options.body,
      timeout: MSAL_TIMEOUT_MS,
      validateStatus: () => true,
    };
    const response = await axios(axiosConfig);
    if (response.status >= 400) {
      const bodyPreview = typeof response.data === 'string' ? response.data.substring(0, 300) : JSON.stringify(response.data).substring(0, 300);
      console.error(`[ITEMS_DEBUG] MSAL token (POST) returned ${response.status} url=${(url || '').substring(0, 60)} body=${bodyPreview}`);
    }
    return { status: response.status, body: response.data, headers: toHeaderObj(response.headers) };
  },
};

module.exports = { msalProxyNetworkClient };
