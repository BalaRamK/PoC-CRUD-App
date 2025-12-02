import React from 'react';
import { Button, Box } from '@mui/material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Export({ data, chartId, tableId }) {

  const handleExportCsv = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, 'data.xlsx');
  };

  const handleExportPng = () => {
    const chartElement = document.getElementById(chartId);
    if (chartElement) {
      html2canvas(chartElement).then((canvas) => {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'chart.png';
        link.click();
      });
    }
  };

  const handleExportPdf = () => {
    const tableElement = document.getElementById(tableId);
    const chartElement = document.getElementById(chartId);

    const pdf = new jsPDF();
    
    if (tableElement) {
      html2canvas(tableElement).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
        
        if (chartElement) {
          pdf.addPage();
          html2canvas(chartElement).then(chartCanvas => {
            const chartImgData = chartCanvas.toDataURL('image/png');
            pdf.addImage(chartImgData, 'PNG', 10, 10, 190, 0);
            pdf.save('dashboard.pdf');
          });
        } else {
          pdf.save('dashboard.pdf');
        }
      });
    } else if (chartElement) {
      html2canvas(chartElement).then(chartCanvas => {
        const chartImgData = chartCanvas.toDataURL('image/png');
        pdf.addImage(chartImgData, 'PNG', 10, 10, 190, 0);
        pdf.save('dashboard.pdf');
      });
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
      <Button variant="contained" onClick={handleExportCsv}>Export as CSV</Button>
      <Button variant="contained" onClick={handleExportPng}>Export Chart as PNG</Button>
      <Button variant="contained" onClick={handleExportPdf}>Export as PDF</Button>
    </Box>
  );
}
