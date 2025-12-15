import React from 'react';
import { Box, Paper, Typography, LinearProgress, Avatar, IconButton } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export default function DashboardTile({
  variant = 'light',
  title,
  subtitle,
  progress = 0,
  tasks = 0,
  daysRemain = null,
  avatars = [],
  trend = null, // { delta: +5, label: 'vs last week' }
  onMenuClick,
  onClick,
}) {
  const isPrimary = variant === 'primary';

  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 4,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: isPrimary ? undefined : 'var(--card-bg)',
        color: isPrimary ? '#fff' : 'var(--text-dark)',
        boxShadow: isPrimary ? '0 16px 40px rgba(240, 102, 73, 0.35)' : '0 8px 24px rgba(0,0,0,0.06)',
        border: isPrimary ? 'none' : '1px solid var(--border-color)',
        background: isPrimary
          ? 'linear-gradient(160deg, var(--primary-orange) 0%, var(--light-orange-1) 100%)'
          : 'linear-gradient(180deg, #FFFFFF 0%, #FBFBFD 100%)',
        minHeight: 180,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
        '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: isPrimary ? '0 20px 48px rgba(240, 102, 73, 0.45)' : '0 12px 28px rgba(0,0,0,0.09)' } : undefined,
      }}
      onClick={onClick}
    >
      <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
        <IconButton size="small" onClick={onMenuClick} sx={{ color: isPrimary ? '#fff' : 'var(--text-light)' }}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
        {title}
      </Typography>
      {subtitle && (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        {subtitle && (
          <Typography variant="body2" sx={{ opacity: isPrimary ? 0.95 : 0.8 }}>
            {subtitle}
          </Typography>
        )}
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: isPrimary ? '#fff' : (trend.delta >= 0 ? '#16a34a' : 'var(--primary-orange)') }}>
              {trend.delta >= 0 ? `+${trend.delta}` : `${trend.delta}`}
            </Typography>
            <Typography variant="caption" sx={{ opacity: isPrimary ? 0.85 : 0.7 }}>{trend.label || 'vs last week'}</Typography>
          </Box>
        )}
      </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isPrimary ? '#fff' : 'var(--primary-orange)' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {tasks} Task{tasks === 1 ? '' : 's'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ opacity: isPrimary ? 0.9 : 0.75 }}>Progress</Typography>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>{Math.round(progress)}%</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 10,
          borderRadius: 6,
          my: 0.75,
          bgcolor: isPrimary ? 'rgba(255,255,255,0.25)' : 'var(--secondary-gray)',
          '& .MuiLinearProgress-bar': {
            bgcolor: isPrimary ? '#fff' : 'var(--primary-orange)',
            borderRadius: 6,
          },
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {avatars.slice(0, 3).map((a, idx) => (
            <Avatar
              key={idx}
              sx={{
                width: 28,
                height: 28,
                ml: idx === 0 ? 0 : -1,
                border: '2px solid',
                borderColor: isPrimary ? 'var(--primary-orange)' : '#fff',
                bgcolor: isPrimary ? 'rgba(255,255,255,0.85)' : 'var(--secondary-gray)',
                color: 'var(--text-dark)',
                fontSize: '0.75rem',
              }}
            >
              {a?.[0]?.toUpperCase() || 'A'}
            </Avatar>
          ))}
        </Box>

        <Box
          sx={{
            px: 1.25,
            py: 0.5,
            borderRadius: 1.5,
            bgcolor: isPrimary ? 'rgba(255,255,255,0.25)' : 'var(--active-bg)',
            color: isPrimary ? '#fff' : 'var(--active-text)',
            fontWeight: 600,
            fontSize: '0.75rem',
          }}
        >
          {typeof daysRemain === 'number' ? `${daysRemain} Day${daysRemain === 1 ? '' : 's'} Remain` : '—'}
        </Box>
      </Box>
    </Paper>
  );
}
