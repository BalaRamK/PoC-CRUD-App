import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Avatar,
  InputBase,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Divider,
  useMediaQuery,
  useTheme,
  Drawer,
} from '@mui/material';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WorkIcon from '@mui/icons-material/Work';
import BarChartIcon from '@mui/icons-material/BarChart';
import ViewListIcon from '@mui/icons-material/ViewList';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ExitToAppOutlinedIcon from '@mui/icons-material/ExitToAppOutlined';

const navItems = [
  { text: 'Home', icon: <DashboardIcon />, path: '/home' },
  { text: 'Schedule', icon: <CalendarTodayIcon />, path: '/schedule' },
  { text: 'Jira Projects', icon: <WorkIcon />, path: '/projects' },
  { text: 'PoC Delivery', icon: <ViewListIcon />, path: '/poc-delivery-list' },
  { text: 'Reports', icon: <BarChartIcon />, path: '/reports' },
  { text: 'Documents', icon: <DescriptionOutlinedIcon />, path: '/documents' },
];

export default function TopNavigation() {
  const auth = useAuth();
  const user = auth?.user;
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleProfileMenuOpen = (e) => setProfileMenuAnchor(e.currentTarget);
  const handleProfileMenuClose = () => setProfileMenuAnchor(null);
  const handleLogout = () => {
    handleProfileMenuClose();
    setLogoutOpen(true);
  };

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
  const userProfilePic = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Crect width='50' height='50' fill='%23e0e0e0'/%3E%3C/svg%3E";

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'rgba(255,255,255,0.95)',
          backdropFilter: 'saturate(180%) blur(10px)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
          color: 'var(--text-dark)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: 72, px: { xs: 2, md: 4 } }}>
          {/* Logo & Brand */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: 'var(--primary-orange)', display: { xs: 'none', sm: 'block' } }}
            >
              PoC Tracker
            </Typography>
          </Box>

          {/* Desktop Navigation Menu */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 0.5, flex: 1, justifyContent: 'center', mx: 2 }}>
              {navItems.map(({ text, icon, path }) => (
                <Button
                  key={text}
                  component={NavLink}
                  to={path}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 1,
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    color: 'var(--text-light)',
                    transition: 'all 0.3s ease',
                    whiteSpace: 'nowrap',
                    '&.active': {
                      backgroundColor: 'var(--active-bg)',
                      color: 'var(--active-text)',
                      '& svg': { color: 'var(--active-text)' },
                    },
                    '&:hover': {
                      backgroundColor: '#f0f0f0',
                      color: 'var(--text-dark)',
                    },
                    '& svg': {
                      fontSize: '1.2rem',
                      transition: 'color 0.3s ease',
                    },
                  }}
                >
                  {icon}
                  {!isTablet && text}
                </Button>
              ))}
            </Box>
          )}

          {/* Search Bar - Desktop */}
          {!isMobile && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'var(--secondary-gray)',
                borderRadius: '12px',
                p: '8px 12px',
                border: '1px solid var(--border-color)',
                minWidth: 300,
                maxWidth: 400,
              }}
            >
              <SearchIcon sx={{ color: 'var(--text-light)', mr: 1, fontSize: '1.2rem' }} />
              <InputBase
                placeholder="Search..."
                inputProps={{ 'aria-label': 'search' }}
                sx={{ flex: 1, color: 'var(--text-dark)', '& input::placeholder': { opacity: 0.7 } }}
              />
            </Box>
          )}

          {/* Right Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 }, ml: { xs: 1, md: 2 } }}>
            {!isMobile && (
              <>
                <IconButton color="inherit" size="small">
                  <AddCircleOutlineIcon />
                </IconButton>
                <IconButton color="inherit" size="small">
                  <NotificationsNoneIcon />
                </IconButton>
              </>
            )}

            {/* Profile Menu */}
            <IconButton
              onClick={handleProfileMenuOpen}
              sx={{ p: 0.5 }}
            >
              <Avatar
                src={userProfilePic}
                alt={user?.name || 'User'}
                sx={{ width: 36, height: 36, cursor: 'pointer' }}
              />
            </IconButton>

            {/* Mobile Menu Toggle */}
            {isMobile && (
              <IconButton
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                color="inherit"
              >
                {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Profile Dropdown Menu */}
      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={handleProfileMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2, minWidth: 250 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar src={userProfilePic} alt={user?.name || 'User'} sx={{ width: 48, height: 48 }} />
            <Box>
              <Typography sx={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                {user?.name || 'Guest User'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-light)' }}>
                Designer
              </Typography>
            </Box>
          </Box>
        </Box>
        <Divider />
        <MenuItem component={NavLink} to="/settings" sx={{ display: 'flex', gap: 2 }}>
          <SettingsOutlinedIcon sx={{ fontSize: '1.2rem' }} />
          Settings
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ display: 'flex', gap: 2 }}>
          <ExitToAppOutlinedIcon sx={{ fontSize: '1.2rem' }} />
          Log Out
        </MenuItem>
      </Menu>

      {/* Mobile Menu Drawer */}
      <Drawer
        anchor="top"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            marginTop: '72px',
            borderRadius: 0,
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {navItems.map(({ text, icon, path }) => (
            <Button
              key={text}
              component={NavLink}
              to={path}
              onClick={() => setMobileMenuOpen(false)}
              fullWidth
              sx={{
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1.5,
                borderRadius: '8px',
                color: 'var(--text-dark)',
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                '&.active': {
                  backgroundColor: 'var(--active-bg)',
                  color: 'var(--active-text)',
                  '& svg': { color: 'var(--active-text)' },
                },
                '&:hover': {
                  backgroundColor: '#f0f0f0',
                },
                '& svg': {
                  fontSize: '1.3rem',
                },
              }}
            >
              {icon}
              {text}
            </Button>
          ))}
          <Divider sx={{ my: 1 }} />
          <Button
            component={NavLink}
            to="/settings"
            onClick={() => setMobileMenuOpen(false)}
            fullWidth
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: 2,
              px: 2,
              py: 1.5,
              borderRadius: '8px',
              color: 'var(--text-dark)',
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': { backgroundColor: '#f0f0f0' },
            }}
          >
            <SettingsOutlinedIcon />
            Settings
          </Button>
          <Button
            fullWidth
            onClick={handleLogout}
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: 2,
              px: 2,
              py: 1.5,
              borderRadius: '8px',
              color: '#ef4444',
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': { backgroundColor: '#ffe5e5' },
            }}
          >
            <ExitToAppOutlinedIcon />
            Log Out
          </Button>
        </Box>
      </Drawer>

      {/* Logout Confirmation Dialog */}
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
    </>
  );
}
