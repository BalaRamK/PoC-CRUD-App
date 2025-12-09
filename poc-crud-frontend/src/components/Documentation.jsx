import React from 'react';
import { Box, Typography, Container, Card, CardContent, CardActionArea } from '@mui/material';
import { Description, Security, VpnKey } from '@mui/icons-material';
import './Documentation.css';

export default function Documentation() {
  const documentationLinks = [
    {
      title: 'QConnect',
      description: 'Dive into QConnect VPN setup, client management, and integration workflows designed for IT teams and system administrators.',
      icon: <VpnKey sx={{ fontSize: 40 }} />,
      color: '#e8d4f8',
      url: '#' // Placeholder - will be updated later
    },
    {
      title: 'QShield',
      description: 'Dive into the QShield documentation—your guide to configuring, deploying, and managing quantum-safe security across platforms.',
      icon: <Security sx={{ fontSize: 40 }} />,
      color: '#fce4e4',
      url: '#' // Placeholder - will be updated later
    },
    {
      title: 'General Documentation',
      description: 'Access comprehensive guides, API references, and best practices for QNu Labs products and quantum-resilient solutions.',
      icon: <Description sx={{ fontSize: 40 }} />,
      color: '#e1f5f3',
      url: '#' // Placeholder - will be updated later
    }
  ];

  return (
    <Box className="documentation-root">
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* Logo Section */}
        <Box className="logo-section">
          {/* 
            Logo Placeholder: 
            Recommended size: 400px x 150px (width x height)
            Format: PNG with transparent background
            Place your logo image in: /public/images/qnu-logo.png
            Then uncomment the img tag below and remove the placeholder div
          */}

          <img 
            src="/images/qnu-logo.png" 
            alt="QNu Labs Logo" 
            className="company-logo"
          />
        </Box>

        {/* Header Section */}
        <Box sx={{ textAlign: 'center', mb: 6, mt: 4 }}>
          <Typography variant="h3" component="h1" sx={{ 
            fontWeight: 700, 
            mb: 2,
            color: '#2d3748',
            fontSize: { xs: '2rem', md: '2.5rem' }
          }}>
            Product Documentation Home
          </Typography>
          <Typography variant="h5" component="h2" sx={{ 
            fontWeight: 400, 
            mb: 3,
            color: '#4a5568',
            fontSize: { xs: '1.25rem', md: '1.5rem' }
          }}>
            Welcome to QNu Product Documentation!
          </Typography>
          <Typography variant="body1" sx={{ 
            color: '#718096',
            maxWidth: '800px',
            mx: 'auto',
            lineHeight: 1.8,
            fontSize: '1.05rem'
          }}>
            Welcome to the QNu Labs Documentation Portal, your gateway to quantum-resilient setup guides,
            secure configuration workflows, and technical insights for users, IT teams, and cryptography
            experts.
          </Typography>
        </Box>

        {/* Documentation Cards */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 3,
          mt: 5
        }}>
          {documentationLinks.map((doc, index) => (
            <Card 
              key={index}
              className="doc-card"
              sx={{ 
                backgroundColor: doc.color,
                borderRadius: 3,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.15)'
                }
              }}
            >
              <CardActionArea 
                href={doc.url}
                sx={{ 
                  p: 4,
                  minHeight: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start'
                }}
              >
                <Box sx={{ mb: 2, color: '#6b46c1' }}>
                  {doc.icon}
                </Box>
                <Typography 
                  variant="h5" 
                  component="h3" 
                  sx={{ 
                    fontWeight: 700, 
                    mb: 2,
                    color: '#6b46c1',
                    textDecoration: 'underline',
                    textDecorationColor: '#6b46c1',
                    textDecorationThickness: '2px',
                    textUnderlineOffset: '4px'
                  }}
                >
                  {doc.title}
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: '#4a5568',
                    lineHeight: 1.6
                  }}
                >
                  {doc.description}
                </Typography>
              </CardActionArea>
            </Card>
          ))}
        </Box>

        {/* Footer note */}
        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Typography variant="body2" sx={{ color: '#a0aec0', fontStyle: 'italic' }}>
            Click on any section above to explore detailed documentation and guides
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
