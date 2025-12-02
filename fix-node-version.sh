#!/bin/bash

# Quick Fix for Node.js Version Issue
# Run this on your VM if npm install fails

echo "========================================="
echo "Fixing Node.js Version Issue"
echo "========================================="

# Check current Node.js version
echo "Current Node.js version:"
node --version

# Remove old Node.js
echo ""
echo "Removing old Node.js installation..."
sudo apt remove -y nodejs
sudo apt autoremove -y

# Install Node.js 20 LTS
echo ""
echo "Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
echo ""
echo "New Node.js version:"
node --version
npm --version

# Clean and reinstall backend dependencies
echo ""
echo "Cleaning backend dependencies..."
cd /opt/poc-tracker-backend
rm -rf node_modules package-lock.json
npm cache clean --force

echo ""
echo "Reinstalling backend dependencies..."
npm install --production

echo ""
echo "========================================="
echo "Fix Complete!"
echo "========================================="
echo ""
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo ""
echo "You can now start the backend:"
echo "  cd /opt/poc-tracker-backend"
echo "  pm2 start server.js --name poc-tracker-api"
