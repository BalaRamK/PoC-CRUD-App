import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
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
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

const navItems = [
  { text: 'Home', path: '/home' },
  { text: 'Project Delivery', path: '/projects' },
  { text: 'PoC Delivery', path: '/poc-delivery-list' },
  { text: 'Documents', path: '/documents' },
  { text: 'Schedule', path: '/schedule' },
];

export default function TopNavigation() {
  const auth = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLogout = () => {
    setMobileMenuOpen(false);
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

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          color: 'var(--text-dark)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: 64, px: { xs: 2, md: 4 } }}>
          {/* Logo Only */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box 
              component="img" 
              src="/images/qnu-logo.png" 
              alt="QNu Labs" 
              sx={{ height: 36, width: 'auto', cursor: 'pointer' }}
            />
          </Box>

          {/* Desktop Navigation Menu */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flex: 1 }}>
              {navItems.map(({ text, path }) => (
                <Button
                  key={text}
                  component={NavLink}
                  to={path}
                  sx={{
                    color: 'var(--text-light)',
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    borderRadius: '6px',
                    px: 2,
                    py: 1,
                    '&.active': {
                      backgroundColor: 'var(--primary-orange)',
                      color: '#ffffff',
                      fontWeight: 600,
                    },
                    '&:hover': {
                      color: 'var(--text-dark)',
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  {text}
                </Button>
              ))}
            </Box>
          )}

          {/* Right Side - Logout Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {!isMobile && (
              <Button
                onClick={handleLogout}
                sx={{
                  color: 'var(--primary-orange)',
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  backgroundColor: 'transparent',
                  border: '1px solid var(--primary-orange)',
                  borderRadius: '4px',
                  px: 2,
                  py: 0.75,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'var(--active-bg)',
                    borderColor: 'var(--primary-orange)',
                  },
                }}
              >
                Log out
              </Button>
            )}

            {/* Mobile Menu Toggle */}
            {isMobile && (
              <IconButton
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                sx={{
                  color: '#666666',
                  '&:hover': { color: 'var(--text-dark)', backgroundColor: 'var(--secondary-gray)' },
                  borderRadius: '6px',
                }}
              >
                {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Menu Drawer */}
      <Drawer
        anchor="top"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            marginTop: '64px',
            borderRadius: 0,
            borderTop: '1px solid var(--border-color)',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {navItems.map(({ text, path }) => (
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
                px: 2,
                py: 1.5,
                borderRadius: '6px',
                color: 'var(--text-light)',
                textTransform: 'none',
                fontSize: '0.95rem',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                '&.active': {
                  color: 'var(--text-dark)',
                  fontWeight: 600,
                },
                '&:hover': {
                  backgroundColor: 'var(--secondary-gray)',
                  color: 'var(--text-dark)',
                },
              }}
            >
              {text}
            </Button>
          ))}
          <Divider sx={{ my: 1 }} />
          <Button
            fullWidth
            onClick={handleLogout}
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              px: 2,
              py: 1.5,
              borderRadius: '6px',
              color: '#ef4444',
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              '&:hover': { backgroundColor: '#fef2f2' },
            }}
          >
            Log out
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
