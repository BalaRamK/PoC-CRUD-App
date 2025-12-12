import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, LinearProgress, IconButton, Avatar, FormControl, InputLabel, Select, MenuItem, Chip, Tabs, Tab
} from '@mui/material';
import axios from 'axios';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import DashboardTile from './DashboardTile';
import StatTile from './StatTile';

// Icons for KPI cards and other elements
import DnsIcon from '@mui/icons-material/Dns';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WorkIcon from '@mui/icons-material/Work';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import BugReportIcon from '@mui/icons-material/BugReport';

// Helper for date formatting
const formatDate = (dateString) => {
  return dateString && dayjs(dateString).isValid() ? dayjs(dateString).format('DD MMM YYYY') : dateString;
};

// Helper for status colors
const getStatusColor = (status) => {
  switch (String(status).toLowerCase()) {
    case 'completed': return '#4CAF50'; // Green
    case 'delayed': return '#FF9800';   // Orange
    case 'on track': return '#2196F3';  // Blue
    case 'execution': return '#2196F3'; // Blue
    case 'in progress': return '#2196F3'; // Blue
    case 'cancelled': return '#F44336'; // Red
    default: return '#607D8B'; // Grayish-blue
  }
};

export default function Home() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Jira state
  const [jiraProjects, setJiraProjects] = useState([]);
  const [allProjectsData, setAllProjectsData] = useState([]);
  const [loadingJira, setLoadingJira] = useState(false);

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  async function fetchRows() {
    setLoading(true);
    try {
      const res = await axios.get('/api/items');
      let data = res?.data;
      if (data && data.success && data.data) data = data.data;
      if (!Array.isArray(data)) data = [];

      const normalized = data.map((item, idx) => {
        let values = [];
        if (Array.isArray(item.values)) values = Array.isArray(item.values[0]) ? item.values[0] : item.values;
        else if (Array.isArray(item)) values = item;

        // Ensure keys match your Excel columns
        const keys = ["pocId", "customer", "title", "salesOwner", "deliveryLead", "startDate", "endDate", "estimatedEndDate", "phase", "status", "percent", "nextMilestone", "currentBlockers", "comments"];
        const mapped = keys.reduce((acc, key, i) => ({ ...acc, [key]: values[i] ?? '' }), {});

        // Convert Excel serial dates for startDate/endDate if needed, as in DataTable.js
        const excelSerialToISO = (n) => {
          const epoch = new Date(Date.UTC(1899, 11, 30)); // Excel epoch 1899-12-30
          const ms = Math.round(n * 24 * 60 * 60 * 1000);
          const dt = new Date(epoch.getTime() + ms);
          return dt.toISOString();
        };
        if (typeof mapped.startDate === 'number') mapped.startDate = excelSerialToISO(mapped.startDate);
        if (typeof mapped.endDate === 'number') mapped.endDate = excelSerialToISO(mapped.endDate);
        if (typeof mapped.estimatedEndDate === 'number') mapped.estimatedEndDate = excelSerialToISO(mapped.estimatedEndDate);

        return { id: item.id ?? idx, index: item.index ?? idx, values, ...mapped };
      });

      setRows(normalized);
    } catch (e) {
      console.error('Home.fetchRows', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  // Fetch Jira projects with "Delivery" in name and their issues
  async function fetchJiraProjects() {
    try {
      setLoadingJira(true);
      const response = await axios.get('/api/jira/projects');
      if (response.data.success) {
        // Filter projects with "Delivery" in name
        const deliveryProjects = response.data.data.filter(p => 
          p.name && p.name.toLowerCase().includes('delivery')
        );
        setJiraProjects(deliveryProjects);

        // Fetch issues for each delivery project
        const projectsWithData = await Promise.all(
          deliveryProjects.map(async (project) => {
            try {
              const issuesResponse = await axios.get(`/api/jira/project/${project.key}/issues`);
              if (issuesResponse.data.success) {
                const issues = issuesResponse.data.data || [];
                return {
                  ...project,
                  issues,
                  totalIssues: issues.length,
                  completedIssues: issues.filter(i => String(i.status).toLowerCase() === 'done').length,
                  inProgressIssues: issues.filter(i => String(i.status).toLowerCase() === 'in progress').length,
                  startDate: issues.length > 0 ? issues.reduce((min, i) => {
                    const d = dayjs(i.created);
                    return !min || (d.isValid() && d.isBefore(min)) ? d : min;
                  }, null) : null,
                  endDate: issues.length > 0 ? issues.reduce((max, i) => {
                    const d = dayjs(i.dueDate);
                    return !max || (d.isValid() && d.isAfter(max)) ? d : max;
                  }, null) : null
                };
              }
            } catch (err) {
              console.error(`Error fetching issues for ${project.key}:`, err);
            }
            return { ...project, issues: [], totalIssues: 0, completedIssues: 0, inProgressIssues: 0 };
          })
        );
        setAllProjectsData(projectsWithData);
      }
    } catch (error) {
      console.error('Error fetching Jira projects:', error);
    } finally {
      setLoadingJira(false);
    }
  }

  useEffect(() => { 
    fetchRows(); 
    fetchJiraProjects(); 
  }, []);

  // PoC KPI Calculations
  const total = rows.length;
  const completed = rows.filter(r => String(r.status).toLowerCase() === 'completed').length;
  const delayed = rows.filter(r => String(r.status).toLowerCase() === 'delayed').length;
  const inProgress = rows.filter(r => String(r.status).toLowerCase() === 'execution' || String(r.status).toLowerCase() === 'in progress' || String(r.status).toLowerCase() === 'on track').length;

  // Get delayed and in progress PoC data
  const delayedRows = rows.filter(r => String(r.status).toLowerCase() === 'delayed');
  const inProgressRows = rows.filter(r => ['execution','in progress','on track'].includes(String(r.status).toLowerCase()));

  // Jira Project Calculations (from allProjectsData)
  const allIssues = allProjectsData.flatMap(p => p.issues || []);
  const jiraTotalProjects = allProjectsData.length;
  const jiraCompletedProjects = allProjectsData.filter(p => p.totalIssues > 0 && p.completedIssues === p.totalIssues).length;
  const jiraInProgressProjects = allProjectsData.filter(p => p.inProgressIssues > 0).length;
  const jiraDelayedProjects = allProjectsData.filter(p => {
    const endDate = p.endDate;
    return endDate && endDate.isValid() && endDate.isBefore(dayjs(), 'day') && p.completedIssues < p.totalIssues;
  }).length;

  // Get delayed and in progress project data
  const delayedProjectsData = allProjectsData.filter(p => {
    const endDate = p.endDate;
    return endDate && endDate.isValid() && endDate.isBefore(dayjs(), 'day') && p.completedIssues < p.totalIssues;
  });
  const inProgressProjectsData = allProjectsData.filter(p => p.inProgressIssues > 0);

  // Trend helpers (vs last week)
  const inWindow = (d, start, end) => d && d.isValid() && (d.isAfter(start) || d.isSame(start, 'day')) && (d.isBefore(end) || d.isSame(end, 'day'));
  const today = dayjs();
  const weekStart = today.subtract(6, 'day');
  const prevWeekStart = today.subtract(13, 'day');
  const prevWeekEnd = weekStart.subtract(1, 'day');

  const delta = (a, b) => a - b;

  const pocsStartedIn = (start, end) => rows.filter(r => inWindow(dayjs(r.startDate), start, end)).length;
  const pocsCompletedIn = (start, end) => rows.filter(r => String(r.status).toLowerCase() === 'completed' && inWindow(dayjs(r.endDate), start, end)).length;
  const pocsDelayedIn = (start, end) => rows.filter(r => String(r.status).toLowerCase() === 'delayed' && inWindow(dayjs(r.endDate), start, end)).length;
  const pocsInProgressIn = (start, end) => rows.filter(r => ['execution','in progress','on track'].includes(String(r.status).toLowerCase()) && inWindow(dayjs(r.startDate), start, end)).length;

  const trendTotalPocs = delta(pocsStartedIn(weekStart, today), pocsStartedIn(prevWeekStart, prevWeekEnd));
  const trendCompletedPocs = delta(pocsCompletedIn(weekStart, today), pocsCompletedIn(prevWeekStart, prevWeekEnd));
  const trendDelayedPocs = delta(pocsDelayedIn(weekStart, today), pocsDelayedIn(prevWeekStart, prevWeekEnd));
  const trendInProgressPocs = delta(pocsInProgressIn(weekStart, today), pocsInProgressIn(prevWeekStart, prevWeekEnd));

  // Overall Progress Bar Calculation (e.g., average completion of all PoCs)
  const averageCompletion = total > 0 ? (rows.reduce((sum, r) => sum + (Number(r.percent) || 0), 0) / total) : 0;
  const pocProgress = total > 0 ? Math.round((completed / total) * 100) : 0;


  return (
    <Box>
      {/* Header with Title */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text-dark)', mb: 0.5 }}>Dashboard Overview</Typography>
        <Typography variant="body2" color="text.secondary">Track Jira projects and PoC delivery metrics</Typography>
      </Box>

      {/* Tabs Section */}
      <Paper sx={{ borderRadius: 3, boxShadow: '0 8px 28px rgba(0,0,0,0.07)', background: 'linear-gradient(135deg, #fff 0%, #f8f9ff 100%)' }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ 
            borderBottom: '2px solid #e5e7eb',
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '1rem',
              textTransform: 'none',
              minWidth: 'auto',
              px: 3,
              py: 1.5,
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'var(--primary-orange)',
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'var(--primary-orange)',
              height: 3,
            }
          }}
        >
          <Tab label="PoC Status" />
          <Tab label="Project Delivery Status" />
        </Tabs>

        {/* TAB 1: PoC Status */}
        <Box sx={{ display: tabValue === 0 ? 'block' : 'none', p: 3 }}>
          {/* PoC KPI Tiles */}
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: 1 }}>
            <DnsIcon sx={{ color: 'var(--primary-orange)' }} /> PoC Status Overview
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatTile icon={<DnsIcon />} label="Total PoCs" value={total} color="#E6512E" trend={{ delta: trendTotalPocs }} onClick={() => navigate('/poc-delivery-list')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatTile icon={<CheckCircleOutlineIcon />} label="Completed" value={completed} color="#22C55E" trend={{ delta: trendCompletedPocs }} onClick={() => navigate('/poc-delivery-list?status=Completed')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatTile icon={<CancelOutlinedIcon />} label="Delayed" value={delayed} color="#F59E0B" trend={{ delta: trendDelayedPocs }} onClick={() => navigate('/poc-delivery-list?status=Delayed')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatTile icon={<HourglassEmptyIcon />} label="In Progress" value={inProgress} color="#2563EB" trend={{ delta: trendInProgressPocs }} onClick={() => navigate('/poc-delivery-list?status=In%20Progress')} />
            </Grid>
          </Grid>

          {/* Overall PoC Progress */}
          <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 10px 32px rgba(0,0,0,0.08)', background: 'linear-gradient(135deg, #ffffff 0%, #fff7f4 100%)', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--text-dark)' }}>Overall PoC Completion</Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'var(--primary-orange)' }}>{averageCompletion.toFixed(0)}%</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={averageCompletion} 
                sx={{ 
                  height: 12, 
                  borderRadius: 6, 
                  bgcolor: 'var(--secondary-gray)', 
                  '& .MuiLinearProgress-bar': { 
                    bgcolor: 'var(--primary-orange)',
                    borderRadius: 6
                  } 
                }} 
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button 
                  size="small" 
                  onClick={() => navigate('/poc-delivery-list')} 
                  sx={{ 
                    color: 'var(--primary-orange)', 
                    fontWeight: 600,
                    '&:hover': { bgcolor: 'rgba(255, 111, 0, 0.08)' }
                  }}
                >
                  View All PoCs →
                </Button>
                <Button 
                  size="small" 
                  onClick={() => navigate('/projects')} 
                  sx={{ 
                    color: '#7c3aed', 
                    fontWeight: 600,
                    '&:hover': { bgcolor: 'rgba(124, 58, 237, 0.08)' }
                  }}
                >
                  View All Issues →
                </Button>
              </Box>
            </Box>
          </Paper>

          {/* Delayed & In Progress PoC Details */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {delayed > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 8px 28px rgba(0,0,0,0.07)', background: 'linear-gradient(135deg, #fffbeb 0%, #fff 100%)' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#F59E0B', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CancelOutlinedIcon /> Delayed Projects ({delayed})
                  </Typography>
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {delayedRows.map((item, idx) => (
                      <Box key={idx} sx={{ p: 2, mb: 1, bgcolor: '#fff', borderRadius: 2, border: '1px solid #fde68a', cursor: 'pointer' }} onClick={() => navigate('/poc-delivery-list?status=Delayed')}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-dark)' }}>{item.title}</Typography>
                          <Chip label="Delayed" size="small" sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 600 }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Customer: {item.customer || 'N/A'}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Lead: {item.deliveryLead || 'N/A'}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Due: {formatDate(item.endDate)}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            )}
            {inProgress > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 8px 28px rgba(0,0,0,0.07)', background: 'linear-gradient(135deg, #eff6ff 0%, #fff 100%)' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2563EB', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HourglassEmptyIcon /> In Progress Projects ({inProgress})
                  </Typography>
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {inProgressRows.map((item, idx) => (
                      <Box key={idx} sx={{ p: 2, mb: 1, bgcolor: '#fff', borderRadius: 2, border: '1px solid #bfdbfe', cursor: 'pointer' }} onClick={() => navigate('/poc-delivery-list?status=In%20Progress')}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-dark)' }}>{item.title}</Typography>
                          <Chip label={String(item.status).charAt(0).toUpperCase() + String(item.status).slice(1)} size="small" sx={{ bgcolor: '#DBEAFE', color: '#1e40af', fontWeight: 600 }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Customer: {item.customer || 'N/A'}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Lead: {item.deliveryLead || 'N/A'}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Progress: {item.percent || 0}%</Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>

        {/* TAB 2: Project Delivery Status */}
        <Box sx={{ display: tabValue === 1 ? 'block' : 'none', p: 3 }}>

          {/* Overall Jira Projects Metrics (Delivery Projects Only) */}
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: 1 }}>
            <DnsIcon sx={{ color: 'var(--primary-orange)' }} /> Delivery Projects Overview
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatTile 
                icon={<WorkIcon />} 
                label="Total Projects" 
                value={jiraTotalProjects} 
                color="#7c3aed" 
                onClick={() => navigate('/projects')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatTile 
                icon={<CheckCircleOutlineIcon />} 
                label="Completed" 
                value={jiraCompletedProjects} 
                color="#22C55E" 
                onClick={() => navigate('/projects')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatTile 
                icon={<HourglassEmptyIcon />} 
                label="In Progress" 
                value={jiraInProgressProjects} 
                color="#2563EB" 
                onClick={() => navigate('/projects')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatTile 
                icon={<CancelOutlinedIcon />} 
                label="Delayed" 
                value={jiraDelayedProjects} 
                color="#F59E0B" 
                onClick={() => navigate('/projects')}
              />
            </Grid>
          </Grid>

          {/* Project Details Cards */}
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'var(--text-dark)' }}>Project Details</Typography>
          
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {/* In Progress Projects */}
            {inProgressProjectsData.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 8px 28px rgba(0,0,0,0.07)', background: 'linear-gradient(135deg, #eff6ff 0%, #fff 100%)' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2563EB', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HourglassEmptyIcon /> In Progress Projects ({inProgressProjectsData.length})
                  </Typography>
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {inProgressProjectsData.slice(0, 5).map((project, idx) => (
                      <Box key={idx} sx={{ p: 2.5, mb: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1.5 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: 'var(--text-dark)', flex: 1 }}>{project.name}</Typography>
                          <Chip label={project.key} size="small" sx={{ bgcolor: '#DBEAFE', color: '#1e40af', fontWeight: 600, ml: 1 }} />
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            <strong>Start Date:</strong> {project.startDate ? project.startDate.format('MMM DD, YYYY') : 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <strong>End Date:</strong> {project.endDate ? project.endDate.format('MMM DD, YYYY') : 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <strong>Progress:</strong> {project.completedIssues} / {project.totalIssues} issues completed
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <strong>Status:</strong> {project.inProgressIssues} issue(s) in progress
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                    {inProgressProjectsData.length > 5 && (
                      <Typography variant="caption" sx={{ color: '#2563EB', fontWeight: 600 }}>
                        +{inProgressProjectsData.length - 5} more projects...
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* Delayed Projects */}
            {delayedProjectsData.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 8px 28px rgba(0,0,0,0.07)', background: 'linear-gradient(135deg, #fffbeb 0%, #fff 100%)' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#F59E0B', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CancelOutlinedIcon /> Delayed Projects ({delayedProjectsData.length})
                  </Typography>
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {delayedProjectsData.slice(0, 5).map((project, idx) => (
                      <Box key={idx} sx={{ p: 2.5, mb: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #fde68a' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1.5 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: 'var(--text-dark)', flex: 1 }}>{project.name}</Typography>
                          <Chip label={project.key} size="small" sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 600, ml: 1 }} />
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            <strong>Start Date:</strong> {project.startDate ? project.startDate.format('MMM DD, YYYY') : 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <strong>End Date:</strong> {project.endDate ? project.endDate.format('MMM DD, YYYY') : 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <strong>Progress:</strong> {project.completedIssues} / {project.totalIssues} issues completed
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#F59E0B', fontWeight: 600 }}>
                            <strong>Status:</strong> Overdue by {dayjs().diff(project.endDate, 'days')} day(s)
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                    {delayedProjectsData.length > 5 && (
                      <Typography variant="caption" sx={{ color: '#F59E0B', fontWeight: 600 }}>
                        +{delayedProjectsData.length - 5} more projects...
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>








        </Box>
      </Paper>
    </Box>
  );
}
