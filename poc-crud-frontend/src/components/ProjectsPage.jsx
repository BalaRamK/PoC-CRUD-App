import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Chip, IconButton, Tooltip
} from '@mui/material';
import { Visibility } from '@mui/icons-material';
import axios from 'axios';
import dayjs from 'dayjs';
import ProjectDetailView from './ProjectDetailView';

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
  const [selectedProject, setSelectedProject] = useState(null);

  // Fetch all Jira projects on component mount
  useEffect(() => {
    async function fetchAllProjectsData() {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get('/api/jira/projects');
        if (response.data.success) {
          const projectsList = response.data.data;
          // Filter projects that have "Delivery" in their name
          const filteredProjects = projectsList.filter(p => 
            p.name && p.name.toLowerCase().includes('delivery')
          );
          setProjects(filteredProjects);

          // Fetch issues for each filtered project to calculate metrics
          const enrichedProjects = await Promise.all(
            filteredProjects.map(async (project) => {
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

  // If a project is selected, show detail view
  if (selectedProject) {
    return (
      <ProjectDetailView 
        projectKey={selectedProject.key}
        projectName={selectedProject.name}
        onBack={() => setSelectedProject(null)}
      />
    );
  }

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
              <TableCell align="center" sx={{ fontWeight: 700, color: 'var(--text-dark)', borderBottom: '2px solid #e5e7eb' }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <LinearProgress sx={{ width: '100%', mb: 2 }} />
                  <Typography color="text.secondary">Loading projects...</Typography>
                </TableCell>
              </TableRow>
            ) : projectsData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
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
                    <TableCell align="center">
                      <Tooltip title="View Project Details">
                        <IconButton 
                          size="small" 
                          onClick={() => setSelectedProject({ key: project.key, name: project.name })}
                          sx={{ color: '#7c3aed' }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
