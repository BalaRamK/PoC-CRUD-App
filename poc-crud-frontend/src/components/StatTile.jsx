import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

export default function StatTile({ icon, label, value, color = 'var(--primary-orange)', trend = null, onClick }) {
  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        bgcolor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
        '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: '0 12px 28px rgba(0,0,0,0.09)' } : undefined
      }}
      onClick={onClick}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 2,
          bgcolor: `${color}1A`, // ~10% alpha
          color
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--text-dark)' }}>
          {value}
        </Typography>
        {trend && (
          <Typography variant="caption" sx={{ mt: 0.25, display: 'inline-block', color: trend.delta >= 0 ? '#16a34a' : 'var(--primary-orange)', fontWeight: 600 }}>
            {trend.delta >= 0 ? `+${trend.delta}` : `${trend.delta}`} {trend.label || 'vs last week'}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
