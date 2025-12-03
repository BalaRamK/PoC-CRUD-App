import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, LinearProgress, IconButton, Avatar, FormControl, InputLabel, Select, MenuItem, Chip
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
  const [selectedJiraProject, setSelectedJiraProject] = useState('');
  const [jiraIssues, setJiraIssues] = useState([]);
  const [loadingJira, setLoadingJira] = useState(false);

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
        const keys = ["pocId", "customer", "title", "salesOwner", "deliveryLead", "startDate", "endDate", "phase", "status", "percent", "criteria", "milestones", "comments"];
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

  // Fetch Jira projects
  async function fetchJiraProjects() {
    try {
      const response = await axios.get('/api/jira/projects');
      if (response.data.success) {
        setJiraProjects(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedJiraProject(response.data.data[0].key);
        }
      }
    } catch (error) {
      console.error('Error fetching Jira projects:', error);
    }
  }

  useEffect(() => { 
    fetchRows(); 
    fetchJiraProjects(); 
  }, []);

  // Fetch Jira issues when project changes
  useEffect(() => {
    if (!selectedJiraProject) return;
    
    async function fetchJiraIssues() {
      try {
        setLoadingJira(true);
        const response = await axios.get(`/api/jira/project/${selectedJiraProject}/issues`);
        if (response.data.success) {
          setJiraIssues(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching Jira issues:', error);
      } finally {
        setLoadingJira(false);
      }
    }
    
    fetchJiraIssues();
  }, [selectedJiraProject]);

  // PoC KPI Calculations
  const total = rows.length;
  const completed = rows.filter(r => String(r.status).toLowerCase() === 'completed').length;
  const delayed = rows.filter(r => String(r.status).toLowerCase() === 'delayed').length;
  const inProgress = rows.filter(r => String(r.status).toLowerCase() === 'execution' || String(r.status).toLowerCase() === 'in progress' || String(r.status).toLowerCase() === 'on track').length;

  // Jira KPI Calculations
  const jiraTotalIssues = jiraIssues.length;
  const jiraEpics = jiraIssues.filter(i => i.type === 'Epic').length;
  const jiraTasks = jiraIssues.filter(i => i.type === 'Task' || i.type === 'Story').length;
  const jiraSubtasks = jiraIssues.filter(i => i.type === 'Subtask' || i.type === 'Sub-task').length;
  const jiraDone = jiraIssues.filter(i => String(i.status).toLowerCase() === 'done').length;
  const jiraInProgress = jiraIssues.filter(i => String(i.status).toLowerCase() === 'in progress').length;
  const jiraToDo = jiraIssues.filter(i => String(i.status).toLowerCase() === 'to do').length;
  const jiraBugs = jiraIssues.filter(i => i.type === 'Bug').length;

  // Tile helpers
  const getMinDaysRemainFromIssues = () => {
    const diffs = jiraIssues
      .map(i => (i.dueDate ? dayjs(i.dueDate) : null))
      .filter(d => d && d.isValid())
      .map(d => Math.max(0, d.diff(dayjs(), 'day')));
    return diffs.length ? Math.min(...diffs) : null;
  };

  const getMinDaysRemainFromPocs = () => {
    const diffs = rows
      .map(r => (r.endDate ? dayjs(r.endDate) : null))
      .filter(d => d && d.isValid())
      .map(d => Math.max(0, d.diff(dayjs(), 'day')));
    return diffs.length ? Math.min(...diffs) : null;
  };

  const jiraProgress = jiraTotalIssues > 0 ? Math.round((jiraDone / jiraTotalIssues) * 100) : 0;
  const jiraAvatars = Array.from(new Set(
    jiraIssues.map(i => i.assignee).filter(Boolean)
  )).slice(0, 3);
  const pocAvatars = Array.from(new Set(
    rows.map(r => r.deliveryLead).filter(Boolean)
  )).slice(0, 3);

  // Trend helpers (vs last week)
  const inWindow = (d, start, end) => d && d.isValid() && (d.isAfter(start) || d.isSame(start, 'day')) && (d.isBefore(end) || d.isSame(end, 'day'));
  const today = dayjs();
  const weekStart = today.subtract(6, 'day');
  const prevWeekStart = today.subtract(13, 'day');
  const prevWeekEnd = weekStart.subtract(1, 'day');

  const delta = (a, b) => a - b;

  const issuesCreatedIn = (start, end) => jiraIssues.filter(i => inWindow(dayjs(i.created), start, end)).length;
  const issuesDoneIn = (start, end) => jiraIssues.filter(i => String(i.status).toLowerCase() === 'done' && inWindow(dayjs(i.updated), start, end)).length;
  const issuesInProgressIn = (start, end) => jiraIssues.filter(i => String(i.status).toLowerCase() === 'in progress' && inWindow(dayjs(i.updated), start, end)).length;
  const bugsCreatedIn = (start, end) => jiraIssues.filter(i => i.type === 'Bug' && inWindow(dayjs(i.created), start, end)).length;

  const pocsStartedIn = (start, end) => rows.filter(r => inWindow(dayjs(r.startDate), start, end)).length;
  const pocsCompletedIn = (start, end) => rows.filter(r => String(r.status).toLowerCase() === 'completed' && inWindow(dayjs(r.endDate), start, end)).length;
  const pocsDelayedIn = (start, end) => rows.filter(r => String(r.status).toLowerCase() === 'delayed' && inWindow(dayjs(r.endDate), start, end)).length;
  const pocsInProgressIn = (start, end) => rows.filter(r => ['execution','in progress','on track'].includes(String(r.status).toLowerCase()) && inWindow(dayjs(r.startDate), start, end)).length;

  const trendTotalIssues = delta(issuesCreatedIn(weekStart, today), issuesCreatedIn(prevWeekStart, prevWeekEnd));
  const trendDone = delta(issuesDoneIn(weekStart, today), issuesDoneIn(prevWeekStart, prevWeekEnd));
  const trendInProgress = delta(issuesInProgressIn(weekStart, today), issuesInProgressIn(prevWeekStart, prevWeekEnd));
  const trendBugs = delta(bugsCreatedIn(weekStart, today), bugsCreatedIn(prevWeekStart, prevWeekEnd));

  const trendTotalPocs = delta(pocsStartedIn(weekStart, today), pocsStartedIn(prevWeekStart, prevWeekEnd));
  const trendCompletedPocs = delta(pocsCompletedIn(weekStart, today), pocsCompletedIn(prevWeekStart, prevWeekEnd));
  const trendDelayedPocs = delta(pocsDelayedIn(weekStart, today), pocsDelayedIn(prevWeekStart, prevWeekEnd));
  const trendInProgressPocs = delta(pocsInProgressIn(weekStart, today), pocsInProgressIn(prevWeekStart, prevWeekEnd));

  // Overall Progress Bar Calculation (e.g., average completion of all PoCs)
  const averageCompletion = total > 0 ? (rows.reduce((sum, r) => sum + (Number(r.percent) || 0), 0) / total) : 0;
  const pocProgress = total > 0 ? Math.round((completed / total) * 100) : 0;


  return (
    <Box>
      {/* Header with Project Selector */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text-dark)', mb: 0.5 }}>Dashboard Overview</Typography>
          <Typography variant="body2" color="text.secondary">Track Jira projects and PoC delivery metrics</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 250 }}>
          <InputLabel id="jira-project-select">Select Jira Project</InputLabel>
          <Select
            labelId="jira-project-select"
            value={selectedJiraProject}
            label="Select Jira Project"
            onChange={(e) => setSelectedJiraProject(e.target.value)}
            sx={{ bgcolor: 'white', borderRadius: 2 }}
          >
            {jiraProjects.map(project => (
              <MenuItem key={project.key} value={project.key}>
                {project.name} ({project.key})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Highlights Tiles */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <DashboardTile
            variant="primary"
            title={`Jira Overview — ${selectedJiraProject || 'Project'}`}
            subtitle={`${jiraDone} done of ${jiraTotalIssues} issues/tasks`}
            progress={jiraProgress}
            tasks={jiraTotalIssues}
            daysRemain={getMinDaysRemainFromIssues()}
            avatars={jiraAvatars}
            trend={{ delta: trendDone, label: 'vs last week' }}
            onClick={() => navigate(`/projects?project=${encodeURIComponent(selectedJiraProject || '')}`)}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <DashboardTile
            variant="light"
            title="PoC Delivery"
            subtitle={`${completed} completed of ${total} PoCs`}
            progress={pocProgress}
            tasks={total}
            daysRemain={getMinDaysRemainFromPocs()}
            avatars={pocAvatars}
            trend={{ delta: trendCompletedPocs, label: 'vs last week' }}
            onClick={() => navigate('/poc-delivery-list')}
          />
        </Grid>
      </Grid>

      {/* Jira KPI Tiles */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <WorkIcon sx={{ color: '#7c3aed' }} /> Jira Project Metrics
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatTile icon={<WorkIcon />} label="Total Issues" value={jiraTotalIssues} color="#7c3aed" trend={{ delta: trendTotalIssues }} onClick={() => navigate(`/projects?project=${encodeURIComponent(selectedJiraProject || '')}`)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatTile icon={<CheckCircleOutlineIcon />} label="Done" value={jiraDone} color="#22C55E" trend={{ delta: trendDone }} onClick={() => navigate(`/projects?project=${encodeURIComponent(selectedJiraProject || '')}&status=Done`)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatTile icon={<HourglassEmptyIcon />} label="In Progress" value={jiraInProgress} color="#2563EB" trend={{ delta: trendInProgress }} onClick={() => navigate(`/projects?project=${encodeURIComponent(selectedJiraProject || '')}&status=In%20Progress`)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatTile icon={<BugReportIcon />} label="Bugs" value={jiraBugs} color="#EF4444" trend={{ delta: trendBugs }} onClick={() => navigate(`/projects?project=${encodeURIComponent(selectedJiraProject || '')}&type=Bug`)} />
        </Grid>
      </Grid>

      {/* Jira Issue Type Breakdown */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3, boxShadow: '0 8px 28px rgba(0,0,0,0.07)', background: 'linear-gradient(135deg, #fff 0%, #f8f9ff 100%)' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--text-dark)', mb: 3 }}>Issue Type Breakdown</Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ p: 2.5, borderRadius: 2, textAlign: 'center', bgcolor: '#faf5ff', border: '2px solid #7c3aed' }}>
              <Chip label="Epics" size="small" sx={{ bgcolor: '#7c3aed', color: 'white', fontWeight: 600, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#7c3aed' }}>{jiraEpics}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ p: 2.5, borderRadius: 2, textAlign: 'center', bgcolor: '#eff6ff', border: '2px solid #3b82f6' }}>
              <Chip label="Tasks/Stories" size="small" sx={{ bgcolor: '#3b82f6', color: 'white', fontWeight: 600, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#3b82f6' }}>{jiraTasks}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ p: 2.5, borderRadius: 2, textAlign: 'center', bgcolor: '#f8fafc', border: '2px solid #64748b' }}>
              <Chip label="Subtasks" size="small" sx={{ bgcolor: '#64748b', color: 'white', fontWeight: 600, mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#64748b' }}>{jiraSubtasks}</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* PoC KPI Tiles */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <DnsIcon sx={{ color: 'var(--primary-orange)' }} /> PoC Delivery Metrics
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
    </Box>
  );
}
