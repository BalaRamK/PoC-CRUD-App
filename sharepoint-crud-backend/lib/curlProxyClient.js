/**
 * Run HTTP requests via curl when PROXY_USE_CURL_FALLBACK is set.
 * Used for Microsoft Graph and MSAL token (login.microsoftonline.com) so they
 * work through the same proxy that blocks Node's CONNECT.
 */
require('dotenv').config();
const { execFileSync } = require('child_process');
const { getProxyUrlForCurl } = require('./proxyAxios');

const USE_CURL_FALLBACK = (process.env.PROXY_USE_CURL_FALLBACK === 'true' || process.env.PROXY_USE_CURL_FALLBACK === '1') && getProxyUrlForCurl();
const CURL_BIN = process.env.CURL_PATH || 'curl';
const MAX_BUFFER = 10 * 1024 * 1024; // 10MB for Graph responses
const TIMEOUT = 30;

function isCurlFallbackActive() {
  return USE_CURL_FALLBACK && getProxyUrlForCurl();
}

/**
 * @param {{ method: string, url: string, headers?: Record<string,string>, body?: string }} opts
 * @returns {{ statusCode: number, data: string }}
 */
function curlRequest(opts) {
  const { method = 'GET', url, headers = {}, body } = opts;
  const proxyUrl = getProxyUrlForCurl();
  const args = [
    '-s', '-S',
    '-w', '\n%{http_code}',
    '-X', method.toUpperCase(),
    '--connect-timeout', '15',
    '--max-time', String(TIMEOUT),
    url
  ];
  if (proxyUrl) {
    args.splice(2, 0, '-x', proxyUrl);
  }
  for (const [k, v] of Object.entries(headers)) {
    if (v != null && v !== '') args.push('-H', `${k}: ${v}`);
  }
  if (body != null && body !== '' && method !== 'GET') {
    args.push('-d', body);
  }
  let out;
  try {
    out = execFileSync(CURL_BIN, args, { encoding: 'utf8', maxBuffer: MAX_BUFFER });
  } catch (e) {
    out = (e && e.stdout) ? e.stdout : '';
    if (!out && e && e.message) throw new Error(`curl failed: ${e.message}`);
  }
  if (typeof out !== 'string') out = String(out || '');
  const lastNewline = out.lastIndexOf('\n');
  const bodyOut = lastNewline >= 0 ? out.slice(0, lastNewline) : out;
  const statusStr = lastNewline >= 0 ? out.slice(lastNewline + 1).trim() : '200';
  const statusCode = parseInt(statusStr, 10) || 200;
  return { statusCode, data: bodyOut };
}

module.exports = { isCurlFallbackActive, curlRequest, USE_CURL_FALLBACK };
