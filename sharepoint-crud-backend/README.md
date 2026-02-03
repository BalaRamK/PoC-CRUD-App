# SharePoint CRUD Backend

Backend API for PoC CRUD App: Excel/SharePoint (Graph API) and Jira integration.

## Environment Variables

### Proxy (optional)

When running behind a corporate proxy, set one of:

- `HTTPS_PROXY` – e.g. `http://proxy.example.com:8080`
- `HTTP_PROXY` – same format
- `PROXY_URL` – same format

Optional proxy auth (if the proxy requires it):

- `PROXY_USERNAME` – proxy username
- `PROXY_PASSWORD` – proxy password

Optional (if Node gets 503 through proxy but curl works):

- `PROXY_MIMIC_CURL=true` – use a curl-like User-Agent on CONNECT
- `PROXY_USER_AGENT=curl/7.68.0` – custom User-Agent for CONNECT (overrides default)
- **`PROXY_USE_CURL_FALLBACK=true`** – run Jira API requests via a **curl subprocess** instead of Node’s proxy agent. Use this when `curl -x PROXY https://...` works from the server but the app still gets 503. Requires `curl` installed on the server.

All outbound HTTPS requests (Jira API and Microsoft Graph / Excel) will use this proxy (30s timeout, User-Agent sent). Set `BACKEND_USE_PROXY=false` to force direct connection. Leave proxy unset when no proxy is required.

### Jira

- `JIRA_API_URL` – e.g. `https://your-domain.atlassian.net/rest/api/3`
- `JIRA_USER_EMAIL` – Jira account email
- `JIRA_API_TOKEN` – Jira API token
- `JIRA_PROJECT_KEY` – (optional) default project filter

If `GET /api/debug/jira` returns 403 with a **Squid** HTML error ("The requested URL could not be retrieved"), the proxy is blocking outbound access to your Jira host. Ask your network team to allow the Jira domain (e.g. `*.atlassian.net`) through the proxy, or set `BACKEND_USE_PROXY=false` if the server can reach Jira without the proxy.

The backend sends **User-Agent** and **Proxy-Connection: close** on the CONNECT request (no keep-alive to the proxy) so Squid behaves like with curl. If **curl works** through the proxy but the **Node app gets 503** (Squid HTML error), try: `PROXY_MIMIC_CURL=true` (and restart PM2) so the CONNECT request uses a curl-like User-Agent. Optional: `PROXY_USER_AGENT=curl/7.68.0` to set the exact UA. To verify proxy from the **backend server**: `curl -v -x http://PROXY:3128 https://qnulabs.atlassian.net/rest/api/3/serverInfo`.

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
git pull
npm install
pm2 restart poc-backend   # or: pm2 start ecosystem.config.cjs
pm2 save
```

### Verify deployed code (Jira returns JSON, not HTML 500)

If the app still gets HTML 500 for `/api/jira/projects`, the server may be running old code or a cached response. On the server:

```bash
cd /opt/PoC-CRUD-App/sharepoint-crud-backend
grep -n sendJiraError routes/jira.routes.js   # should show line 5, 14, etc.
pm2 restart poc-backend
curl -s http://localhost:3000/api/jira/projects | head -c 200
```

You should see JSON. If you see `<!DOCTYPE html>`, another process is on port 3000 (old code). Run `sudo ss -tlnp | grep 3000` and `pm2 show poc-backend`; if the PIDs differ, run `sudo kill <pid-from-ss>` then `pm2 restart poc-backend` and curl again. If curl returns JSON but the browser gets HTML, the reverse proxy may be caching 500; restart nginx or disable cache for `/api/`.

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

### Excel returns 502 or 503 (Bad Gateway / Service Unavailable)

The app returns "Excel data temporarily unavailable" with `detail: Request failed with status code 502` or `503` when the proxy or Microsoft (login.microsoftonline.com / graph.microsoft.com) returns that status.

- **502 Bad Gateway** – proxy could not get a valid response from the upstream server (Microsoft). Often proxy/firewall or upstream timeout.
- **503 Service Unavailable** – proxy or Microsoft temporarily unavailable.

1. **Confirm proxy is used**  
   Startup log should show `[proxyAxios] Outbound: proxy http://...`. If not, set `HTTPS_PROXY` (or `HTTP_PROXY`) in `.env`.

2. **Test proxy to Azure AD**  
   ```bash
   curl -s -o /dev/null -w "%{http_code}" -x http://YOUR_PROXY:PORT https://login.microsoftonline.com
   ```  
   Expect 302 (or 200). If you get 502 or 503, the proxy or firewall is blocking or failing for that host.

3. **Check backend logs**  
   ```bash
   grep ITEMS_DEBUG /home/admin_/.pm2/logs/poc-backend-error-0.log
   ```  
   Look for `MSAL token ... returned 502/503` (token request) or `step=Graph` and status 502/503 (Graph API).

4. **Fix**  
   Ensure the proxy and corporate firewall allow outbound HTTPS to `login.microsoftonline.com` and `graph.microsoft.com`. For 502, check proxy timeouts and that upstream (Microsoft) is reachable from the proxy. Work with your network team to allow or fix the proxy.

5. **503 from proxy (CONNECT / SSL inspection)**  
   Many corporate proxies return 503 when they cannot establish an HTTPS tunnel correctly:
   - **Protocol detection** – The proxy must handle HTTPS **CONNECT** correctly (establish the tunnel to Microsoft, not forward the CONNECT request to Microsoft). Ask your network team to enable "detect protocol" or proper CONNECT handling for `login.microsoftonline.com` and `graph.microsoft.com`.
   - **SSL inspection** – If the proxy does MITM SSL inspection, exclude `login.microsoftonline.com` and `graph.microsoft.com` from inspection (allowlist). Microsoft endpoints often fail when inspected.
   - **Proxy auth** – If the proxy requires authentication, set in `.env`: `PROXY_USERNAME` and `PROXY_PASSWORD`. The app will send them with the CONNECT request.
   - **Timeouts** – The app uses a 30s timeout for proxy + upstream. If the proxy is slow, increase is not configurable yet; ensure the proxy responds within 30s.
   - **Node gets 503, curl works** – If `curl -x http://PROXY:3128 https://...` succeeds from the same server but the app gets 503 (Squid HTML), set **`PROXY_USE_CURL_FALLBACK=true`** in `.env`. The app will then run Jira requests via a `curl` subprocess (same path as your working curl), so `/api/debug/jira` and `/api/jira/projects` etc. work. Requires `curl` on the server. Alternatively try `PROXY_MIMIC_CURL=true` first (curl-like User-Agent over Node’s agent).

6. **Squid logs: 503 HIER_NONE vs 502 HIER_DIRECT**  
   If URLs are allowed but you still see 502/503 in Squid:
   - **503 with HIER_NONE** (e.g. to atlassian.net): Squid could not connect to the upstream at all (no TCP tunnel). Check: DNS on the proxy for that host, firewall from proxy to internet, and whether SSL inspection is blocking the CONNECT. Exclude the host from SSL inspection or fix DNS/firewall.
   - **502 with HIER_DIRECT** (e.g. to graph.microsoft.com): Squid did connect to the upstream (IP shown) but got an invalid or error response (often due to SSL inspection / MITM). **Exclude `login.microsoftonline.com` and `graph.microsoft.com` from SSL inspection** so the proxy does not decrypt and re-encrypt; use a direct tunnel (CONNECT) only.
