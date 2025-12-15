import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Grid, FormControl, InputLabel, Select, MenuItem,
  TextField, Button, Chip, Divider, Switch, FormControlLabel, Alert,
  RadioGroup, Radio, Card, CardContent, IconButton, Stepper, Step, StepLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EmailIcon from '@mui/icons-material/Email';
import DownloadIcon from '@mui/icons-material/Download';
import TableChartIcon from '@mui/icons-material/TableChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import axios from 'axios';

export default function Schedule() {
  // Step navigation
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Data Source', 'Visualization', 'Filters', 'Schedule & Export'];

  // Data source configuration
  const [dataSource, setDataSource] = useState('poc'); // 'poc' or 'jira'
  const [jiraProjects, setJiraProjects] = useState([]);
  const [selectedJiraProject, setSelectedJiraProject] = useState('');

  // Visualization configuration
  const [visualizationType, setVisualizationType] = useState('table'); // 'table', 'bar', 'pie', 'line'
  
  // Filter configuration
  const [filters, setFilters] = useState([]);
  const [availableFilters, setAvailableFilters] = useState({
    poc: ['status', 'deliveryLead', 'salesOwner', 'phase', 'customer'],
    jira: ['status', 'type', 'assignee', 'priority']
  });

  // Schedule configuration
  const [deliveryMethod, setDeliveryMethod] = useState('download'); // 'download' or 'email'
  const [emailRecipients, setEmailRecipients] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('daily'); // 'daily', 'weekly', 'monthly'
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState('monday');
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState('1');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  
  // Report configuration
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Fetch Jira projects on mount
  useEffect(() => {
    async function fetchJiraProjects() {
      try {
        const response = await axios.get('/api/jira/projects');
        if (response.data.success) {
          setJiraProjects(response.data.data);
          if (response.data.data.length > 0) {
            setSelectedJiraProject(response.data.data[0].key);
          }
        }
      } catch (err) {
        console.error('Error fetching Jira projects:', err);
      }
    }
    fetchJiraProjects();
  }, []);

  const handleAddFilter = () => {
    setFilters([...filters, { field: '', operator: 'equals', value: '' }]);
  };

  const handleRemoveFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleFilterChange = (index, key, value) => {
    const updated = [...filters];
    updated[index][key] = value;
    setFilters(updated);
  };

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        reportName: reportName || `${dataSource.toUpperCase()} Report`,
        reportDescription,
        dataSource,
        jiraProject: dataSource === 'jira' ? selectedJiraProject : null,
        visualizationType,
        filters,
        deliveryMethod,
        emailRecipients: deliveryMethod === 'email' ? emailRecipients.split(',').map(e => e.trim()) : [],
        scheduleEnabled,
        scheduleFrequency: scheduleEnabled ? scheduleFrequency : null,
        scheduleDayOfWeek: scheduleEnabled && scheduleFrequency === 'weekly' ? scheduleDayOfWeek : null,
        scheduleDayOfMonth: scheduleEnabled && scheduleFrequency === 'monthly' ? scheduleDayOfMonth : null,
        scheduleTime: scheduleEnabled ? scheduleTime : null,
        createdAt: new Date().toISOString()
      };

      // Call backend API to save scheduled report
      const response = await axios.post('/api/reports/scheduled', payload);
      
      if (response.data.success) {
        console.log('Report Configuration Saved:', response.data.data);
        setSuccess(true);
      } else {
        throw new Error(response.data.message || 'Failed to save report configuration');
      }
      
      // If download is selected and not scheduled, trigger immediate export
      if (deliveryMethod === 'download' && !scheduleEnabled) {
        handleImmediateExport(payload);
      }
    } catch (err) {
      console.error('Error creating report:', err);
      setError(err.message || 'Failed to create report configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleImmediateExport = async (config) => {
    try {
      // Fetch data based on configuration
      let data = [];
      if (config.dataSource === 'poc') {
        const response = await axios.get('/api/items');
        data = response.data?.data || [];
      } else if (config.dataSource === 'jira') {
        const response = await axios.get(`/api/jira/project/${config.jiraProject}/issues`);
        data = response.data?.data || [];
      }

      // Apply filters
      let filtered = data;
      config.filters.forEach(filter => {
        if (filter.field && filter.value) {
          filtered = filtered.filter(item => {
            const itemValue = String(item[filter.field] || '').toLowerCase();
            const filterValue = String(filter.value).toLowerCase();
            
            switch (filter.operator) {
              case 'equals':
                return itemValue === filterValue;
              case 'contains':
                return itemValue.includes(filterValue);
              case 'starts_with':
                return itemValue.startsWith(filterValue);
              default:
                return true;
            }
          });
        }
      });

      // Export as CSV
      if (filtered.length > 0) {
        const headers = Object.keys(filtered[0]);
        const csvContent = [
          headers.join(','),
          ...filtered.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${config.reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Failed to export data');
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Select Data Source</Typography>
            <FormControl component="fieldset">
              <RadioGroup value={dataSource} onChange={(e) => setDataSource(e.target.value)}>
                <Card sx={{ mb: 2, border: dataSource === 'poc' ? '2px solid var(--primary-orange)' : '1px solid var(--border-color)' }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControlLabel value="poc" control={<Radio />} label="" sx={{ m: 0 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>PoC Delivery Data</Typography>
                      <Typography variant="body2" color="text.secondary">Export PoC delivery tracking data from Excel</Typography>
                    </Box>
                    <TableChartIcon sx={{ color: 'var(--primary-orange)', fontSize: 40 }} />
                  </CardContent>
                </Card>
                
                <Card sx={{ border: dataSource === 'jira' ? '2px solid var(--primary-orange)' : '1px solid var(--border-color)' }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControlLabel value="jira" control={<Radio />} label="" sx={{ m: 0 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Jira Project Data</Typography>
                      <Typography variant="body2" color="text.secondary">Export issues from Jira projects</Typography>
                    </Box>
                    <WorkIcon sx={{ color: 'var(--primary-orange)', fontSize: 40 }} />
                  </CardContent>
                </Card>
              </RadioGroup>
            </FormControl>

            {dataSource === 'jira' && (
              <Box sx={{ mt: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Select Jira Project</InputLabel>
                  <Select
                    value={selectedJiraProject}
                    label="Select Jira Project"
                    onChange={(e) => setSelectedJiraProject(e.target.value)}
                  >
                    {jiraProjects.map(project => (
                      <MenuItem key={project.key} value={project.key}>
                        {project.name} ({project.key})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Choose Visualization Type</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  onClick={() => setVisualizationType('table')}
                  sx={{ 
                    cursor: 'pointer', 
                    border: visualizationType === 'table' ? '2px solid var(--primary-orange)' : '1px solid var(--border-color)',
                    '&:hover': { boxShadow: 3 }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <TableChartIcon sx={{ fontSize: 48, color: visualizationType === 'table' ? 'var(--primary-orange)' : 'text.secondary', mb: 1 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Table</Typography>
                    <Typography variant="body2" color="text.secondary">Detailed data table</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  onClick={() => setVisualizationType('bar')}
                  sx={{ 
                    cursor: 'pointer', 
                    border: visualizationType === 'bar' ? '2px solid var(--primary-orange)' : '1px solid var(--border-color)',
                    '&:hover': { boxShadow: 3 }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <BarChartIcon sx={{ fontSize: 48, color: visualizationType === 'bar' ? 'var(--primary-orange)' : 'text.secondary', mb: 1 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Bar Chart</Typography>
                    <Typography variant="body2" color="text.secondary">Compare categories</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  onClick={() => setVisualizationType('pie')}
                  sx={{ 
                    cursor: 'pointer', 
                    border: visualizationType === 'pie' ? '2px solid var(--primary-orange)' : '1px solid var(--border-color)',
                    '&:hover': { boxShadow: 3 }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <PieChartIcon sx={{ fontSize: 48, color: visualizationType === 'pie' ? 'var(--primary-orange)' : 'text.secondary', mb: 1 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Pie Chart</Typography>
                    <Typography variant="body2" color="text.secondary">Show distribution</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  onClick={() => setVisualizationType('line')}
                  sx={{ 
                    cursor: 'pointer', 
                    border: visualizationType === 'line' ? '2px solid var(--primary-orange)' : '1px solid var(--border-color)',
                    '&:hover': { boxShadow: 3 }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <BarChartIcon sx={{ fontSize: 48, color: visualizationType === 'line' ? 'var(--primary-orange)' : 'text.secondary', mb: 1, transform: 'rotate(90deg)' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Line Chart</Typography>
                    <Typography variant="body2" color="text.secondary">Track trends</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Configure Filters</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add filters to refine the data included in your report
            </Typography>

            {filters.map((filter, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Field</InputLabel>
                      <Select
                        value={filter.field}
                        label="Field"
                        onChange={(e) => handleFilterChange(index, 'field', e.target.value)}
                      >
                        {availableFilters[dataSource].map(field => (
                          <MenuItem key={field} value={field}>{field.charAt(0).toUpperCase() + field.slice(1)}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Operator</InputLabel>
                      <Select
                        value={filter.operator}
                        label="Operator"
                        onChange={(e) => handleFilterChange(index, 'operator', e.target.value)}
                      >
                        <MenuItem value="equals">Equals</MenuItem>
                        <MenuItem value="contains">Contains</MenuItem>
                        <MenuItem value="starts_with">Starts With</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Value"
                      value={filter.value}
                      onChange={(e) => handleFilterChange(index, 'value', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={1}>
                    <IconButton onClick={() => handleRemoveFilter(index)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </Paper>
            ))}

            <Button
              startIcon={<AddIcon />}
              onClick={handleAddFilter}
              variant="outlined"
              sx={{ mt: 1 }}
            >
              Add Filter
            </Button>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Schedule & Export Options</Typography>
            
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'var(--card-bg)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Report Details</Typography>
              <TextField
                fullWidth
                label="Report Name"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder={`${dataSource.toUpperCase()} Report`}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description (Optional)"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
              />
            </Paper>

            <Paper sx={{ p: 3, mb: 3, bgcolor: 'var(--card-bg)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Delivery Method</Typography>
              <FormControl component="fieldset">
                <RadioGroup value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)}>
                  <FormControlLabel 
                    value="download" 
                    control={<Radio />} 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DownloadIcon />
                        <Typography>Download (CSV)</Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel 
                    value="email" 
                    control={<Radio />} 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EmailIcon />
                        <Typography>Email</Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>

              {deliveryMethod === 'email' && (
                <TextField
                  fullWidth
                  label="Email Recipients"
                  placeholder="email1@example.com, email2@example.com"
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  sx={{ mt: 2 }}
                  helperText="Separate multiple emails with commas"
                />
              )}
            </Paper>

            <Paper sx={{ p: 3, bgcolor: 'var(--card-bg)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Schedule Report</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={scheduleEnabled}
                      onChange={(e) => setScheduleEnabled(e.target.checked)}
                    />
                  }
                  label={scheduleEnabled ? "Enabled" : "Disabled"}
                />
              </Box>

              {scheduleEnabled && (
                <Box>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Frequency</InputLabel>
                    <Select
                      value={scheduleFrequency}
                      label="Frequency"
                      onChange={(e) => setScheduleFrequency(e.target.value)}
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>

                  {scheduleFrequency === 'weekly' && (
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Day of Week</InputLabel>
                      <Select
                        value={scheduleDayOfWeek}
                        label="Day of Week"
                        onChange={(e) => setScheduleDayOfWeek(e.target.value)}
                      >
                        <MenuItem value="monday">Monday</MenuItem>
                        <MenuItem value="tuesday">Tuesday</MenuItem>
                        <MenuItem value="wednesday">Wednesday</MenuItem>
                        <MenuItem value="thursday">Thursday</MenuItem>
                        <MenuItem value="friday">Friday</MenuItem>
                        <MenuItem value="saturday">Saturday</MenuItem>
                        <MenuItem value="sunday">Sunday</MenuItem>
                      </Select>
                    </FormControl>
                  )}

                  {scheduleFrequency === 'monthly' && (
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Day of Month</InputLabel>
                      <Select
                        value={scheduleDayOfMonth}
                        label="Day of Month"
                        onChange={(e) => setScheduleDayOfMonth(e.target.value)}
                      >
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                          <MenuItem key={day} value={String(day)}>{day}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  <TextField
                    fullWidth
                    type="time"
                    label="Time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              )}
            </Paper>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text-dark)', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon sx={{ color: 'var(--primary-orange)' }} />
          Schedule Reports
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure and schedule automated dashboard exports
        </Typography>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(false)}>
          {scheduleEnabled 
            ? `Report scheduled successfully! You will receive reports ${scheduleFrequency}.`
            : deliveryMethod === 'email'
            ? 'Report configuration saved! Email will be sent shortly.'
            : 'Report exported successfully!'}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 4, borderRadius: 3, boxShadow: 'var(--shadow-light)' }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 400 }}>
          {renderStepContent()}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={scheduleEnabled ? <ScheduleIcon /> : deliveryMethod === 'email' ? <EmailIcon /> : <DownloadIcon />}
                sx={{ 
                  bgcolor: 'var(--primary-orange)', 
                  '&:hover': { bgcolor: var(--active-bg) }
                }}
              >
                {loading ? 'Processing...' : scheduleEnabled ? 'Schedule Report' : deliveryMethod === 'email' ? 'Send Report' : 'Export Now'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                sx={{ 
                  bgcolor: 'var(--primary-orange)', 
                  '&:hover': { bgcolor: var(--active-bg) }
                }}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

// Import WorkIcon for Jira card
import WorkIcon from '@mui/icons-material/Work';
