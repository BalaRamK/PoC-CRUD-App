const express = require('express');
const router = express.Router();
const jiraService = require('../services/jira.service');

function sendJiraError(res, error, routeName) {
  const status = error?.response?.status || 500;
  const message = error?.response?.data?.error?.message || error?.message || 'Jira request failed';
  console.error(`[jira.routes] ${routeName}:`, message, error?.response?.status);
  res.status(status).json({
    success: false,
    error: { message: String(message).substring(0, 500), status },
    data: []
  });
}

router.get('/issues', async (req, res) => {
  try {
    const jql = req.query.jql;
    const issues = await jiraService.getJiraIssues({ jql });
    res.json({ success: true, data: issues });
  } catch (error) {
    sendJiraError(res, error, '/issues');
  }
});

router.get('/project/:projectKey/issues', async (req, res) => {
  try {
    const { projectKey } = req.params;
    const issues = await jiraService.getJiraIssues({ projectKey });
    res.json({ success: true, data: issues });
  } catch (error) {
    sendJiraError(res, error, '/project/:projectKey/issues');
  }
});

router.get('/projects', async (req, res) => {
  try {
    const projects = await jiraService.getJiraProjects();
    res.json({ success: true, data: projects });
  } catch (error) {
    sendJiraError(res, error, '/projects');
  }
});

module.exports = router;