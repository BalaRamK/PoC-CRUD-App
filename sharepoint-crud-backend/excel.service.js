require('dotenv').config();
const axios = require('axios');
const { ConfidentialClientApplication } = require('@azure/msal-node');

// Set these in your .env for easy config:
const DRIVE_ID = process.env.EXCEL_DRIVE_ID || 'b!7s96l1jotUWjpF3w96WlAW-QuNIBR05BvDdokFLXK64nQbe3HTnkRIH1oAUgFE9i';
const ITEM_ID = process.env.EXCEL_ITEM_ID || '015SVNRJ3NBF47J2EDDZCYABKGIFWINF36';
const TABLE_NAME = process.env.EXCEL_TABLE_NAME || 'PoC_Table';

const config = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET
  }
};
const cca = new ConfidentialClientApplication(config);

async function getAccessToken() {
  const tokenRequest = { scopes: ['https://graph.microsoft.com/.default'] };
  const response = await cca.acquireTokenByClientCredential(tokenRequest);
  return response.accessToken;
}

// List all rows
async function getRows() {
  const token = await getAccessToken();
  const url = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${ITEM_ID}/workbook/tables/${TABLE_NAME}/rows`;
  const resp = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
  return resp.data.value;
}

// Add a new row
async function addRow(valuesArray) {
  const token = await getAccessToken();
  const url = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${ITEM_ID}/workbook/tables/${TABLE_NAME}/rows/add`;
  const payload = { values: [valuesArray] }; // Example: ["Col1", "Col2", ...]
  const resp = await axios.post(url, payload, { headers: { Authorization: `Bearer ${token}` } });
  return resp.data;
}

// Update a cell
async function updateCell(sheetName, address, newValue) {
  const token = await getAccessToken();
  const url = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${ITEM_ID}/workbook/worksheets('${sheetName}')/range(address='${address}')`;
  // Example: address = "B2"
  const payload = { values: [[newValue]] };
  const resp = await axios.patch(url, payload, { headers: { Authorization: `Bearer ${token}` } });
  return resp.data;
}

// Update an entire row at the given zero-based index in the table
async function updateRow(rowIndex, valuesArray) {
  const token = await getAccessToken();
  const url = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${ITEM_ID}/workbook/tables/${TABLE_NAME}/rows/${rowIndex}`;
  const payload = { values: [valuesArray] };
  try {
    console.log(`updateRow: PATCH ${url} payload:`, JSON.stringify(payload));
    const resp = await axios.patch(url, payload, { headers: { Authorization: `Bearer ${token}` } });
    console.log('updateRow: Graph response status', resp.status);
    return resp.data;
  } catch (err) {
    console.error('updateRow: Graph error', err?.response?.status, err?.response?.data || err.message || err);
    throw err;
  }
}

// Delete a row at the given zero-based index in the table
async function deleteRow(rowIndex) {
  const token = await getAccessToken();
  const url = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${ITEM_ID}/workbook/tables/${TABLE_NAME}/rows/${rowIndex}`;
  try {
    console.log(`deleteRow: DELETE ${url}`);
    const resp = await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
    console.log('deleteRow: Graph response status', resp.status);
    return resp.data;
  } catch (err) {
    console.error('deleteRow: Graph error', err?.response?.status, err?.response?.data || err.message || err);
    throw err;
  }
}

module.exports = { getRows, addRow, updateCell, updateRow, deleteRow };
