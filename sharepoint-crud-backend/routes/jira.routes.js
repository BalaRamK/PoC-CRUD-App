const express = require('express');
const router = express.Router();
const jiraService = require('../services/jira.service');

router.get('/issues', async (req, res, next) => {
  try {
    const jql = req.query.jql; // Allow frontend to pass JQL for dynamic filtering
    const issues = await jiraService.getJiraIssues({ jql });
    res.json({ success: true, data: issues });
  } catch (error) {
    console.error('Error in /api/jira/issues route:', error.message);
    next(error); // Pass error to error handling middleware
  }
});

// Project-specific issues endpoint
router.get('/project/:projectKey/issues', async (req, res, next) => {
  try {
    const { projectKey } = req.params;
    console.log('[Jira Routes] Fetching issues for project:', projectKey);
    const issues = await jiraService.getJiraIssues({ projectKey });
    res.json({ success: true, data: issues });
  } catch (error) {
    console.error('Error in /api/jira/project/:projectKey/issues route:', error.message);
    next(error);
  }
});

router.get('/projects', async (req, res, next) => {
  try {
    const projects = await jiraService.getJiraProjects();
    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Error in /api/jira/projects route:', error.message);
    next(error); // Pass error to error handling middleware
  }
});

module.exports = router;