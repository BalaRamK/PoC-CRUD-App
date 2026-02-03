# SharePoint CRUD Backend

Backend API for PoC CRUD App: Excel/SharePoint (Graph API) and Jira integration.

## Environment Variables

### Proxy (optional)

When running behind a corporate proxy, set one of:

- `HTTPS_PROXY` – e.g. `http://proxy.example.com:8080`
- `HTTP_PROXY` – same format
- `PROXY_URL` – same format

All outbound HTTPS requests (Jira API and Microsoft Graph / Excel) will use this proxy. Leave unset when no proxy is required.

### Jira

- `JIRA_API_URL` – e.g. `https://your-domain.atlassian.net/rest/api/3`
- `JIRA_USER_EMAIL` – Jira account email
- `JIRA_API_TOKEN` – Jira API token
- `JIRA_PROJECT_KEY` – (optional) default project filter

### SharePoint / Excel (Graph API)

- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`
- `GRAPH_SCOPE` – e.g. `https://graph.microsoft.com/.default`
- `SHAREPOINT_HOST`, `SHAREPOINT_SITE_PATH`
- `EXCEL_FILE_PATH`, `EXCEL_TABLE_NAME`, `EXCEL_ITEM_ID` (optional)

## Run

```bash
npm install
npm start
```

## Deploy with PM2

```bash
cd /path/to/sharepoint-crud-backend
npm install
pm2 start ecosystem.config.cjs
pm2 save
```

### Port 3000 already in use (curl returns 404 but logs show app started)

Another process is holding port 3000, so your new app never bound to it. Fix:

1. See who is on 3000 and your PM2 process ID:
   ```bash
   sudo ss -tlnp | grep 3000
   pm2 show poc-backend
   ```
2. If the **PID on port 3000** is **different** from the **PM2 process PID**, kill the old process:
   ```bash
   sudo kill <pid-from-ss>
   ```
3. Restart so the app binds to 3000:
   ```bash
   pm2 restart poc-backend
   curl -s http://localhost:3000/api/version
   ```

You should see JSON with `version` and `itemsErrorFormat`. If you still get HTML "Cannot GET /api/version", repeat step 1 and ensure the PID on 3000 matches the PM2 PID.
