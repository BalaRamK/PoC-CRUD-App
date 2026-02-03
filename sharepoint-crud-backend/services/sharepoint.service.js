require('dotenv').config();
const axios = require('axios');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const { getProxyConfig, getProxyHeaders, isProxyEnabled } = require('../lib/proxyAxios');
const { msalProxyNetworkClient } = require('../lib/msalProxyNetworkClient');

const config = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET
  },
  // When proxy is set, MSAL must use a custom network client so token requests to login.microsoftonline.com go through the proxy
  ...(isProxyEnabled() && { system: { networkClient: msalProxyNetworkClient } })
};

const cca = new ConfidentialClientApplication(config);

async function getAccessToken() {
  // Log non-secret diagnostic info to help identify misconfiguration that causes
  // AADSTS900144 (missing client_id) or other auth request errors.
  try {
    console.log('[sharepoint.service] requesting access token with AZURE_CLIENT_ID=', process.env.AZURE_CLIENT_ID ? '<present>' : '<missing>', 'AZURE_TENANT_ID=', process.env.AZURE_TENANT_ID ? '<present>' : '<missing>');
  } catch (e) {
    // swallow logging errors
  }

  const tokenRequest = { scopes: [process.env.GRAPH_SCOPE] };
  try {
    const response = await cca.acquireTokenByClientCredential(tokenRequest);
    return response.accessToken;
  } catch (tokenErr) {
    const line = `[ITEMS_DEBUG] getAccessToken failed message=${tokenErr?.message || ''} code=${tokenErr?.code || ''} name=${tokenErr?.name || ''}`;
    console.error(line);
    throw tokenErr;
  }
}

async function getSiteId(accessToken) {
  const url = `https://graph.microsoft.com/v1.0/sites/${process.env.SHAREPOINT_HOST}:${process.env.SHAREPOINT_SITE_PATH}`;
  const resp = await axios.get(url, { ...getProxyConfig(), headers: { ...getProxyHeaders(), Authorization: `Bearer ${accessToken}` } });
  return resp.data.id;
}

async function getFileItemId(siteId, accessToken) {
  // If an explicit item id is provided in env, prefer and validate it
  if (process.env.EXCEL_ITEM_ID) {
    try {
      const idUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${process.env.EXCEL_ITEM_ID}`;
      const idResp = await axios.get(idUrl, { ...getProxyConfig(), headers: { ...getProxyHeaders(), Authorization: `Bearer ${accessToken}` } });
      return idResp.data.id;
    } catch (err) {
      console.warn('EXCEL_ITEM_ID provided but validation failed:', err?.response?.data || err.message || err);
      // fall through to path-based lookup
    }
  }

  // Ensure the EXCEL_FILE_PATH starts with a slash for Graph path syntax
  let filePath = process.env.EXCEL_FILE_PATH || '';
  if (filePath && !filePath.startsWith('/')) filePath = '/' + filePath;
  // Use trailing colon form to request metadata for the path
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:${filePath}:`;
  const resp = await axios.get(url, { ...getProxyConfig(), headers: { ...getProxyHeaders(), Authorization: `Bearer ${accessToken}` } });
  return resp.data.id;
}

// Diagnostic: return site/item/table discovery info (read-only)
async function getDebugInfo() {
  try {
    const tokenRequest = { scopes: [process.env.GRAPH_SCOPE] };
    const tokenResp = await cca.acquireTokenByClientCredential(tokenRequest);
    const accessToken = tokenResp?.accessToken;

    const siteUrl = `https://graph.microsoft.com/v1.0/sites/${process.env.SHAREPOINT_HOST}:${process.env.SHAREPOINT_SITE_PATH}`;
    const siteResp = await axios.get(siteUrl, { ...getProxyConfig(), headers: { ...getProxyHeaders(), Authorization: `Bearer ${accessToken}` } });
    const siteId = siteResp.data.id;

    // get file metadata
    const fileUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:${process.env.EXCEL_FILE_PATH}`;
    const fileResp = await axios.get(fileUrl, { ...getProxyConfig(), headers: { ...getProxyHeaders(), Authorization: `Bearer ${accessToken}` } });
    const itemId = fileResp.data.id;

    // get table range (if table exists)
    let tableRange = null;
    try {
      const tableRangeUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}/workbook/tables/${process.env.EXCEL_TABLE_NAME}/range`;
      const rangeResp = await axios.get(tableRangeUrl, { ...getProxyConfig(), headers: { ...getProxyHeaders(), Authorization: `Bearer ${accessToken}` } });
      tableRange = rangeResp.data;
    } catch (e) {
      tableRange = { error: e?.response?.data || e.message };
    }

    return {
      ok: true,
      token: { hasAccessToken: !!accessToken, expiresOn: tokenResp.expiresOn || null },
      site: { url: siteUrl, id: siteId },
      file: { path: process.env.EXCEL_FILE_PATH, id: itemId, name: fileResp.data.name },
      tableRange
    };
  } catch (err) {
    return { ok: false, error: err?.response?.data || err.message || String(err) };
  }
}

// READ (list all rows)
async function getRows() {
  const accessToken = await getAccessToken();
  const siteId = await getSiteId(accessToken);
  const itemId = await getFileItemId(siteId, accessToken);
  const tableName = process.env.EXCEL_TABLE_NAME;

  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}/workbook/tables/${tableName}/rows`;
  const resp = await axios.get(url, { ...getProxyConfig(), headers: { ...getProxyHeaders(), Authorization: `Bearer ${accessToken}` } });
  return resp.data.value; // Array of rows
}

// CREATE (add new row)
async function addRow(valuesArray) {
  const accessToken = await getAccessToken();
  const siteId = await getSiteId(accessToken);
  const itemId = await getFileItemId(siteId, accessToken);
  const tableName = process.env.EXCEL_TABLE_NAME;

  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}/workbook/tables/${tableName}/rows/add`;
  const payload = { values: [valuesArray] }; // Example: ["Value1", "Value2", ...]
  const resp = await axios.post(url, payload, { ...getProxyConfig(), headers: { ...getProxyHeaders(), Authorization: `Bearer ${accessToken}` } });
  return resp.data;
}

