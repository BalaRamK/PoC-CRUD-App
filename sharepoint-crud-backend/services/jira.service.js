require('dotenv').config();
const axios = require('axios');
const { execSync } = require('child_process');
const { getProxyConfig, getProxyHeaders, getProxyUrlForCurl } = require('../lib/proxyAxios');

const JIRA_API_URL = process.env.JIRA_API_URL;
const JIRA_USER_EMAIL = process.env.JIRA_USER_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY;

// When true, use curl subprocess for Jira requests (bypasses Node proxy agent; use when Squid 503 with Node but curl works)
const USE_CURL_FALLBACK = (process.env.PROXY_USE_CURL_FALLBACK === 'true' || process.env.PROXY_USE_CURL_FALLBACK === '1') && getProxyUrlForCurl();

// Basic Auth header for Jira API token
const authHeader = `Basic ${Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;

/**
 * Run GET request via curl (use when proxy works with curl but not with Node's agent).
 * @param {string} fullUrl - Full URL including query string
 * @returns {{ data: any, statusCode: number }}
 */
function jiraCurlGet(fullUrl) {
  const proxyUrl = getProxyUrlForCurl();
  const args = [
    '-s', '-S',
    '-w', '\n%{http_code}',
    '-H', `Authorization: ${authHeader}`,
    '-H', 'Accept: application/json',
    '--connect-timeout', '10',
    '--max-time', '20',
    fullUrl
  ];
  if (proxyUrl) {
    args.splice(2, 0, '-x', proxyUrl);
  }
  const out = execSync('curl', args, { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });
  const lastNewline = out.lastIndexOf('\n');
  const body = lastNewline >= 0 ? out.slice(0, lastNewline) : out;
  const statusStr = lastNewline >= 0 ? out.slice(lastNewline + 1).trim() : '200';
  const statusCode = parseInt(statusStr, 10) || 200;
  let data;
  try {
    data = body ? JSON.parse(body) : {};
  } catch {
    data = body;
  }
  return { data, statusCode };
}

/**
 * Fetches issues from Jira, optionally filtered by project.
 * @param {string} jql Optional JQL query string.
 * @returns {Array} An array of Jira issues.
 */
async function getJiraIssues({ jql, projectKey } = {}) {
    try {
        let finalJql = jql;

        if (!finalJql) {
            let filterParts = [];
            if (projectKey) {
                filterParts.push(`project = ${projectKey}`);
            } else if (process.env.JIRA_PROJECT_KEY) {
                filterParts.push(`project = ${process.env.JIRA_PROJECT_KEY}`);
            }

            if (filterParts.length === 0) {
                throw new Error('No project specified for Jira query');
            }

            // Join filter parts with AND, and append ORDER BY separately
            finalJql = filterParts.join(' AND ');
            finalJql = `${finalJql} ORDER BY rank ASC, created DESC`; // Order by rank for proper hierarchy
        }
        // If finalJql was explicitly provided, it's used as-is.
        // If it's still empty at this point, we'll use a very broad default.
        if (!finalJql) {
          finalJql = `ORDER BY updated DESC`; // Fallback if no filters are applied
        }

        const params = {
            jql: finalJql,
            maxResults: 200,
            fields: 'summary,status,assignee,created,updated,duedate,priority,issuetype,project,parent,subtasks,customfield_10014',
        };
        const url = `${JIRA_API_URL}/search/jql`; // <--- ENSURE THIS IS THE CORRECT URL

        console.log('[JiraService] Fetching issues from URL:', url);
        console.log('[JiraService] Request params for issues:', params);

        let response;
        if (USE_CURL_FALLBACK) {
            const qs = new URLSearchParams(params).toString();
            const fullUrl = `${url}?${qs}`;
            const res = jiraCurlGet(fullUrl);
            response = { status: res.statusCode, data: res.data };
        } else {
            response = await axios.get(url, {
                ...getProxyConfig(),
                headers: {
                    ...getProxyHeaders(),
                    'Authorization': authHeader,
                    'Accept': 'application/json'
                },
                params: params,
            });
        }

        console.log('[JiraService] Issues API Response Status:', response.status);
        if (response.status >= 400) {
            throw Object.assign(new Error(response.data?.message || 'Jira issues request failed'), { response: { status: response.status, data: response.data } });
        }
        console.log('[JiraService] Total issues returned:', response.data.issues?.length || 0);
        console.log('[JiraService] First issue full details:', JSON.stringify(response.data.issues?.[0], null, 2));

        const mappedIssues = response.data.issues.map(issue => {
            // Log the issuetype object to see its structure
            if (issue.key === 'SD-1' || issue.key === 'SD-12') {
                console.log(`[JiraService] Issue ${issue.key} issuetype object:`, JSON.stringify(issue.fields.issuetype, null, 2));
            }
            const issueType = issue.fields.issuetype?.name || 'Unknown';
            const mapped = {
                id: issue.id,
                key: issue.key,
                title: issue.fields.summary,
                status: issue.fields.status?.name || 'Unknown',
                assignee: issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned',
                createdDate: issue.fields.created,
                updatedDate: issue.fields.updated,
                dueDate: issue.fields.duedate,
                priority: issue.fields.priority ? issue.fields.priority.name : 'N/A',
                type: issueType,
                project: issue.fields.project?.name || 'Unknown',
                parentKey: issue.fields.parent ? issue.fields.parent.key : null,
                epicLink: issue.fields.customfield_10014 || null,
                subtasks: issue.fields.subtasks || [],
            };
            return mapped;
        });

        console.log('[JiraService] Returning', mappedIssues.length, 'mapped issues');
        console.log('[JiraService] Sample types:', mappedIssues.slice(0, 5).map(i => `${i.key}: ${i.type}`).join(', '));
        return mappedIssues;

    } catch (error) {
        console.error('Error fetching Jira issues:', error?.response?.data || error.message);
        throw new Error(`Failed to fetch Jira issues: ${error?.response?.status || 'Unknown'} - ${error?.response?.statusText || error.message}`);
    }
}

/**
 * Fetches all accessible Jira projects.
 * @returns {Array} An array of Jira project objects.
 */
async function getJiraProjects() {
    try {
        const params = {
            maxResults: 50,
            query: '', // Provides a minimal search restriction to satisfy Jira API
        };
        const url = `${JIRA_API_URL}/project/search`;

        console.log('[JiraService] Fetching projects from URL:', url);
        console.log('[JiraService] Request params:', params);

        let response;
        if (USE_CURL_FALLBACK) {
            const qs = new URLSearchParams(params).toString();
            const fullUrl = `${url}?${qs}`;
            const res = jiraCurlGet(fullUrl);
            response = { status: res.statusCode, data: res.data };
        } else {
            response = await axios.get(url, {
                ...getProxyConfig(),
                headers: {
                    ...getProxyHeaders(),
                    'Authorization': authHeader,
                    'Accept': 'application/json'
                },
                params: params,
            });
        }

        console.log('[JiraService] Projects API Response Status:', response.status);
        if (response.status >= 400) {
            throw Object.assign(new Error(response.data?.message || 'Jira projects request failed'), { response: { status: response.status, data: response.data } });
        }
        console.log('[JiraService] Projects API Response Data (partial):', response.data.values ? response.data.values.slice(0, 2) : response.data); // Log first 2 projects or full data

        return response.data.values.map(project => ({
            id: project.id,
            key: project.key,
            name: project.name,
            projectType: project.projectTypeKey,
            simplified: project.simplified,
        }));

    } catch (error) {
        const status = error?.response?.status;
        const statusText = error?.response?.statusText;
        console.error('[JiraService] getJiraProjects failed:', status, statusText, error?.response?.data || error.message);
        throw error;
    }
}

/**
 * Test Jira connection (auth + reachability). Call GET /rest/api/3/myself.
 * @returns {{ ok: boolean, status?: number, message?: string, user?: object, detail?: any }}
 */
async function getJiraConnectionTest() {
    const base = (JIRA_API_URL || '').replace(/\/$/, '');
    if (!base || !JIRA_USER_EMAIL || !JIRA_API_TOKEN) {
        return {
            ok: false,
            message: 'Missing JIRA_API_URL, JIRA_USER_EMAIL, or JIRA_API_TOKEN in .env',
            hasUrl: !!base,
            hasEmail: !!JIRA_USER_EMAIL,
            hasToken: !!JIRA_API_TOKEN
        };
    }
    const url = `${base}/myself`;
    try {
        if (USE_CURL_FALLBACK) {
            const { data, statusCode } = jiraCurlGet(url);
            if (statusCode >= 400) {
                return {
                    ok: false,
                    status: statusCode,
                    message: 'Jira returned error',
                    detail: data
                };
            }
            return {
                ok: true,
                status: statusCode,
                user: {
                    key: data.accountId,
                    name: data.displayName,
                    email: data.emailAddress
                }
            };
        }
        const response = await axios.get(url, {
            ...getProxyConfig(),
            headers: {
                ...getProxyHeaders(),
                'Authorization': authHeader,
                'Accept': 'application/json'
            },
            timeout: 15000
        });
        if (response.status >= 400) {
            return {
                ok: false,
                status: response.status,
                message: response.statusText || 'Jira returned error',
                detail: response.data
            };
        }
        return {
            ok: true,
            status: response.status,
            user: {
                key: response.data.accountId,
                name: response.data.displayName,
                email: response.data.emailAddress
            }
        };
    } catch (error) {
        const status = error?.response?.status;
        const data = error?.response?.data;
        const message = Array.isArray(data?.errorMessages) ? data.errorMessages.join('; ') : data?.message || error?.message || 'Request failed';
        return {
            ok: false,
            status: status || 0,
            message,
            detail: data ? (typeof data === 'object' ? data : { body: String(data).substring(0, 500) }) : undefined
        };
    }
}

module.exports = { getJiraIssues, getJiraProjects, getJiraConnectionTest };