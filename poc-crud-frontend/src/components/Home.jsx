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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// Helper for date formatting
const formatDate = (dateString) => {
  return dateString && dayjs(dateString).isValid() ? dayjs(dateString).format('DD MMM YYYY') : dateString;
};

// Helper for status colors
const getStatusColor = (status) => {
  switch (String(status).toLowerCase()) {
    case 'completed': return '#4CAF50'; // Green
    case 'delayed': return 'var(--primary-orange)';   // Orange
    case 'on track': return 'var(--light-orange-1)';
    case 'execution': return 'var(--light-orange-1)';
    case 'in progress': return 'var(--light-orange-1)';
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
  const [timePeriod, setTimePeriod] = useState('3 months');

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
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          onClick={() => setTabValue(0)}
          sx={{
            px: 3.5,
            py: 1.25,
            borderRadius: '10px',
            textTransform: 'none',
            fontSize: '0.9375rem',
            fontWeight: 500,
            backgroundColor: tabValue === 0 ? 'var(--primary-orange)' : '#F3F4F6',
            color: tabValue === 0 ? '#ffffff' : '#4B5563',
            '&:hover': {
              backgroundColor: tabValue === 0 ? 'var(--primary-orange)' : '#E5E7EB',
            }
          }}
        >
          PoC Status
        </Button>
        <Button
          onClick={() => setTabValue(1)}
          sx={{
            px: 3.5,
            py: 1.25,
            borderRadius: '10px',
            textTransform: 'none',
            fontSize: '0.9375rem',
            fontWeight: 500,
            backgroundColor: tabValue === 1 ? 'var(--primary-orange)' : '#F3F4F6',
            color: tabValue === 1 ? '#ffffff' : '#4B5563',
            '&:hover': {
              backgroundColor: tabValue === 1 ? 'var(--primary-orange)' : '#E5E7EB',
            }
          }}
        >
          Project Delivery Status
        </Button>
      </Box>

      <Paper sx={{ borderRadius: 3, boxShadow: 'none', background: 'transparent' }}>

        {/* TAB 1: PoC Status */}
        <Box sx={{ display: tabValue === 0 ? 'block' : 'none' }}>
          {/* Status Summary Section */}
          <Paper sx={{ 
            p: 4, 
            borderRadius: 3, 
            background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8F77 100%)',
            color: '#fff',
            position: 'relative',
            mb: 3,
            boxShadow: '0 8px 24px rgba(255, 107, 74, 0.3)'
          }}>
            {/* Header with Dropdown */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Status Summary</Typography>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(e.target.value)}
                  sx={{
                    bgcolor: '#fff',
                    color: '#1F2937',
                    borderRadius: 2,
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    '& .MuiSvgIcon-root': { color: '#1F2937' }
                  }}
                >
                  <MenuItem value="3 months">3 months</MenuItem>
                  <MenuItem value="6 months">6 months</MenuItem>
                  <MenuItem value="full timeline">Full Timeline</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Visual Status Bar - Segmented */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ 
                display: 'flex', 
                height: 40, 
                borderRadius: 2,
                overflow: 'hidden',
                gap: '2px',
                bgcolor: 'transparent'
              }}>
                {rows.map((item, idx) => {
                  const status = String(item.status).toLowerCase();
                  let color = '#FCD34D'; // default yellow for delayed
                  if (status === 'completed') color = '#22C55E';
                  else if (['execution', 'in progress', 'on track'].includes(status)) color = '#3B82F6';
                  
                  return (
                    <Box 
                      key={idx}
                      sx={{ 
                        flex: 1,
                        bgcolor: color,
                        minWidth: '4px'
                      }} 
                    />
                  );
                })}
              </Box>
              {/* Legend */}
              <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#22C55E' }} />
                  <Typography variant="caption" sx={{ fontSize: '0.8rem' }}>Complete</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#3B82F6' }} />
                  <Typography variant="caption" sx={{ fontSize: '0.8rem' }}>In-Progress</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#FCD34D' }} />
                  <Typography variant="caption" sx={{ fontSize: '0.8rem' }}>Delayed</Typography>
                </Box>
              </Box>
            </Box>

            {/* Stats Grid with Dividers */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch' }}>
              <Box sx={{ flex: 1, py: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.9, textTransform: 'uppercase', fontSize: '0.75rem', display: 'block', mb: 0.5 }}>Total PoCs</Typography>
                <Typography variant="h2" sx={{ fontWeight: 700, fontSize: '2.5rem', lineHeight: 1 }}>{total}</Typography>
              </Box>
              <Box sx={{ width: '1px', bgcolor: 'rgba(255,255,255,0.3)', mx: 3 }} />
              <Box sx={{ flex: 1, py: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.9, textTransform: 'uppercase', fontSize: '0.75rem', display: 'block', mb: 0.5 }}>Completed</Typography>
                <Typography variant="h2" sx={{ fontWeight: 700, fontSize: '2.5rem', lineHeight: 1 }}>{completed}</Typography>
              </Box>
              <Box sx={{ width: '1px', bgcolor: 'rgba(255,255,255,0.3)', mx: 3 }} />
              <Box sx={{ flex: 1, py: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.9, textTransform: 'uppercase', fontSize: '0.75rem', display: 'block', mb: 0.5 }}>In Progress</Typography>
                <Typography variant="h2" sx={{ fontWeight: 700, fontSize: '2.5rem', lineHeight: 1 }}>{inProgress}</Typography>
              </Box>
              <Box sx={{ width: '1px', bgcolor: 'rgba(255,255,255,0.3)', mx: 3 }} />
              <Box sx={{ flex: 1, py: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.9, textTransform: 'uppercase', fontSize: '0.75rem', display: 'block', mb: 0.5 }}>Delayed</Typography>
                <Typography variant="h2" sx={{ fontWeight: 700, fontSize: '2.5rem', lineHeight: 1 }}>{delayed}</Typography>
              </Box>
            </Box>

            {/* Arrow Button */}
            <IconButton
              onClick={() => navigate('/poc-delivery-list')}
              sx={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                bgcolor: '#fff',
                width: 40,
                height: 40,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                '&:hover': { 
                  bgcolor: '#fff',
                  transform: 'translateX(4px)',
                  transition: 'transform 0.2s ease'
                }
              }}
            >
              <ArrowForwardIcon sx={{ color: '#FF6B4A' }} />
            </IconButton>
          </Paper>

          {/* Two Column Layout */}
          <Grid container spacing={3}>
            {/* Important Blockers Section */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ 
                p: 3, 
                borderRadius: 3, 
                background: 'linear-gradient(135deg, #FFB5A0 0%, #FFC9B8 100%)',
                minHeight: 400,
                position: 'relative',
                boxShadow: '0 4px 16px rgba(255, 181, 160, 0.3)'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: '#1F2937' }}>Important Blockers</Typography>
                <Box sx={{ maxHeight: 300, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {rows.filter(r => r.currentBlockers && r.currentBlockers.trim()).slice(0, 3).map((item, idx) => (
                    <Box key={idx} sx={{ 
                      p: 2.5, 
                      bgcolor: 'rgba(255,255,255,0.7)', 
                      borderRadius: 2,
                      backdropFilter: 'blur(10px)'
                    }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: '#1F2937' }}>
                        Project Name: {item.title || item.customer || 'N/A'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2, color: '#4B5563' }}>
                        <strong>Blockers:</strong> {item.currentBlockers}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: '#6B7280', display: 'block' }}>
                            <strong>⏰ Start Date</strong>
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#1F2937', fontWeight: 600 }}>
                            {formatDate(item.startDate) || 'N/A'}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" sx={{ color: '#6B7280', display: 'block' }}>
                            <strong>⏱️ End Date</strong>
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#1F2937', fontWeight: 600 }}>
                            {formatDate(item.endDate) || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                  {rows.filter(r => r.currentBlockers && r.currentBlockers.trim()).length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" sx={{ color: '#6B7280' }}>No blockers reported</Typography>
                    </Box>
                  )}
                </Box>
                <IconButton
                  onClick={() => navigate('/poc-delivery-list')}
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                    bgcolor: 'rgba(255,255,255,0.5)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.7)' }
                  }}
                >
                  <ArrowForwardIcon sx={{ color: '#1F2937' }} />
                </IconButton>
              </Paper>
            </Grid>

            {/* PoC Timeline Section */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ 
                p: 3, 
                borderRadius: 3, 
                background: 'linear-gradient(135deg, #FFE5E0 0%, #FFF0ED 100%)',
                minHeight: 400,
                position: 'relative',
                boxShadow: '0 4px 16px rgba(255, 229, 224, 0.3)'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: '#1F2937' }}>PoC Timeline</Typography>
                
                {/* Simple Timeline View */}
                <Box sx={{ position: 'relative', mt: 4 }}>
                  {/* Month Labels */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, px: 1 }}>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June'].map(month => (
                      <Typography key={month} variant="caption" sx={{ color: '#6B7280', fontSize: '0.7rem' }}>
                        {month}
                      </Typography>
                    ))}
                  </Box>

                  {/* Timeline Bars */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {rows.slice(0, 3).map((item, idx) => {
                      // Calculate bar position based on dates (simplified)
                      const startMonth = item.startDate ? dayjs(item.startDate).month() : 0;
                      const endMonth = item.endDate ? dayjs(item.endDate).month() : 5;
                      const leftPercent = (startMonth / 12) * 100;
                      const widthPercent = ((endMonth - startMonth + 1) / 12) * 100;
                      
                      return (
                        <Box key={idx} sx={{ position: 'relative', height: 32 }}>
                          <Box sx={{
                            position: 'absolute',
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            height: 32,
                            bgcolor: idx === 0 ? '#FF6B4A' : idx === 1 ? '#D32F2F' : '#FF8F77',
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            px: 1.5,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                          }}>
                            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, fontSize: '0.75rem' }}>
                              {item.customer || item.title || `Project ${idx + 1}`}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>

                <IconButton
                  onClick={() => navigate('/schedule')}
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                    bgcolor: 'rgba(255,255,255,0.5)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.7)' }
                  }}
                >
                  <ArrowForwardIcon sx={{ color: '#1F2937' }} />
                </IconButton>
              </Paper>
            </Grid>
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
                <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 8px 28px rgba(0,0,0,0.07)', background: 'linear-gradient(135deg, var(--secondary-gray) 0%, #fff 100%)' }}>
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
                <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 8px 28px rgba(0,0,0,0.07)', background: 'linear-gradient(135deg, var(--active-bg) 0%, #fff 100%)' }}>
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
