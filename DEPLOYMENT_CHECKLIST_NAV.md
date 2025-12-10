# Navigation Restructure - Deployment Checklist

## Pre-Deployment (Local)

- [ ] Run `npm install` to ensure all dependencies
- [ ] Run `npm start` to test locally
- [ ] Test navigation on desktop browser
- [ ] Test navigation on tablet view (DevTools)
- [ ] Test navigation on mobile view (DevTools)
- [ ] Verify all menu items are clickable
- [ ] Test profile dropdown menu
- [ ] Test logout confirmation dialog
- [ ] Test mobile hamburger menu
- [ ] Test search bar (should show on desktop)
- [ ] Verify no console errors

## Build & Package

```bash
# Clean old build
rm -rf build

# Build for production
npm run build

# Verify build succeeded
echo "Build complete"

# Create deployment package
Compress-Archive -Path build\* -DestinationPath frontend-build.zip -Force
```

- [ ] Build succeeds without errors
- [ ] `frontend-build.zip` created
- [ ] Build size is reasonable (< 5MB)

## Upload to VM

```powershell
# Upload the build
gcloud compute scp frontend-build.zip poc-tracker-vm:~/ --zone=us-central1-a
```

- [ ] File uploaded successfully
- [ ] No SSH/GCP errors

## Deploy on VM

```bash
# SSH into VM
gcloud compute ssh poc-tracker-vm --zone=us-central1-a

# Backup current version
sudo cp -r /var/www/poc-tracker /var/www/poc-tracker.backup-$(date +%Y%m%d)

# Remove old build
sudo rm -rf /var/www/poc-tracker/*

# Extract new build
cd ~
sudo unzip -o frontend-build.zip -d /var/www/poc-tracker/

# Set permissions
sudo chown -R www-data:www-data /var/www/poc-tracker/
sudo chmod -R 755 /var/www/poc-tracker/

# Reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# Verify
pm2 status
sudo systemctl status nginx
```

- [ ] Old version backed up
- [ ] New build extracted
- [ ] Permissions set correctly
- [ ] Nginx test passes
- [ ] Nginx reloaded
- [ ] PM2 shows "online" status
- [ ] Nginx status is "active (running)"

## Post-Deployment Testing

### Desktop Testing (> 1200px)
```
Visit: https://delivery-dashboard.qnulabs.com
```

- [ ] Page loads without errors
- [ ] Top navigation visible
- [ ] All menu items visible (Home, Schedule, Jira, PoC, Reports, Docs)
- [ ] Search bar visible and functional
- [ ] + button visible
- [ ] 🔔 (notifications) button visible
- [ ] Profile button (👤) visible
- [ ] Logo "PoC Tracker" visible
- [ ] Content area has full width
- [ ] No horizontal scrollbar

### Menu Navigation Testing
- [ ] Home - Dashboard loads correctly
- [ ] Schedule - Schedule page loads
- [ ] Jira Projects - Jira dashboard loads
- [ ] PoC Delivery - DataTable loads
- [ ] Reports - Reports dashboard loads
- [ ] Documents - Documentation page loads

### Profile Menu Testing
- [ ] Click profile button (👤)
- [ ] Dropdown menu appears
- [ ] User name displays correctly
- [ ] "Settings" option visible and clickable
- [ ] "Log Out" option visible and clickable
- [ ] Clicking "Log Out" shows confirmation dialog
- [ ] "Cancel" cancels logout
- [ ] "Sign out" performs logout and redirects to login

### Tablet Testing (600-1200px)
```
Chrome DevTools: iPad view
```

- [ ] Top navigation displays correctly
- [ ] Menu items show icons only
- [ ] Hamburger menu not visible (menu fits)
- [ ] Content full width
- [ ] Touch-friendly button sizes
- [ ] Search bar visible (if space)

### Mobile Testing (< 600px)
```
Chrome DevTools: iPhone view
```

- [ ] Top navigation visible with hamburger (☰)
- [ ] Menu items hidden in drawer
- [ ] Logo "PoC Tracker" visible
- [ ] Hamburger menu (☰) clickable
- [ ] Clicking ☰ opens drawer from top
- [ ] Drawer shows all menu items:
  - [ ] Home
  - [ ] Schedule
  - [ ] Jira Projects
  - [ ] PoC Delivery
  - [ ] Reports
  - [ ] Documents
  - [ ] Settings
  - [ ] Log Out
- [ ] Clicking menu item navigates and closes drawer
- [ ] Clicking outside drawer closes it
- [ ] Profile avatar visible and clickable
- [ ] Search bar not visible (good)
- [ ] Content full width

### Responsive Testing
- [ ] Resize browser window from 1920px down to 375px
- [ ] Navigation smoothly transitions
- [ ] No broken layout
- [ ] No horizontal scrollbars appear
- [ ] All text readable
- [ ] All buttons clickable

## Functionality Testing

### Authentication
- [ ] Users can log in via Azure AD
- [ ] Login redirects to /home
- [ ] Logout works and returns to login screen

### API Calls
- [ ] Dashboard data loads
- [ ] PoC list loads
- [ ] Jira projects load
- [ ] Reports load
- [ ] No 404 or CORS errors

### Browser Console
- [ ] No JavaScript errors
- [ ] No warning messages
- [ ] Network tab shows successful API calls

## Performance Testing

```
Chrome DevTools - Lighthouse
```

- [ ] Performance score > 70
- [ ] Accessibility score > 90
- [ ] Best Practices > 85
- [ ] SEO score > 90
- [ ] Load time < 3 seconds

## Rollback Procedure

If issues occur:

```bash
# SSH into VM
gcloud compute ssh poc-tracker-vm --zone=us-central1-a

# Restore backup
sudo rm -rf /var/www/poc-tracker
sudo cp -r /var/www/poc-tracker.backup-[DATE] /var/www/poc-tracker

# Reload Nginx
sudo systemctl reload nginx

# Verify
curl -I https://delivery-dashboard.qnulabs.com/index.html
```

- [ ] Previous version restored
- [ ] Nginx reloaded
- [ ] App working again

## Sign-Off

| Item | Status | Notes |
|------|--------|-------|
| Local testing | ✓/✗ | |
| Build successful | ✓/✗ | |
| VM deployment | ✓/✗ | |
| Desktop testing | ✓/✗ | |
| Mobile testing | ✓/✗ | |
| Navigation working | ✓/✗ | |
| API calls working | ✓/✗ | |
| No console errors | ✓/✗ | |
| Ready for production | ✓/✗ | |

## Notes for Future Deployments

After this successful deployment, future updates only need:

```bash
# Local
npm run build
Compress-Archive -Path build\* -DestinationPath frontend-build.zip -Force

# VM
sudo rm -rf /var/www/poc-tracker/*
sudo unzip -o ~/frontend-build.zip -d /var/www/poc-tracker/
sudo chown -R www-data:www-data /var/www/poc-tracker/
sudo systemctl reload nginx
```

The navigation layout is now standardized and won't change unless intentional.

## Support & Troubleshooting

### Menu items not showing on desktop
- Check browser zoom (should be 100%)
- Clear browser cache
- Try different browser

### Mobile hamburger menu not working
- Check DevTools viewport width (< 600px)
- Try actual mobile device
- Clear browser cache

### Navigation slow or laggy
- Check network tab for slow API calls
- Check browser console for errors
- Reduce search bar typing if CPU high

### Still on old layout after update
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Check Service Worker in DevTools

For issues, check browser console for specific error messages.
