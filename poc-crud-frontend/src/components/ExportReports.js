import React from 'react';
import { Button, Typography, Box } from '@mui/material';
import * as XLSX from 'xlsx';

// Sample data. In a real application, you would fetch this data.
const sampleData = [
  { id: 1, name: 'First Item', value: 100 },
  { id: 2, name: 'Second Item', value: 200 },
  { id: 3, name: 'Third Item', value: 300 },
  { id: 4, name: 'Fourth Item', value: 150 },
];

export default function ExportReports() {
  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, 'Report.xlsx');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Reports Dashboard
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleExport}
        >
          Export Data to Excel
        </Button>
      </Box>
    </Box>
  );
}
