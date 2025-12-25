import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  AppBar,
  Toolbar,
  Box,
  Button as MUIButton,
  IconButton,
  Typography,
  Divider,
  useMediaQuery,
  useTheme,
  Drawer,
} from '@mui/material';
import { Button as UIButton } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '../components/ui/dialog';

// Icons
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

const navItems = [
  { text: 'Home', path: '/home' },
  { text: 'Project Delivery', path: '/projects' },
  { text: 'PoC Delivery', path: '/poc-delivery-list' },
  { text: 'Documents', path: '/documents' },
  { text: 'Schedule Reports', path: '/schedule' },
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
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: '#ffffff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          color: 'var(--text-dark)',
          borderBottom: 'none',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: 64, px: { xs: 2, md: 4 } }}>
          {/* Logo with Tagline */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box 
              component="img" 
              src="/images/qnu-logo.png" 
              alt="QNu Labs" 
              sx={{ height: 40, width: 'auto', cursor: 'pointer' }}
              onClick={() => navigate('/home')}
            />
          </Box>

          {/* Desktop Navigation Menu */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flex: 1 }}>
              {navItems.map(({ text, path }) => (
                <UIButton
                  asChild
                  className="px-3 py-2 rounded-full text-sm font-medium hover:bg-primary-100 data-[state=active]:bg-[var(--primary-orange)] data-[state=active]:text-white"
                >
                  <NavLink to={path} className={({ isActive }) => isActive ? 'data-[state=active]' : ''}>
                    {text}
                  </NavLink>
                </UIButton>
              ))}
            </Box>
          )}

          {/* Right Side - Logout Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {!isMobile && (
              <UIButton
                onClick={handleLogout}
                variant="outline"
                className="border border-[var(--primary-orange)] text-[var(--primary-orange)] rounded-full"
              >
                Logout
              </UIButton>
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
            <MUIButton
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
            </MUIButton>
          ))}
          <Divider sx={{ my: 1 }} />
          <MUIButton
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
          </MUIButton>
        </Box>
      </Drawer>

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm logout</DialogTitle>
            <DialogDescription>Are you sure you want to sign out?</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <UIButton variant="outline" onClick={cancelLogout}>Cancel</UIButton>
            <UIButton onClick={confirmLogout} className="bg-[var(--primary-orange)] text-white">Sign out</UIButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
