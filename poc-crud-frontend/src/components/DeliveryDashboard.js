import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from '../auth/AuthProvider';
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography,
  IconButton, InputBase, Avatar, Box, Drawer, AppBar, Toolbar, List,
  ListItem, ListItemButton, ListItemIcon, ListItemText, Divider
} from '@mui/material';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WorkIcon from '@mui/icons-material/Work';
import BarChartIcon from '@mui/icons-material/BarChart';
import ViewListIcon from '@mui/icons-material/ViewList'; // For PoC Project List
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ExitToAppOutlinedIcon from '@mui/icons-material/ExitToAppOutlined';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';

const drawerWidth = 280;

const navItems = [
  { text: 'Home', icon: <DashboardIcon />, path: '/home' },
  { text: 'Schedule', icon: <CalendarTodayIcon />, path: '/schedule' },
  { text: 'Jira Projects', icon: <WorkIcon />, path: '/projects' },
  { text: 'PoC Delivery List', icon: <ViewListIcon />, path: '/poc-delivery-list' },
  { text: 'Report Dashboard', icon: <BarChartIcon />, path: '/reports' },
  { text: 'Documents', icon: <DescriptionOutlinedIcon />, path: '/documents' },
];

const toolsItems = [
  { text: 'Setting', icon: <SettingsOutlinedIcon />, path: '/settings' },
];

export default function DeliveryDashboard({ children }) {
  const auth = useAuth();
  const user = auth?.user;
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLogout = () => setLogoutOpen(true);
  const confirmLogout = async () => {
    setLogoutOpen(false);
    try {
      await auth.logout(true);
    } catch (e) {
      console.warn('Logout error', e);
    }
    navigate('/');
  };
  const cancelLogout = () => setLogoutOpen(false);

  const userProfilePic = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Crect width='50' height='50' fill='%23e0e0e0'/%3E%3C/svg%3E"; // Replace with actual user image URL

  const drawerContent = (
    <div>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, mb: 1 }}>
        {/* You can place a logo here if you have one */}
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--primary-orange)' }}>
          PoC Tracker
        </Typography>
      </Toolbar>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar src={userProfilePic} alt={user?.name || "User"} sx={{ width: 50, height: 50 }} />
        <Box>
          <Typography sx={{ fontWeight: 600, color: 'var(--text-dark)' }}>{user?.name || "Guest User"}</Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-light)' }}>Designer</Typography>
        </Box>
      </Box>
      <Divider sx={{ my: 1 }} />
      <List>
        <Typography variant="overline" sx={{ pl: 2, color: 'var(--text-light)', fontWeight: 600 }}>General</Typography>
        {navItems.map(({ text, icon, path }) => (
          <ListItem key={text} disablePadding>
            <ListItemButton
              component={NavLink}
              to={path}
              sx={{
                '&.active': {
                  backgroundColor: 'var(--active-bg)',
                  color: 'var(--active-text)',
                  '& .MuiSvgIcon-root': { color: 'var(--active-text)' },
                  borderLeft: '4px solid var(--active-text)'
                },
                borderRadius: 2,
                m: 1,
                borderLeft: '4px solid transparent',
                '&:hover': { backgroundColor: '#fafafa' }
              }}
            >
              <ListItemIcon sx={{ color: 'var(--text-light)' }}>{icon}</ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontWeight: 600 }} primary={text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider sx={{ my: 1 }} />
      <List>
        <Typography variant="overline" sx={{ pl: 2, color: 'var(--text-light)', fontWeight: 600 }}>Tools</Typography>
        {toolsItems.map(({ text, icon, path }) => (
          <ListItem key={text} disablePadding>
            <ListItemButton
              component={NavLink}
              to={path}
              sx={{
                '&.active': {
                  backgroundColor: 'var(--active-bg)',
                  color: 'var(--active-text)',
                  '& .MuiSvgIcon-root': { color: 'var(--active-text)' },
                },
                borderRadius: 2,
                m: 1,
              }}
            >
              <ListItemIcon sx={{ color: 'var(--text-light)' }}>{icon}</ListItemIcon>
              <ListItemText primary={text} />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, m: 1 }}>
            <ListItemIcon sx={{ color: 'var(--text-light)' }}><ExitToAppOutlinedIcon /></ListItemIcon>
            <ListItemText primary="Log Out" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'transparent' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'rgba(255,255,255,0.75)',
          backdropFilter: 'saturate(180%) blur(10px)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
          color: 'var(--text-dark)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: 72 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: 'var(--secondary-gray)',
              borderRadius: '12px',
              p: '10px 16px',
              border: '1px solid var(--border-color)',
              flexGrow: 1,
              maxWidth: 560,
            }}
          >
            <SearchIcon sx={{ color: 'var(--text-light)', mr: 1 }} />
            <InputBase
              placeholder="Search tasks, projects, teams..."
              inputProps={{ 'aria-label': 'search' }}
              sx={{ flex: 1, color: 'var(--text-dark)' }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton color="inherit"><AddCircleOutlineIcon /></IconButton>
            <IconButton color="inherit"><NotificationsNoneIcon /></IconButton>
            <Avatar src={userProfilePic} sx={{ width: 36, height: 36, ml: 1 }} />
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid var(--border-color)',
            bgcolor: 'var(--sidebar-bg)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.06)'
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 } }}>
        <Toolbar /> {/* Spacer for the AppBar */}
        {/* The content, like DataTable, gets rendered here, wrapped in a Paper/Box for styling */}
        <Box sx={{ bgcolor: 'var(--card-bg)', p: { xs: 2, md: 3 }, borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
          {children}
        </Box>
      </Box>

      <Dialog open={logoutOpen} onClose={cancelLogout}>
        <DialogTitle>Confirm logout</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to sign out?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelLogout}>Cancel</Button>
          <Button onClick={confirmLogout} autoFocus sx={{ color: 'var(--primary-orange)' }}>
            Sign out
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
