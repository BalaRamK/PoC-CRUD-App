const express = require('express');
const router = express.Router();
const { getRows, addRow, updateRow, deleteRow } = require('../services/sharepoint.service');

// GET all items (Excel rows)
router.get('/', async (req, res, next) => {
  try {
    const rows = await getRows();
    res.json(rows);
  } catch (error) {
    console.error('GET /api/items error:', error?.response?.data || error);
    res.status(500).json({ error: 'Could not fetch excel rows', detail: error.message });
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