// UPDATE (update specific cell, advanced)
async function updateCell(address, value) {
  const accessToken = await getAccessToken();
  const siteId = await getSiteId(accessToken);
  const itemId = await getFileItemId(siteId, accessToken);

  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}/workbook/worksheets('Sheet1')/range(address='${address}')`;
  const payload = { values: [[value]] }; // Address example: "A2"
  const resp = await axios.patch(url, payload, { ...getProxyConfig(), headers: { ...getProxyHeaders(), Authorization: `Bearer ${accessToken}` } });
  return resp.data;
}

// DELETE (blank cell or remove row logic, non-trivial – requires API logic)

// Update entire row by computing worksheet range and patching that range
async function updateRow(rowIndex, valuesArray) {
  const accessToken = await getAccessToken();
  const siteId = await getSiteId(accessToken);
  const itemId = await getFileItemId(siteId, accessToken);
  const tableName = process.env.EXCEL_TABLE_NAME;

  try {
    const tableRangeUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}/workbook/tables/${tableName}/range`;
    const rangeResp = await axios.get(tableRangeUrl, { ...getProxyConfig(), headers: { ...getProxyHeaders(), Authorization: `Bearer ${accessToken}` } });
    const address = rangeResp?.data?.address; // e.g. "Sheet1!A1:M10"
    if (!address) throw new Error('Could not determine table range address');

    const [sheetPart, cellsPart] = address.split('!');
    const sheetName = sheetPart.replace(/'/g, '');
    const parts = cellsPart.split(':');
    const startCell = parts[0];
    const endCell = parts[1] || parts[0];

    const cellToColRow = (cell) => {
      const m = cell.match(/^([A-Z]+)(\d+)$/i);
      if (!m) throw new Error('Invalid cell: ' + cell);
      return { colLetters: m[1].toUpperCase(), row: parseInt(m[2], 10) };
    };

    const start = cellToColRow(startCell);
    const end = cellToColRow(endCell);

    // header row is at start.row, data rows follow; compute target row number
    const targetRow = start.row + 1 + Number(rowIndex);
    const targetRange = `${sheetName}!${start.colLetters}${targetRow}:${end.colLetters}${targetRow}`;

    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}/workbook/worksheets('${encodeURIComponent(sheetName)}')/range(address='${targetRange}')`;
    const payload = { values: [valuesArray] };
    const resp = await axios.patch(url, payload, { ...getProxyConfig(), headers: { ...getProxyHeaders(), Authorization: `Bearer ${accessToken}` } });
    return resp.data;
  } catch (err) {
    console.error('sharepoint.updateRow error', err?.response?.status, err?.response?.data || err.message || err);
    throw err;
  }
}

// Delete (clear) a row's values by patching the worksheet range to blanks
async function deleteRow(rowIndex) {
  const accessToken = await getAccessToken();
  const siteId = await getSiteId(accessToken);
  const itemId = await getFileItemId(siteId, accessToken);
  const tableName = process.env.EXCEL_TABLE_NAME;

  try {
    const tableRangeUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}/workbook/tables/${tableName}/range`;
    const rangeResp = await axios.get(tableRangeUrl, { ...getProxyConfig(), headers: { ...getProxyHeaders(), Authorization: `Bearer ${accessToken}` } });
    const address = rangeResp?.data?.address;
    if (!address) throw new Error('Could not determine table range address');

    const [sheetPart, cellsPart] = address.split('!');
    const sheetName = sheetPart.replace(/'/g, '');
    const parts = cellsPart.split(':');
    const startCell = parts[0];
    const endCell = parts[1] || parts[0];

    const cellToColRow = (cell) => {
      const m = cell.match(/^([A-Z]+)(\d+)$/i);
      if (!m) throw new Error('Invalid cell: ' + cell);
      return { colLetters: m[1].toUpperCase(), row: parseInt(m[2], 10) };
    };

    const start = cellToColRow(startCell);
    const end = cellToColRow(endCell);
    const targetRow = start.row + 1 + Number(rowIndex);
    const targetRange = `${sheetName}!${start.colLetters}${targetRow}:${end.colLetters}${targetRow}`;

    // compute number of columns
    const numCols = columnLetterToNumber(end.colLetters) - columnLetterToNumber(start.colLetters) + 1;
    const emptyValues = [Array(numCols).fill('')];

    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemId}/workbook/worksheets('${encodeURIComponent(sheetName)}')/range(address='${targetRange}')`;
    const resp = await axios.patch(url, { values: emptyValues }, { ...getProxyConfig(), headers: { ...getProxyHeaders(), Authorization: `Bearer ${accessToken}` } });
    return resp.data;
  } catch (err) {
    console.error('sharepoint.deleteRow error', err?.response?.status, err?.response?.data || err.message || err);
    throw err;
  }
}

function columnLetterToNumber(letter) {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col = col * 26 + (letter.charCodeAt(i) - 64);
  }
  return col;
}

module.exports = { getRows, addRow, updateCell, updateRow, deleteRow, getDebugInfo };
