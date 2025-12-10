import React from 'react';
import { Box, Toolbar } from '@mui/material';
import TopNavigation from '../navigation/TopNavigation';

export default function DashboardLayout({ children }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'var(--page-bg)' }}>
      {/* Top Navigation Bar */}
      <TopNavigation />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          mt: '72px', // Height of AppBar
          overflow: 'auto',
        }}
      >
        {/* Content Container with responsive padding */}
        <Box
          sx={{
            maxWidth: '100%',
            mx: 'auto',
            bgcolor: 'var(--card-bg)',
            borderRadius: { xs: '12px', md: '16px' },
            boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
