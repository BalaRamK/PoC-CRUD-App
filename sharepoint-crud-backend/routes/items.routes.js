const express = require('express');
const router = express.Router();
const { getRows, addRow, updateRow, deleteRow } = require('../services/sharepoint.service');

// GET all items (Excel rows)
// On failure (e.g. Graph unreachable), return 200 with success:false so the app can still load and show a message
router.get('/', async (req, res, next) => {
  try {
    const rows = await getRows();
    res.json(Array.isArray(rows) ? rows : []);
  } catch (error) {
    const detail = error?.message || String(error);
    const url = error?.config?.url || '';
    const step = url.includes('login.microsoftonline.com') ? 'MSAL/token' : url.includes('graph.microsoft.com') ? 'Graph' : 'unknown';
    // stderr so it shows in pm2 --err and is easy to find; tag for grep ITEMS_DEBUG
    console.error('[ITEMS_DEBUG] GET /api/items FAILED', 'message=', detail, 'code=', error?.code || '', 'step=', step, 'url=', url ? url.substring(0, 80) : '');
    // Return 200 with success:false so frontend can show "Excel unavailable" without breaking the page
    res.status(200).json({
      success: false,
      data: [],
      error: 'Excel data temporarily unavailable',
      detail,
      code: 'EXCEL_UNAVAILABLE'
    });
  }
});

// CREATE new item (add row)
router.post('/', async (req, res, next) => {
  try {
    // req.body.values should be an array: one row for table, e.g., ["a", "b", "c"]
    const row = await addRow(req.body.values);
    res.json(row);
  } catch (error) {
    console.error('POST /api/items error:', error?.response?.data || error);
    res.status(500).json({ error: 'Could not add row', detail: error.message });
  }
});

// UPDATE item (update row by index)
router.patch('/:rowIndex', async (req, res, next) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex, 10);
    const updatedValues = req.body.values;
    console.log(`PATCH /api/items/${rowIndex} values:`, updatedValues);
    
    const resp = await updateRow(rowIndex, updatedValues);
    console.log('PATCH backend updateRow resp:', resp);
    
    res.json({ success: true, message: 'Row updated', resp });
  } catch (error) {
    console.error('PATCH /api/items error:', error?.response?.status, error?.response?.data || error.message || error);
    res.status(500).json({ error: 'Could not update row', detail: error?.response?.data || error.message || String(error) });
  }
});

// DELETE item (delete row by index)
router.delete('/:rowIndex', async (req, res, next) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex, 10);
    console.log(`DELETE /api/items/${rowIndex}`);
    
    const resp = await deleteRow(rowIndex);
    console.log('DELETE backend deleteRow resp:', resp);
    
    res.json({ success: true, message: 'Row deleted', resp });
  } catch (error) {
    console.error('DELETE /api/items error:', error?.response?.status, error?.response?.data || error.message || error);
    res.status(500).json({ error: 'Could not delete row', detail: error?.response?.data || error.message || String(error) });
  }
});

module.exports = router;