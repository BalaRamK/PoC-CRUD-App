require('dotenv').config();
const axios = require('axios');
const { getProxyConfig } = require('../lib/proxyAxios');

const JIRA_API_URL = process.env.JIRA_API_URL;
const JIRA_USER_EMAIL = process.env.JIRA_USER_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY;

// Basic Auth header for Jira API token
const authHeader = `Basic ${Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;

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

        const response = await axios.get(url, {
            ...getProxyConfig(),
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            },
            params: params,
        });

        console.log('[JiraService] Issues API Response Status:', response.status);
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

        const response = await axios.get(url, {
            ...getProxyConfig(),
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            },
            params: params,
        });

        console.log('[JiraService] Projects API Response Status:', response.status);
        console.log('[JiraService] Projects API Response Data (partial):', response.data.values ? response.data.values.slice(0, 2) : response.data); // Log first 2 projects or full data

        return response.data.values.map(project => ({
            id: project.id,
            key: project.key,
            name: project.name,
            projectType: project.projectTypeKey,
            simplified: project.simplified,
        }));

    } catch (error) {
        console.error('Error fetching Jira projects:', error?.response?.data || error.message);
        // Log the full error response from Axios for deeper inspection
        if (error.response) {
            console.error('[JiraService] Full error response data:', error.response.data);
            console.error('[JiraService] Full error response status:', error.response.status);
            console.error('[JiraService] Full error response headers:', error.response.headers);
        } else if (error.request) {
            console.error('[JiraService] No response received:', error.request);
        } else {
            console.error('[JiraService] Error setting up request:', error.message);
        }

        throw new Error(`Failed to fetch Jira projects: ${error?.response?.status || 'Unknown'} - ${error?.response?.statusText || error.message}`);
    }
}

module.exports = { getJiraIssues, getJiraProjects }; // <--- UPDATE module.exports