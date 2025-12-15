import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Chip, IconButton, Collapse, Button, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowRight, ArrowBack } from '@mui/icons-material';
import axios from 'axios';
import dayjs from 'dayjs';

// Helper for status chip styling
const getStatusChipProps = (status) => {
  const lowerStatus = String(status).toLowerCase();
  let color = 'default';
  let label = status;

  switch (lowerStatus) {
    case 'to do':
    case 'open':
      color = 'info';
      label = status;
      break;
    case 'in progress':
    case 'selected for development':
      color = 'primary';
      label = status;
      break;
    case 'done':
    case 'completed':
      color = 'success';
      label = status;
      break;
    case 'blocked':
    case 'at risk':
      color = 'error';
      label = status;
      break;
    default:
      color = 'default';
      label = status;
  }
  return { color, label };
};

// Helper for date formatting
const formatDate = (dateString) => {
  return dateString && dayjs(dateString).isValid() ? dayjs(dateString).format('DD MMM YYYY') : dateString;
};

export default function ProjectDetailView({ projectKey, projectName, onBack }) {
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedIssues, setExpandedIssues] = useState(new Set());
  
  // Filter states
  const [filterIssueType, setFilterIssueType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Fetch issues for the selected project
  useEffect(() => {
    async function fetchIssues() {
      if (!projectKey) return;
      
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`/api/jira/project/${projectKey}/issues`);
        if (response.data.success) {
          const fetchedIssues = response.data.data;
          const organizedIssues = organizeIssuesHierarchically(fetchedIssues);
          setIssues(organizedIssues);
          
          // Auto-expand all epics by default
          const epicsToExpand = new Set();
          organizedIssues.forEach(issue => {
            if (issue.type === 'Epic' && issue.children && issue.children.length > 0) {
              epicsToExpand.add(issue.key);
            }
          });
          setExpandedIssues(epicsToExpand);
        } else {
          setError(response.data.message || `Failed to fetch issues for project ${projectKey}.`);
        }
      } catch (err) {
        console.error(`Error fetching issues for project ${projectKey}:`, err?.response?.data || err.message);
        setError(err?.response?.data?.message || err.message || `Failed to fetch issues for project ${projectKey}.`);
      } finally {
        setLoading(false);
      }
    }
    fetchIssues();
  }, [projectKey]);

  // Apply filters whenever issues or filter values change
  useEffect(() => {
    let filtered = [...issues];
    
    // Filter by issue type
    if (filterIssueType !== 'All') {
      filtered = filterHierarchically(filtered, (issue) => issue.type === filterIssueType);
    }
    
    // Filter by status
    if (filterStatus !== 'All') {
      filtered = filterHierarchically(filtered, (issue) => issue.status === filterStatus);
    }
    
    setFilteredIssues(filtered);
  }, [issues, filterIssueType, filterStatus]);

  // Helper to filter hierarchical data while preserving structure
  const filterHierarchically = (issuesList, predicate) => {
    const filtered = [];
    
    issuesList.forEach(issue => {
      const childrenMatch = issue.children ? filterHierarchically(issue.children, predicate) : [];
      const issueMatches = predicate(issue);
      
      if (issueMatches || childrenMatch.length > 0) {
        filtered.push({
          ...issue,
          children: childrenMatch
        });
      }
    });
    
    return filtered;
  };

  // Function to organize issues into Epic -> Task/Story -> Subtask hierarchy
  const organizeIssuesHierarchically = (issues) => {
    const issuesMap = new Map();
    issues.forEach(issue => {
      issuesMap.set(issue.key, { ...issue, children: [] });
    });

    const rootIssues = [];
    const processed = new Set();

    // Step 1: Link subtasks to their parent tasks/stories
    issues.forEach(issue => {
      if (issue.parentKey) {
        const parent = issuesMap.get(issue.parentKey);
        const child = issuesMap.get(issue.key);
        if (parent && child) {
          parent.children.push(child);
          processed.add(issue.key);
        }
      }
    });

    // Step 2: Link tasks/stories to epics (via epicLink)
    issues.forEach(issue => {
      if (issue.epicLink && !issue.parentKey && issue.type !== 'Epic') {
        const epic = issuesMap.get(issue.epicLink);
        const child = issuesMap.get(issue.key);
        if (epic && child) {
          epic.children.push(child);
          processed.add(issue.key);
        }
      }
    });

    // Step 3: Add all unprocessed issues as root items (epics and orphans)
    issues.forEach(issue => {
      if (!processed.has(issue.key)) {
        rootIssues.push(issuesMap.get(issue.key));
      }
    });
    
    return rootIssues;
  };

  const toggleExpanded = (issueKey) => {
    setExpandedIssues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueKey)) {
        newSet.delete(issueKey);
      } else {
        newSet.add(issueKey);
      }
      return newSet;
    });
  };

  // Recursively render issues with collapsible hierarchy
  const renderIssuesHierarchically = (issuesList, level) => {
    return issuesList.map((issue) => {
      const hasChildren = issue.children && issue.children.length > 0;
      const isExpanded = expandedIssues.has(issue.key);
      const issueType = issue.type || 'Unknown';
      const isEpic = issueType === 'Epic';
      const isSubtask = issueType === 'Subtask' || issueType === 'Sub-task';
      
      return (
        <React.Fragment key={issue.id}>
          <TableRow 
            hover 
            sx={{ 
              bgcolor: isEpic ? 'var(--active-bg)' : 'inherit',
              '&:hover': { bgcolor: isEpic ? 'var(--active-bg)' : 'rgba(0, 0, 0, 0.04)' }
            }}
          >
            <TableCell sx={{ paddingLeft: `${level * 24 + 8}px`, minWidth: '200px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {hasChildren ? (
                  <IconButton 
                    size="small" 
                    onClick={() => toggleExpanded(issue.key)}
                    sx={{ mr: 0.5, p: 0.5 }}
                  >
                    {isExpanded ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowRight fontSize="small" />}
                  </IconButton>
                ) : (
                  <Box sx={{ width: 28, display: 'inline-block' }} />
                )}
                <Chip 
                  label={issueType} 
                  size="small" 
                  sx={{ 
                    mr: 1, 
                    fontSize: '0.65rem', 
                    height: '18px',
                    fontWeight: 600,
                    bgcolor: isEpic ? 'var(--primary-orange)' : isSubtask ? 'var(--text-light)' : 'var(--primary-orange)',
                    color: 'white'
                  }} 
                />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: isEpic ? 600 : 400,
                    color: isEpic ? 'var(--primary-orange)' : 'inherit'
                  }}
                >
                  {issue.key}
                </Typography>
              </Box>
            </TableCell>
            <TableCell sx={{ maxWidth: 300, whiteSpace: 'normal', wordBreak: 'break-word' }}>
              <Typography variant="body2" sx={{ fontWeight: isEpic ? 600 : 400 }}>
                {issue.title}
              </Typography>
            </TableCell>
            <TableCell>
              <Chip 
                size="small" 
                {...getStatusChipProps(issue.status)} 
                sx={{ borderRadius: '4px', height: '22px', fontSize: '0.7rem' }} 
              />
            </TableCell>
            <TableCell>
              <Typography variant="body2">{issue.assignee || '-'}</Typography>
            </TableCell>
            <TableCell>
              <Typography variant="body2">{issue.priority || '-'}</Typography>
            </TableCell>
            <TableCell>
              <Typography variant="body2">{formatDate(issue.dueDate)}</Typography>
            </TableCell>
          </TableRow>
          {hasChildren && isExpanded && renderIssuesHierarchically(issue.children, level + 1)}
        </React.Fragment>
      );
    });
  };

  // Calculate summary stats
  const flatIssues = React.useMemo(() => {
    const out = [];
    const walk = (arr) => arr.forEach(i => { out.push(i); if (i.children && i.children.length) walk(i.children); });
    walk(issues);
    return out;
  }, [issues]);

  const summary = React.useMemo(() => ({
    total: flatIssues.length,
    done: flatIssues.filter(i => String(i.status).toLowerCase() === 'done').length,
    inProgress: flatIssues.filter(i => String(i.status).toLowerCase() === 'in progress').length,
    bugs: flatIssues.filter(i => i.type === 'Bug').length,
  }), [flatIssues]);

  return (
    <Box>
      {/* Header with back button */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={onBack}
          sx={{ mr: 2, color: 'var(--primary-orange)' }}
        >
          Back to Projects
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 600, color: 'var(--text-dark)' }}>
          {projectName} ({projectKey})
        </Typography>
      </Box>

      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'var(--active-bg)', borderRadius: 2 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      {/* Summary Stats */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, minWidth: 150, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <Typography variant="body2" sx={{ color: 'var(--text-light)', mb: 0.5 }}>
            Total Issues
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#7c3aed' }}>
            {summary.total}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 150, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <Typography variant="body2" sx={{ color: 'var(--text-light)', mb: 0.5 }}>
            Completed
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#22C55E' }}>
            {summary.done}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 150, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <Typography variant="body2" sx={{ color: 'var(--text-light)', mb: 0.5 }}>
            In Progress
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#2563EB' }}>
            {summary.inProgress}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 150, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <Typography variant="body2" sx={{ color: 'var(--text-light)', mb: 0.5 }}>
            Bugs
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#EF4444' }}>
            {summary.bugs}
          </Typography>
        </Paper>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-dark)' }}>
            Filters:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="filter-type-label">Issue Type</InputLabel>
            <Select
              labelId="filter-type-label"
              value={filterIssueType}
              label="Issue Type"
              onChange={(e) => setFilterIssueType(e.target.value)}
            >
              <MenuItem value="All">All Types</MenuItem>
              <MenuItem value="Epic">Epic</MenuItem>
              <MenuItem value="Story">Story</MenuItem>
              <MenuItem value="Task">Task</MenuItem>
              <MenuItem value="Subtask">Subtask</MenuItem>
              <MenuItem value="Sub-task">Sub-task</MenuItem>
              <MenuItem value="Bug">Bug</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="filter-status-label">Status</InputLabel>
            <Select
              labelId="filter-status-label"
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="All">All Status</MenuItem>
              <MenuItem value="To Do">To Do</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Done">Done</MenuItem>
              <MenuItem value="Blocked">Blocked</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Issues Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 8px 28px rgba(0,0,0,0.07)' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f3f4f6' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: 'var(--text-dark)', borderBottom: '2px solid #e5e7eb' }}>Key</TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'var(--text-dark)', borderBottom: '2px solid #e5e7eb' }}>Summary</TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'var(--text-dark)', borderBottom: '2px solid #e5e7eb' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'var(--text-dark)', borderBottom: '2px solid #e5e7eb' }}>Assignee</TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'var(--text-dark)', borderBottom: '2px solid #e5e7eb' }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'var(--text-dark)', borderBottom: '2px solid #e5e7eb' }}>Due Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <LinearProgress sx={{ width: '100%', mb: 2 }} />
                  <Typography color="text.secondary">Loading issues...</Typography>
                </TableCell>
              </TableRow>
            ) : filteredIssues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No issues found matching the current filters.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              renderIssuesHierarchically(filteredIssues, 0)
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
