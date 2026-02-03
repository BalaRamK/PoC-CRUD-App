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
