const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const itemsRouter = require('./routes/items.routes');
const jiraRouter = require('./routes/jira.routes');
const reportsRouter = require('./routes/reports.routes');
const { getDebugInfo } = require('./services/sharepoint.service');

app.use(cors()); 
app.use(express.json());

// Use routers for API endpoints
app.use('/api/items', itemsRouter);
app.use('/api/jira', jiraRouter);
app.use('/api/reports', reportsRouter);

// Proxy status (no Graph call) – use this to confirm proxy is loaded
app.get('/api/debug/proxy', (req, res) => {
  try {
    const { isProxyEnabled } = require('./lib/proxyAxios');
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.PROXY_URL;
    res.json({
      proxyEnabled: isProxyEnabled(),
      proxySet: !!proxyUrl,
      proxyUrlPresent: !!proxyUrl ? '(set)' : '(not set)'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Read-only debug endpoint to help diagnose Graph discovery issues
app.get('/api/debug', async (req, res) => {
  try {
    const info = await getDebugInfo();
    if (!info.ok) return res.status(500).json(info);
    res.json(info);
  } catch (err) {
    console.error('DEBUG endpoint error:', err?.response?.data || err || err.message);
    res.status(500).json({ ok: false, error: err?.response?.data || err.message || String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
