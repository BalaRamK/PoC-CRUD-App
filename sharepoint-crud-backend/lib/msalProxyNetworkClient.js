/**
 * Custom MSAL network client that sends all requests (login.microsoftonline.com) through the proxy.
 * Use this when HTTPS_PROXY/HTTP_PROXY is set so token acquisition works behind a corporate proxy.
 */
const axios = require('axios');
const { getProxyConfig, getProxyHeaders } = require('./proxyAxios');

const MSAL_TIMEOUT_MS = 30000; // 30s for proxy + login.microsoftonline.com

/**
 * Implements INetworkModule for @azure/msal-node so token requests go through the proxy.
 */
const msalProxyNetworkClient = {
  async sendGetRequestAsync(url, options = {}, timeout) {
    const axiosConfig = {
      ...getProxyConfig(),
      method: 'GET',
      url,
      headers: { ...getProxyHeaders(), ...(options.headers || {}) },
      timeout: timeout || MSAL_TIMEOUT_MS,
      validateStatus: () => true, // so we get response even on 4xx/5xx
    };
    const response = await axios(axiosConfig);
    if (response.status >= 400) {
      const bodyPreview = typeof response.data === 'string' ? response.data.substring(0, 300) : JSON.stringify(response.data).substring(0, 300);
      console.error(`[ITEMS_DEBUG] MSAL token (GET) returned ${response.status} url=${(url || '').substring(0, 60)} body=${bodyPreview}`);
    }
    const headers = {};
    if (response.headers && typeof response.headers === 'object') {
      for (const [k, v] of Object.entries(response.headers)) {
        if (typeof v === 'string') headers[k] = v;
        else if (v != null) headers[k] = String(v);
      }
    }
    return {
      status: response.status,
      body: response.data,
      headers,
    };
  },

  async sendPostRequestAsync(url, options = {}) {
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
    const headers = {};
    if (response.headers && typeof response.headers === 'object') {
      for (const [k, v] of Object.entries(response.headers)) {
        if (typeof v === 'string') headers[k] = v;
        else if (v != null) headers[k] = String(v);
      }
    }
    return {
      status: response.status,
      body: response.data,
      headers,
    };
  },
};

module.exports = { msalProxyNetworkClient };
