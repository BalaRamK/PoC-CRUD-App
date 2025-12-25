import React, { useMemo, useState } from 'react';
import { Box, Typography, Grid, Select, MenuItem, FormControl, InputLabel, Paper } from '@mui/material';
import { Card, CardContent } from './ui/card';
import DataTable from './DataTable';
import { BarChart, PieChart } from './Charts';
import Export from './Export';
import StatTile from './StatTile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import AssessmentIcon from '@mui/icons-material/Assessment';

const chartOptions = ['Bar Chart', 'Pie Chart'];
const dataOptions = ['status', 'deliveryLead', 'salesOwner', 'phase'];

export default function DynamicDashboard() {
  const [filteredData, setFilteredData] = useState([]);
  const [selectedChart, setSelectedChart] = useState(chartOptions[0]);
  const [selectedData, setSelectedData] = useState(dataOptions[0]);

  const handleFilteredDataChange = (data) => {
    setFilteredData(data);
  };

  const processChartData = () => {
    const counts = filteredData.reduce((acc, row) => {
      const key = row[selectedData] || 'N/A';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  };

  const chartData = processChartData();
  const summary = useMemo(() => {
    const total = filteredData.length;
    const statuses = filteredData.reduce((acc, r) => {
      const s = String(r.status || 'N/A');
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const done = (statuses['Done'] || 0) + (statuses['Completed'] || 0) + (statuses['done'] || 0) + (statuses['completed'] || 0);
    const inProg = (statuses['In Progress'] || 0) + (statuses['in progress'] || 0) + (statuses['In-Progress'] || 0);
    return { total, done, inProg };
  }, [filteredData]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Dynamic Dashboard
      </Typography>
      <Card className="mb-4">
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <StatTile icon={<AssessmentIcon />} label="Total Items" value={summary.total} color="#7c3aed" />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatTile icon={<HourglassBottomIcon />} label="In Progress" value={summary.inProg} color="#2563EB" />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatTile icon={<CheckCircleOutlineIcon />} label="Completed" value={summary.done} color="#22C55E" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Export data={filteredData} chartId="chart-container" tableId="table-container" />
        </Grid>
        <Grid item xs={12} id="table-container">
          <DataTable onFilteredDataChange={handleFilteredDataChange} />
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl>
              <InputLabel>Chart Type</InputLabel>
              <Select
                value={selectedChart}
                onChange={(e) => setSelectedChart(e.target.value)}
              >
                {chartOptions.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>Data</InputLabel>
              <Select
                value={selectedData}
                onChange={(e) => setSelectedData(e.target.value)}
              >
                {dataOptions.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Grid>
        <Grid item xs={12} id="chart-container">
          {selectedChart === 'Bar Chart' && <BarChart data={chartData} />}
          {selectedChart === 'Pie Chart' && <PieChart data={chartData} />}
        </Grid>
      </Grid>
    </Box>
  );
}
