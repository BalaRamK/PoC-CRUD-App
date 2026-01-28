import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button as MUIButton, LinearProgress, IconButton, Avatar, FormControl, InputLabel, Select, MenuItem, Chip, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tooltip
} from '@mui/material';
import { Button as UIButton } from './ui/button';
import axios from 'axios';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
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
  const { user } = useAuth();
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
  const [customDateDialogOpen, setCustomDateDialogOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  async function fetchRows() {
    setLoading(true);
    try {
      const res = await axios.get('/api/items');
      let data = res?.data;
      if (data && data.success && data.data) data = data.data;
      if (!Array.isArray(data)) data = [];

      // Ensure keys match your Excel columns (shared for mapping and filtering)
      const keys = ["pocId", "customer", "title", "salesOwner", "deliveryLead", "startDate", "endDate", "estimatedEndDate", "phase", "status", "percent", "nextMilestone", "currentBlockers", "comments"];

      const normalized = data.map((item, idx) => {
        let values = [];
        if (Array.isArray(item.values)) values = Array.isArray(item.values[0]) ? item.values[0] : item.values;
        else if (Array.isArray(item)) values = item;

        // Support both array-of-values and object-shaped payloads
        const mapped = keys.reduce((acc, key, i) => ({
          ...acc,
          [key]: values[i] ?? item[key] ?? ''
        }), {});

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

      const cleaned = normalized.filter(row =>
        keys.some(key => String(row[key] ?? '').trim() !== '')
      );

      setRows(cleaned);
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

  // Helper to calculate if a PoC is actually delayed based on dates
  const isDelayed = (item) => {
    const status = String(item.status).toLowerCase();
    if (status === 'completed' || status === 'on hold') return false;
    // Consider planned (estimated) end date for delay determination
    const plannedEnd = dayjs(item.estimatedEndDate || item.endDate);
    const today = dayjs();
    return plannedEnd.isValid() && plannedEnd.isBefore(today, 'day');
  };

  // Helper to filter rows by time period
  const getFilteredRows = () => {
    const today = dayjs();
    let startDate, endDate;

    switch (timePeriod) {
      case '3 months':
        startDate = today.subtract(3, 'month');
        endDate = today;
        break;
      case '6 months':
        startDate = today.subtract(6, 'month');
        endDate = today;
        break;
      case 'full timeline':
        return rows; // No filtering
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = dayjs(customStartDate);
          endDate = dayjs(customEndDate);
        } else {
          return rows; // If custom dates not set, show all
        }
        break;
      default:
        return rows;
    }

    return rows.filter(r => {
      const itemStartDate = dayjs(r.startDate);
      if (!itemStartDate.isValid()) return false;
      // Use standard comparison: check if item date is after/same as start AND before/same as end
      return (itemStartDate.isAfter(startDate, 'day') || itemStartDate.isSame(startDate, 'day')) && 
             (itemStartDate.isBefore(endDate, 'day') || itemStartDate.isSame(endDate, 'day'));
    });
  };

  const filteredRows = getFilteredRows();

  // Helper to get month range for timeline display
  const getTimelineMonths = () => {
    if (filteredRows.length === 0) return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June'];
    
    let minMonth = 11, maxMonth = 0;
    filteredRows.forEach(item => {
      const startMonth = item.startDate ? dayjs(item.startDate).month() : 0;
      const endMonth = item.endDate ? dayjs(item.endDate).month() : 0;
      minMonth = Math.min(minMonth, startMonth);
      maxMonth = Math.max(maxMonth, endMonth);
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const range = maxMonth - minMonth + 1;
    if (range <= 0) return months.slice(0, 6);
    return months.slice(minMonth, minMonth + Math.min(range, 12));
  };

  const timelineMonths = getTimelineMonths();

  // PoC KPI Calculations - using filtered rows and auto-calculated delayed status
  const total = filteredRows.length;
  const completed = filteredRows.filter(r => String(r.status).toLowerCase() === 'completed').length;
  const delayed = filteredRows.filter(r => isDelayed(r)).length;
  const inProgress = filteredRows.filter(r => {
    const status = String(r.status).toLowerCase();
    return !isDelayed(r) && status !== 'completed' && ['execution','in progress','on track'].includes(status);
  }).length;

  // Get delayed and in progress PoC data
  const delayedRows = filteredRows.filter(r => isDelayed(r));
  const inProgressRows = filteredRows.filter(r => {
    const status = String(r.status).toLowerCase();
    return !isDelayed(r) && status !== 'completed' && ['execution','in progress','on track'].includes(status);
  });

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
    <Box sx={{ px: 0, py: 0 }}>
      {/* Header with Title */}
      <Box sx={{ mb: 5, pb: 3 }}>
        <Typography 
          sx={{ 
            fontWeight: 600, 
            color: '#7C3AED', 
            mb: 1.5, 
            fontSize: '0.875rem', 
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}
        >
          Dashboard Overview
        </Typography>
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 700, 
            color: '#0F172A', 
            fontSize: '2.5rem', 
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            mb: 0.5
          }}
        >
          Welcome back, {user?.name || 'Guest'}
        </Typography>
        <Typography 
          sx={{ 
            color: '#64748B', 
            fontSize: '1rem',
            fontWeight: 400
          }}
        >
          Here's what's happening with your projects today
        </Typography>
      </Box>

      {/* Tabs Section */}
      <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
        <UIButton
          onClick={() => setTabValue(0)}
          className={tabValue === 0 
            ? 'bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] text-white shadow-md hover:shadow-lg transition-all' 
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all'}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '0.9375rem',
            transition: 'all 0.2s ease'
          }}
        >
          PoC Status
        </UIButton>
        <UIButton
          onClick={() => setTabValue(1)}
          className={tabValue === 1 
            ? 'bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] text-white shadow-md hover:shadow-lg transition-all' 
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all'}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '0.9375rem',
            transition: 'all 0.2s ease'
          }}
        >
          Project Delivery Status
        </UIButton>
      </Box>

      <Box sx={{ background: 'transparent' }}>

        {/* TAB 1: PoC Status */}
        <Box sx={{ display: tabValue === 0 ? 'block' : 'none' }}>
          {/* Status Summary Section */}
          <Paper sx={{ 
            p: 5, 
            borderRadius: '20px', 
            background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
            color: '#fff',
            position: 'relative',
            mb: 4,
            boxShadow: '0 20px 60px rgba(124, 58, 237, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            overflow: 'hidden'
          }}>
            {/* Decorative background elements */}
            <Box sx={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              filter: 'blur(40px)'
            }} />
            <Box sx={{
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              filter: 'blur(30px)'
            }} />
            {/* Header with Dropdown */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, position: 'relative', zIndex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.01em' }}>Status Summary</Typography>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={timePeriod}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTimePeriod(value);
                    if (value === 'custom') {
                      setCustomDateDialogOpen(true);
                    }
                  }}
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
                bgcolor: 'rgba(255,255,255,0.2)',
                p: 0.5
              }}>
                {filteredRows.map((item, idx) => {
                  const status = String(item.status).toLowerCase();
                  let color = '#DC2626'; // red for delayed
                  
                  if (status === 'completed') {
                    color = '#FFFFFF'; // white for completed
                  } else if (isDelayed(item)) {
                    color = '#DC2626'; // red for delayed
                  } else if (['execution', 'in progress', 'on track'].includes(status)) {
                    color = '#FDE047'; // bright yellow for in progress
                  }
                  
                  const tooltipText = `${item.customer || item.title || 'N/A'}\nStatus: ${status}\nStart: ${formatDate(item.startDate)}\nEnd: ${formatDate(item.endDate)}`;
                  
                  return (
                    <Tooltip key={idx} title={tooltipText} arrow>
                      <Box 
                        sx={{ 
                          flex: 1,
                          bgcolor: color,
                          minWidth: '4px',
                          borderRadius: 1,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                            transform: 'scaleY(1.2)'
                          }
                        }} 
                      />
                    </Tooltip>
                  );
                })}
              </Box>
              {/* Legend */}
              <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#FFFFFF', border: '1px solid rgba(255,255,255,0.5)' }} />
                  <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>Complete</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#FDE047', border: '1px solid rgba(255,255,255,0.3)' }} />
                  <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>In-Progress</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#DC2626', border: '1px solid rgba(255,255,255,0.3)' }} />
                  <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>Delayed</Typography>
                </Box>
              </Box>
            </Box>

            {/* Stats Grid with Dividers */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', position: 'relative', zIndex: 1 }}>
              <Box sx={{ flex: 1, py: 1.5 }}>
                <Typography variant="caption" sx={{ opacity: 0.95, textTransform: 'uppercase', fontSize: '0.75rem', display: 'block', mb: 1, letterSpacing: '0.05em', fontWeight: 600 }}>Total PoCs</Typography>
                <Typography variant="h2" sx={{ fontWeight: 700, fontSize: '3rem', lineHeight: 1, letterSpacing: '-0.02em' }}>{total}</Typography>
              </Box>
              <Box sx={{ width: '1px', bgcolor: 'rgba(255,255,255,0.25)', mx: 3 }} />
              <Box sx={{ flex: 1, py: 1.5 }}>
                <Typography variant="caption" sx={{ opacity: 0.95, textTransform: 'uppercase', fontSize: '0.75rem', display: 'block', mb: 1, letterSpacing: '0.05em', fontWeight: 600 }}>Completed</Typography>
                <Typography variant="h2" sx={{ fontWeight: 700, fontSize: '3rem', lineHeight: 1, letterSpacing: '-0.02em' }}>{completed}</Typography>
              </Box>
              <Box sx={{ width: '1px', bgcolor: 'rgba(255,255,255,0.25)', mx: 3 }} />
              <Box sx={{ flex: 1, py: 1.5 }}>
                <Typography variant="caption" sx={{ opacity: 0.95, textTransform: 'uppercase', fontSize: '0.75rem', display: 'block', mb: 1, letterSpacing: '0.05em', fontWeight: 600 }}>In Progress</Typography>
                <Typography variant="h2" sx={{ fontWeight: 700, fontSize: '3rem', lineHeight: 1, letterSpacing: '-0.02em' }}>{inProgress}</Typography>
              </Box>
              <Box sx={{ width: '1px', bgcolor: 'rgba(255,255,255,0.25)', mx: 3 }} />
              <Box sx={{ flex: 1, py: 1.5 }}>
                <Typography variant="caption" sx={{ opacity: 0.95, textTransform: 'uppercase', fontSize: '0.75rem', display: 'block', mb: 1, letterSpacing: '0.05em', fontWeight: 600 }}>Delayed</Typography>
                <Typography variant="h2" sx={{ fontWeight: 700, fontSize: '3rem', lineHeight: 1, letterSpacing: '-0.02em' }}>{delayed}</Typography>
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
              <ArrowForwardIcon sx={{ color: '#7C3AED' }} />
            </IconButton>
          </Paper>

          {/* Two Column Layout - Important Blockers & PoC Timeline */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Important Blockers Section */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ 
                p: 4, 
                borderRadius: '16px', 
                background: '#ffffff',
                minHeight: 300,
                position: 'relative',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04)',
                border: '1px solid #E2E8F0',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(124, 58, 237, 0.1)',
                  transform: 'translateY(-2px)'
                }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box sx={{ 
                    width: 4, 
                    height: 24, 
                    borderRadius: '2px', 
                    background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)' 
                  }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '1.25rem', letterSpacing: '-0.01em' }}>Important Blockers</Typography>
                </Box>
                <Box sx={{ maxHeight: 230, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {rows.filter(r => r.currentBlockers && r.currentBlockers.trim()).slice(0, 3).map((item, idx) => (
                    <Box key={idx} sx={{ 
                      p: 3, 
                      bgcolor: '#F8FAFC', 
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: '#F1F5F9',
                        borderColor: '#CBD5E1',
                        transform: 'translateX(4px)'
                      }
                    }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: '#1F2937' }}>
                        Project Name: {item.customer || item.title || 'N/A'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#4B5563', display: 'block', mb: 1.5 }}>
                        Blockers: {item.currentBlockers}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', fontSize: '0.7rem' }}>
                            <strong>Start Date</strong>
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#1F2937', fontWeight: 600, fontSize: '0.75rem' }}>
                            {formatDate(item.startDate) || 'N/A'}\n                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', fontSize: '0.7rem' }}>
                            <strong>End Date</strong>
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#1F2937', fontWeight: 600, fontSize: '0.75rem' }}>
                            {formatDate(item.endDate) || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                  {rows.filter(r => r.currentBlockers && r.currentBlockers.trim()).length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
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
                    bgcolor: 'rgba(255,255,255,0.6)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' }
                  }}
                >
                  <ArrowForwardIcon sx={{ color: '#1F2937' }} />
                </IconButton>
              </Paper>
            </Grid>

            {/* PoC Timeline Section */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ 
                p: 4, 
                borderRadius: '16px', 
                background: '#ffffff',
                minHeight: 300,
                position: 'relative',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04)',
                border: '1px solid #E2E8F0',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(124, 58, 237, 0.1)',
                  transform: 'translateY(-2px)'
                }
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ 
                      width: 4, 
                      height: 24, 
                      borderRadius: '2px', 
                      background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)' 
                    }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '1.25rem', letterSpacing: '-0.01em' }}>PoC Timeline</Typography>
                  </Box>
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <Select
                      value={timePeriod}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTimePeriod(value);
                        if (value === 'custom') {
                          setCustomDateDialogOpen(true);
                        }
                      }}
                      sx={{
                        bgcolor: '#fff',
                        color: '#1F2937',
                        borderRadius: 1.5,
                        fontWeight: 400,
                        fontSize: '0.8rem',
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
                
                {/* Simple Timeline View */}
                <Box sx={{ position: 'relative', mt: 3, maxHeight: 350, overflow: 'auto', pr: 1,
                  '&::-webkit-scrollbar': { width: '6px' },
                  '&::-webkit-scrollbar-thumb': { 
                    bgcolor: 'rgba(0,0,0,0.2)',
                    borderRadius: '3px',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.3)' }
                  }
                }}>
                  {/* Calendar Grid Container */}
                  <Box sx={{ position: 'relative' }}>
                    {/* Vertical Date Lines */}
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                      {timelineMonths.map((month, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            position: 'absolute',
                            left: `${((idx + 1) / timelineMonths.length) * 100}%`,
                            top: 0,
                            bottom: 0,
                            width: '1px',
                            bgcolor: 'rgba(0, 0, 0, 0.08)',
                          }}
                        />
                      ))}
                    </Box>

                    {/* Month Labels - Dynamic based on filtered data */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, px: 1, position: 'relative', zIndex: 1 }}>
                      {timelineMonths.map((month, idx) => (
                        <Box key={idx} sx={{ flex: 1, textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#4B5563', fontSize: '0.75rem', fontWeight: 600 }}>
                            {month}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    {/* Timeline Bars - Show all filtered items */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, position: 'relative', zIndex: 2 }}>
                      {filteredRows.map((item, idx) => {
                        const startMonth = item.startDate ? dayjs(item.startDate).month() : 0;
                        const endMonth = item.endDate ? dayjs(item.endDate).month() : 5;
                        const leftPercent = (startMonth / 12) * 100;
                        const widthPercent = Math.max(((endMonth - startMonth + 1) / 12) * 100, 8);
                        
                        const colors = ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE', '#F5F3FF'];
                        const color = colors[idx % colors.length];
                        
                        const tooltipText = `${item.customer || item.title || 'N/A'}\nStart: ${formatDate(item.startDate)}\nEnd: ${formatDate(item.endDate)}\nStatus: ${item.status || 'N/A'}`;
                        
                        return (
                          <Tooltip key={idx} title={tooltipText} arrow>
                            <Box sx={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                              <Box sx={{
                                position: 'absolute',
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                                height: 24,
                                bgcolor: color,
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                px: 1,
                                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                  transform: 'scaleY(1.2)',
                                  zIndex: 10
                                }
                              }}>
                                <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, fontSize: '0.65rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {item.customer || item.title || `Project ${idx + 1}`}
                                </Typography>
                              </Box>
                            </Box>
                          </Tooltip>
                        );
                      })}
                      {filteredRows.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                          <Typography variant="body2" sx={{ color: '#6B7280' }}>No projects in this period</Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>

                <IconButton
                  onClick={() => navigate('/schedule')}
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                    bgcolor: 'rgba(255,255,255,0.6)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' }
                  }}
                >
                  <ArrowForwardIcon sx={{ color: '#1F2937' }} />
                </IconButton>
              </Paper>
            </Grid>
          </Grid>

          {/* Three Column Layout - Reminders, Delayed, In Progress */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {/* Reminders Section */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ 
                p: 0,
                borderRadius: '16px',
                minHeight: 350,
                position: 'relative',
                overflow: 'hidden',
                background: '#ffffff',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(124, 58, 237, 0.1)',
                  transform: 'translateY(-2px)'
                }
              }}>
                {/* Header */}
                <Box sx={{ 
                  background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
                  p: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', fontSize: '1.125rem', letterSpacing: '-0.01em' }}>Reminders</Typography>
                  <Typography sx={{ color: '#fff', fontSize: '1.2rem' }}>⏰</Typography>
                </Box>

                {/* Content */}
                <Box sx={{ 
                  p: 3, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 2,
                  maxHeight: 280,
                  overflow: 'auto',
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    bgcolor: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: 'rgba(0,0,0,0.15)',
                    borderRadius: '3px',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.25)',
                    }
                  }
                }}>
                  {rows.filter(r => r.currentBlockers && r.currentBlockers.trim()).map((item, idx) => (
                    <Box key={idx} sx={{ 
                      p: 2.5,
                      bgcolor: '#F8FAFC',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: '#F1F5F9',
                        borderColor: '#CBD5E1'
                      }
                    }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: '#1F2937' }}>
                        Project Name: {item.customer || item.title || 'N/A'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#4B5563', display: 'block', mb: 1 }}>
                        Blockers: {item.currentBlockers}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6B7280', display: 'block' }}>
                        Due Date: {formatDate(item.endDate) || 'N/A'}
                      </Typography>
                    </Box>
                  ))}
                  {rows.filter(r => r.currentBlockers && r.currentBlockers.trim()).length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" sx={{ color: '#6B7280' }}>No reminders</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Delayed PoCs Section */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ 
                p: 4,
                borderRadius: '16px',
                minHeight: 350,
                background: '#ffffff',
                position: 'relative',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(124, 58, 237, 0.1)',
                  transform: 'translateY(-2px)'
                }
              }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box sx={{ 
                    width: 4, 
                    height: 24, 
                    borderRadius: '2px', 
                    background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)' 
                  }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '1.25rem', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 1 }}>
                    Delayed PoCs
                    <Typography sx={{ fontSize: '1.1rem' }}>⏱️</Typography>
                  </Typography>
                </Box>

                {/* Content */}
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 2,
                  maxHeight: 280,
                  overflow: 'auto',
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    bgcolor: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: 'rgba(0,0,0,0.2)',
                    borderRadius: '3px',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.3)',
                    }
                  }
                }}>
                  {delayedRows.map((item, idx) => (
                    <Box key={idx} sx={{ 
                      p: 3,
                      bgcolor: '#FEF2F2',
                      borderRadius: '12px',
                      border: '1px solid #FECACA',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: '#FEE2E2',
                        borderColor: '#FCA5A5',
                        transform: 'translateX(4px)'
                      }
                    }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: '#1F2937' }}>
                        Project Name: {item.customer || item.title || 'N/A'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#4B5563', display: 'block', mb: 1.5 }}>
                        Blockers: {item.currentBlockers || 'Next Milestone'}
                      </Typography>
                      {/* Progress Bar */}
                      <Box sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>Progress</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: '#D32F2F' }}>{item.percent || 0}%</Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={Number(item.percent) || 0} 
                          sx={{ 
                            height: 8, 
                            borderRadius: 4,
                            bgcolor: 'rgba(239, 68, 68, 0.1)',
                            '& .MuiLinearProgress-bar': { 
                              background: 'linear-gradient(90deg, #EF4444 0%, #F87171 100%)',
                              borderRadius: 4
                            }
                          }} 
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#6B7280', display: 'block' }}>
                        Due Date: {formatDate(item.endDate) || 'N/A'}
                      </Typography>
                    </Box>
                  ))}
                  {delayedRows.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" sx={{ color: '#6B7280' }}>No delayed PoCs</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* In Progress PoCs Section */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ 
                p: 4,
                borderRadius: '16px',
                minHeight: 350,
                background: '#ffffff',
                position: 'relative',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(124, 58, 237, 0.1)',
                  transform: 'translateY(-2px)'
                }
              }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box sx={{ 
                    width: 4, 
                    height: 24, 
                    borderRadius: '2px', 
                    background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)' 
                  }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '1.25rem', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 1 }}>
                    In Progress PoCs
                    <Typography sx={{ fontSize: '1.1rem' }}>⚙️</Typography>
                  </Typography>
                </Box>

                {/* Content */}
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 2,
                  maxHeight: 280,
                  overflow: 'auto',
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    bgcolor: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: 'rgba(255,255,255,0.4)',
                    borderRadius: '3px',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.6)',
                    }
                  }
                }}>
                  {inProgressRows.map((item, idx) => (
                    <Box key={idx} sx={{ 
                      p: 3,
                      bgcolor: '#F0F9FF',
                      borderRadius: '12px',
                      border: '1px solid #BAE6FD',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: '#E0F2FE',
                        borderColor: '#7DD3FC',
                        transform: 'translateX(4px)'
                      }
                    }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: '#1F2937' }}>
                        Project Name: {item.customer || item.title || 'N/A'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#4B5563', display: 'block', mb: 1.5 }}>
                        Blockers: {item.currentBlockers || 'Next Milestone'}
                      </Typography>
                      {/* Progress Bar */}
                      <Box sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '0.75rem' }}>Progress</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: '#7C3AED' }}>{item.percent || 0}%</Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={Number(item.percent) || 0} 
                          sx={{ 
                            height: 8, 
                            borderRadius: 4,
                            bgcolor: 'rgba(124, 58, 237, 0.1)',
                            '& .MuiLinearProgress-bar': { 
                              background: 'linear-gradient(90deg, #7C3AED 0%, #8B5CF6 100%)',
                              borderRadius: 4
                            }
                          }} 
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#6B7280', display: 'block' }}>
                        Due Date: {formatDate(item.endDate) || 'N/A'}
                      </Typography>
                    </Box>
                  ))}
                  {inProgressRows.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" sx={{ color: '#6B7280' }}>No PoCs in progress</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* TAB 2: Project Delivery Status */}
        <Box sx={{ display: tabValue === 1 ? 'block' : 'none', p: 3 }}>

          {/* Overall Jira Projects Metrics (Delivery Projects Only) */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{ 
                width: 4, 
                height: 24, 
                borderRadius: '2px', 
                background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)' 
              }} />
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '1.5rem', letterSpacing: '-0.01em' }}>
                Delivery Projects Overview
              </Typography>
            </Box>
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
          </Box>

          {/* Project Details Cards */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, mt: 5 }}>
            <Box sx={{ 
              width: 4, 
              height: 24, 
              borderRadius: '2px', 
              background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)' 
            }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '1.5rem', letterSpacing: '-0.01em' }}>
              Project Details
            </Typography>
          </Box>
          
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {/* In Progress Projects */}
            {inProgressProjectsData.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ 
                  p: 4, 
                  borderRadius: '16px', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
                  border: '1px solid #E2E8F0',
                  background: '#ffffff',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(124, 58, 237, 0.1)',
                    transform: 'translateY(-2px)'
                  }
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <Box sx={{ 
                      width: 4, 
                      height: 24, 
                      borderRadius: '2px', 
                      background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)' 
                    }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '1.25rem', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HourglassEmptyIcon sx={{ fontSize: '1.25rem', color: '#3B82F6' }} /> In Progress Projects ({inProgressProjectsData.length})
                    </Typography>
                  </Box>
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {inProgressProjectsData.slice(0, 5).map((project, idx) => (
                      <Box key={idx} sx={{ 
                        p: 3, 
                        mb: 2, 
                        bgcolor: '#F0F9FF', 
                        borderRadius: '12px', 
                        border: '1px solid #BAE6FD',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: '#E0F2FE',
                          borderColor: '#7DD3FC',
                          transform: 'translateX(4px)'
                        }
                      }}>
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
                <Paper sx={{ 
                  p: 4, 
                  borderRadius: '16px', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
                  border: '1px solid #E2E8F0',
                  background: '#ffffff',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(239, 68, 68, 0.1)',
                    transform: 'translateY(-2px)'
                  }
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <Box sx={{ 
                      width: 4, 
                      height: 24, 
                      borderRadius: '2px', 
                      background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)' 
                    }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '1.25rem', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CancelOutlinedIcon sx={{ fontSize: '1.25rem', color: '#F59E0B' }} /> Delayed Projects ({delayedProjectsData.length})
                    </Typography>
                  </Box>
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {delayedProjectsData.slice(0, 5).map((project, idx) => (
                      <Box key={idx} sx={{ 
                        p: 3, 
                        mb: 2, 
                        bgcolor: '#FEF3C7', 
                        borderRadius: '12px', 
                        border: '1px solid #FDE68A',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: '#FDE68A',
                          borderColor: '#FCD34D',
                          transform: 'translateX(4px)'
                        }
                      }}>
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
      </Box>

      {/* Custom Date Range Dialog */}
      <Dialog 
        open={customDateDialogOpen} 
        onClose={() => setCustomDateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'var(--text-dark)' }}>
          Select Custom Date Range
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': { borderColor: 'var(--primary-orange)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--primary-orange)' }
                }
              }}
            />
            <TextField
              label="End Date"
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: customStartDate }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': { borderColor: 'var(--primary-orange)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--primary-orange)' }
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <MUIButton 
            onClick={() => {
              setCustomDateDialogOpen(false);
              setTimePeriod('full timeline');
            }}
            sx={{ color: 'var(--text-light)' }}
          >
            Cancel
          </MUIButton>
          <UIButton 
            onClick={() => setCustomDateDialogOpen(false)}
            disabled={!customStartDate || !customEndDate}
            className={!customStartDate || !customEndDate ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' : 'bg-[var(--primary-orange)] text-white'}
          >
            Apply
          </UIButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
