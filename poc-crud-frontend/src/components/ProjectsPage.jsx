import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Chip, Button
} from '@mui/material';
import axios from 'axios';
import dayjs from 'dayjs';

// Helper for date formatting
const formatDate = (dateString) => {
  return dateString && dayjs(dateString).isValid() ? dayjs(dateString).format('DD MMM YYYY') : '-';
};

// Helper for status chip
const getStatusChip = (status) => {
  switch (status) {
    case 'Done':
      return { label: 'Done', color: 'success', bgColor: '#d1fae5' };
    case 'In Progress':
      return { label: 'In Progress', color: 'info', bgColor: '#dbeafe' };
    case 'Delayed':
      return { label: 'Delayed', color: 'warning', bgColor: '#fef3c7' };
    default:
      return { label: status, color: 'default', bgColor: '#f3f4f6' };
  }
};

export default function JiraProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [projectsData, setProjectsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all Jira projects on component mount
  useEffect(() => {
    async function fetchAllProjectsData() {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get('/api/jira/projects');
        if (response.data.success) {
          const projectsList = response.data.data;
          setProjects(projectsList);

          // Fetch issues for each project to calculate metrics
          const enrichedProjects = await Promise.all(
            projectsList.map(async (project) => {
              try {
                const issuesResponse = await axios.get(`/api/jira/project/${project.key}/issues`);
                if (issuesResponse.data.success) {
                  const issues = issuesResponse.data.data || [];
                  return calculateProjectMetrics(project, issues);
                }
              } catch (err) {
                console.error(`Error fetching issues for ${project.key}:`, err);
              }
              return calculateProjectMetrics(project, []);
            })
          );

          setProjectsData(enrichedProjects.filter(Boolean));
        } else {
          setError(response.data.message || 'Failed to fetch Jira projects.');
        }
      } catch (err) {
        console.error('Error fetching Jira projects:', err?.response?.data || err.message);
        setError(err?.response?.data?.message || err.message || 'Failed to fetch Jira projects.');
      } finally {
        setLoading(false);
      }
    }
    fetchAllProjectsData();
  }, []);

  // Calculate project metrics from issues
  const calculateProjectMetrics = (project, issues) => {
    const totalIssues = issues.length;
    const completedIssues = issues.filter(i => String(i.status).toLowerCase() === 'done').length;
    const bugCount = issues.filter(i => i.type === 'Bug').length;
    
    // Calculate completion percentage
    const completionPercent = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

    // Find start and end dates
    let startDate = null;
    let endDate = null;

    if (issues.length > 0) {
      const validDates = issues
        .map(i => ({
          start: i.created ? dayjs(i.created) : null,
          end: i.dueDate ? dayjs(i.dueDate) : null
        }))
        .filter(d => d.start || d.end);

      if (validDates.length > 0) {
        const starts = validDates.map(d => d.start).filter(Boolean);
        const ends = validDates.map(d => d.end).filter(Boolean);
        
        if (starts.length > 0) startDate = dayjs.min(...starts);
        if (ends.length > 0) endDate = dayjs.max(...ends);
      }
    }

    // Determine project status
    let projectStatus = 'Done';
    if (completedIssues === 0) {
      projectStatus = 'In Progress';
    } else if (completedIssues < totalIssues) {
      // Project still in progress - check if delayed
      if (endDate && dayjs().isAfter(endDate)) {
        projectStatus = 'Delayed';
      } else {
        projectStatus = 'In Progress';
      }
    }

    return {
      key: project.key,
      name: project.name,
      completionPercent,
      totalIssues,
      completedIssues,
      bugCount,
      startDate,
      endDate,
      status: projectStatus
    };
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, color: 'var(--text-dark)', mb: 3 }}>
        Jira Projects Overview
      </Typography>

      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#ffebee', borderRadius: 2 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 8px 28px rgba(0,0,0,0.07)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f3f4f6' }}>
              <TableCell sx={{ fontWeight: 700, color: 'var(--text-dark)', borderBottom: '2px solid #e5e7eb' }}>
                Project Name
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: 'var(--text-dark)', borderBottom: '2px solid #e5e7eb' }}>
                Completion %
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: 'var(--text-dark)', borderBottom: '2px solid #e5e7eb' }}>
                Total Tasks/Issues
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: 'var(--text-dark)', borderBottom: '2px solid #e5e7eb' }}>
                Completed
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: 'var(--text-dark)', borderBottom: '2px solid #e5e7eb' }}>
                Bugs
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: 'var(--text-dark)', borderBottom: '2px solid #e5e7eb' }}>
                Start Date
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: 'var(--text-dark)', borderBottom: '2px solid #e5e7eb' }}>
                End Date
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, color: 'var(--text-dark)', borderBottom: '2px solid #e5e7eb' }}>
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <LinearProgress sx={{ width: '100%', mb: 2 }} />
                  <Typography color="text.secondary">Loading projects...</Typography>
                </TableCell>
              </TableRow>
            ) : projectsData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No projects found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              projectsData.map((project) => {
                const statusChip = getStatusChip(project.status);
                return (
                  <TableRow 
                    key={project.key}
                    hover
                    sx={{
                      '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.02)' }
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600, color: '#7c3aed' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {project.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-light)' }}>
                          ({project.key})
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <Box sx={{ width: 100 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={project.completionPercent}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: '#e5e7eb',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: project.completionPercent === 100 ? '#22C55E' : 'var(--primary-orange)',
                                borderRadius: 4
                              }
                            }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: '45px' }}>
                          {project.completionPercent}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#7c3aed' }}>
                        {project.totalIssues}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${project.completedIssues}/${project.totalIssues}`}
                        size="small"
                        sx={{
                          bgcolor: '#d1fae5',
                          color: '#065f46',
                          fontWeight: 600
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={project.bugCount}
                        size="small"
                        sx={{
                          bgcolor: project.bugCount > 0 ? '#fee2e2' : '#f3f4f6',
                          color: project.bugCount > 0 ? '#991b1b' : '#6b7280',
                          fontWeight: 600
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {project.startDate ? formatDate(project.startDate.toString()) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {project.endDate ? formatDate(project.endDate.toString()) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={project.status}
                        size="small"
                        sx={{
                          bgcolor: statusChip.bgColor,
                          color: statusChip.color === 'success' ? '#065f46' : 
                                 statusChip.color === 'info' ? '#0c4a6e' :
                                 statusChip.color === 'warning' ? '#92400e' : '#6b7280',
                          fontWeight: 600,
                          borderRadius: '6px'
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary Stats */}
      {projectsData.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--text-dark)', mb: 2 }}>
            Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Typography variant="body2" sx={{ color: 'var(--text-light)', mb: 1 }}>
                  Total Projects
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#7c3aed' }}>
                  {projectsData.length}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Typography variant="body2" sx={{ color: 'var(--text-light)', mb: 1 }}>
                  Completed Projects
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#22C55E' }}>
                  {projectsData.filter(p => p.status === 'Done').length}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Typography variant="body2" sx={{ color: 'var(--text-light)', mb: 1 }}>
                  In Progress
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#2563EB' }}>
                  {projectsData.filter(p => p.status === 'In Progress').length}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Typography variant="body2" sx={{ color: 'var(--text-light)', mb: 1 }}>
                  Delayed
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#F59E0B' }}>
                  {projectsData.filter(p => p.status === 'Delayed').length}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
      }
      try {
        setLoadingIssues(true);
        setError(null);
        console.log('[Frontend] Fetching issues for project:', selectedProjectKey);
        // Use the project-specific endpoint
        const response = await axios.get(`/api/jira/project/${selectedProjectKey}/issues`);
        if (response.data.success) {
          // Process and organize issues hierarchically
          const fetchedIssues = response.data.data;
          console.log('[Frontend] Fetched', fetchedIssues.length, 'issues from API');
          console.log('[Frontend] First issue full:', fetchedIssues[0]);
          console.log('[Frontend] First 5 issue keys and types:', fetchedIssues.slice(0, 5).map(i => `${i.key}: type="${i.type}"`));
          const organizedIssues = organizeIssuesHierarchically(fetchedIssues);
          console.log('[Frontend] Organized into', organizedIssues.length, 'root-level items');
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
          setError(response.data.message || `Failed to fetch issues for project ${selectedProjectKey}.`);
        }
      } catch (err) {
        console.error(`Error fetching issues for project ${selectedProjectKey}:`, err?.response?.data || err.message);
        setError(err?.response?.data?.message || err.message || `Failed to fetch issues for project ${selectedProjectKey}.`);
      } finally {
        setLoadingIssues(false);
      }
    }
    fetchIssues();
  }, [selectedProjectKey]);

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

  // Flatten for summaries
  const flatIssues = useMemo(() => {
    const out = [];
    const walk = (arr) => arr.forEach(i => { out.push(i); if (i.children && i.children.length) walk(i.children); });
    walk(issues);
    return out;
  }, [issues]);

  const summary = useMemo(() => ({
    total: flatIssues.length,
    epics: flatIssues.filter(i => i.type === 'Epic').length,
    tasks: flatIssues.filter(i => i.type === 'Task' || i.type === 'Story').length,
    subtasks: flatIssues.filter(i => i.type === 'Subtask' || i.type === 'Sub-task').length,
    bugs: flatIssues.filter(i => i.type === 'Bug').length,
    done: flatIssues.filter(i => String(i.status).toLowerCase() === 'done').length,
  }), [flatIssues]);

  // Function to organize issues into Epic -> Task/Story -> Subtask hierarchy
  const organizeIssuesHierarchically = (issues) => {
    console.log('[Hierarchy] Starting organization with', issues.length, 'issues');
    
    // Create a map for quick lookup
    const issuesMap = new Map();
    issues.forEach(issue => {
      console.log(`[Hierarchy] Issue ${issue.key}: type="${issue.type}", parent="${issue.parentKey}", epic="${issue.epicLink}"`);
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

    console.log('[Hierarchy] Organized into', rootIssues.length, 'root items');
    console.log('[Hierarchy] Root items:', rootIssues.map(i => `${i.key} (${i.type}, ${i.children.length} children)`).join(', '));
    
    return rootIssues;
  };

  const handleProjectChange = (event) => {
    setSelectedProjectKey(event.target.value);
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

  // Recursively render issues with collapsible hierarchy like Jira
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
              bgcolor: isEpic ? '#faf5ff' : 'inherit',
              '&:hover': { bgcolor: isEpic ? '#f3e8ff' : 'rgba(0, 0, 0, 0.04)' }
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
                    bgcolor: isEpic ? '#7c3aed' : isSubtask ? '#64748b' : '#3b82f6',
                    color: 'white'
                  }} 
                />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: isEpic ? 600 : 400,
                    color: isEpic ? '#7c3aed' : 'inherit'
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
              <Typography variant="body2">{issue.assignee}</Typography>
            </TableCell>
            <TableCell>
              <Typography variant="body2">{issue.priority}</Typography>
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

  return (
    <Box sx={{ maxWidth: 1100, margin: '0 auto', p: 2 }}>
      <Typography variant="h4" sx={{ color: 'var(--text-dark)', fontWeight: 700, mb: 3 }}>
        Jira Projects Dashboard
      </Typography>

      {error && <Paper sx={{ p: 2, mb: 3, bgcolor: '#ffebee', borderRadius: 2 }}><Typography color="error">{error}</Typography></Paper>}

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: 'var(--shadow-light)', bgcolor: 'var(--card-bg)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--text-dark)', mb: { xs: 2, md: 0 } }}>
            Select Jira Project
          </Typography>
          <FormControl sx={{ minWidth: 250 }} size="small">
            <InputLabel id="project-select-label">Project</InputLabel>
            <Select
              labelId="project-select-label"
              value={selectedProjectKey}
              label="Project"
              onChange={handleProjectChange}
              disabled={loadingProjects}
            >
              {loadingProjects ? (
                <MenuItem value=""><LinearProgress sx={{ width: '100%' }} /></MenuItem>
              ) : projects.length === 0 ? (
                <MenuItem value="" disabled>No projects found</MenuItem>
              ) : (
                projects.map((project) => (
                  <MenuItem key={project.key} value={project.key}>
                    {project.name} ({project.key})
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 'var(--shadow-light)', bgcolor: 'var(--card-bg)' }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatTile icon={<KeyboardArrowRight />} label="Total Tasks/Issues" value={summary.total} color="#7c3aed" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatTile icon={<KeyboardArrowRight />} label="Completed Tasks/Issues" value={summary.done} color="#22C55E" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatTile icon={<KeyboardArrowRight />} label="Tasks/Stories" value={summary.tasks} color="#2563EB" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatTile icon={<KeyboardArrowRight />} label="Bugs" value={summary.bugs} color="#EF4444" />
          </Grid>
        </Grid>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--text-dark)' }}>
            Issues for {selectedProjectKey || 'Selected Project'}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
        </Box>
        
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'var(--secondary-gray)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'var(--text-dark)', borderBottom: '1px solid var(--border-color)' }}>Key</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'var(--text-dark)', borderBottom: '1px solid var(--border-color)' }}>Summary</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'var(--text-dark)', borderBottom: '1px solid var(--border-color)' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'var(--text-dark)', borderBottom: '1px solid var(--border-color)' }}>Assignee</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'var(--text-dark)', borderBottom: '1px solid var(--border-color)' }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'var(--text-dark)', borderBottom: '1px solid var(--border-color)' }}>Due Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingIssues ? (
                <TableRow><TableCell colSpan={6} align="center"><LinearProgress sx={{ width: '100%' }} /></TableCell></TableRow>
              ) : filteredIssues.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">No issues found matching the current filters.</TableCell></TableRow>
              ) : (
                renderIssuesHierarchically(filteredIssues, 0)
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}