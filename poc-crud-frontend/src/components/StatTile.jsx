import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

export default function StatTile({ icon, label, value, color = '#7C3AED', trend = null, onClick }) {
  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: 2.5,
        bgcolor: '#ffffff',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': onClick ? { 
          transform: 'translateY(-4px)', 
          boxShadow: '0 12px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(124, 58, 237, 0.1)',
          borderColor: '#CBD5E1'
        } : undefined
      }}
      onClick={onClick}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '14px',
          background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
          color: color,
          flexShrink: 0
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography 
          variant="subtitle2" 
          sx={{ 
            mb: 1, 
            color: '#64748B',
            fontSize: '0.8125rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          {label}
        </Typography>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700, 
            color: '#0F172A',
            fontSize: '2rem',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            mb: trend ? 0.5 : 0
          }}
        >
          {value}
        </Typography>
        {trend && (
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              color: trend.delta >= 0 ? '#10B981' : '#EF4444', 
              fontWeight: 600,
              fontSize: '0.75rem'
            }}
          >
            <span>{trend.delta >= 0 ? '↑' : '↓'}</span>
            {trend.delta >= 0 ? `+${trend.delta}` : `${trend.delta}`} {trend.label || 'vs last week'}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
