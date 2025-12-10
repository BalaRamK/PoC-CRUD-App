# Project Structure Overview

This document outlines the reorganized folder structure of the PoC CRUD App frontend.

## Folder Organization

```
src/
├── auth/                          # Authentication utilities
│   ├── AuthProvider.jsx
│   ├── axiosMsalInterceptor.js
│   └── msalConfig.js
│
├── components/                    # Reusable UI components
│   ├── AddRowDialog.js
│   ├── Charts.js
│   ├── DashboardTile.jsx
│   ├── DataTable.js
│   ├── EditRowDialog.js
│   ├── Export.js
│   ├── ExportReports.js
│   ├── ModernDialog.css
│   ├── StatTile.jsx
│   └── ... (other small reusable components)
│
├── layouts/                       # Layout components
│   └── DashboardLayout.jsx        # Main layout with top navigation
│
├── navigation/                    # Navigation components
│   └── TopNavigation.jsx          # Responsive top navigation bar
│
├── pages/                         # Page-level components
│   ├── auth/                      # Authentication pages
│   │   ├── AuthCallback.js        # OAuth callback handler
│   │   └── LoginScreen.js         # Login page
│   │
│   ├── dashboard/                 # Main dashboard pages
│   │   ├── Home.js                # Home dashboard overview
│   │   └── Schedule.js            # Schedule/export feature
│   │
│   ├── pocDelivery/               # PoC delivery related pages
│   │   └── DataTable.js           # PoC delivery list/table
│   │
│   ├── jira/                      # Jira integration pages
│   │   └── ProjectsPage.js        # Jira projects dashboard
│   │
│   ├── reports/                   # Reports pages
│   │   └── Reports.js             # Reports dashboard
│   │
│   ├── docs/                      # Documentation pages
│   │   └── Documentation.js       # Documentation page
│   │
│   └── settings/                  # Settings pages
│       └── (Settings page content)
│
├── App.js                         # Main app router
├── App.css                        # Global styles
├── index.js                       # Entry point
└── ... (other root files)
```

## Navigation Structure

### Responsive Top Navigation Bar

The `TopNavigation` component provides:

- **Desktop View**: Horizontal menu bar with all navigation items visible
- **Tablet View**: Compact menu with icons and abbreviated labels
- **Mobile View**: Hamburger menu with drawer navigation

### Menu Items

1. **Home** - Main dashboard overview
2. **Schedule** - Report scheduling and export
3. **Jira Projects** - Jira integration dashboard
4. **PoC Delivery** - PoC delivery list and management
5. **Reports** - Reports dashboard
6. **Documents** - Documentation and help center
7. **Settings** - User settings (in profile dropdown)

## Layout Hierarchy

```
TopNavigation (Fixed Header)
    ├── Logo & Brand
    ├── Responsive Menu Items
    │   ├── Desktop: Full labels with icons
    │   ├── Tablet: Icons only with tooltips
    │   └── Mobile: Hamburger menu
    ├── Search Bar (Desktop only)
    ├── Quick Actions
    └── Profile Menu
         ├── User Info
         ├── Settings
         └── Log Out

Main Content Area
    └── Children components (Home, DataTable, etc.)
```

## Component Re-exports

To maintain backward compatibility and avoid duplication, page components in the `pages/` folder are **re-exports** that import from the original `components/` folder.

**Example:**
```javascript
// pages/auth/LoginScreen.js
export { default } from '../../components/LoginScreen';
```

This allows:
- ✅ New import path: `from './pages/auth/LoginScreen'`
- ✅ Clean folder organization
- ✅ Single source of truth (original component in `components/`)

## Migration Notes

All routes in `App.js` have been updated to:
- Use `DashboardLayout` instead of `DeliveryDashboard`
- Import pages from the new `pages/` folder structure
- Maintain all existing functionality

### Before
```javascript
<Route path="/home" element={<DeliveryDashboard><Home /></DeliveryDashboard>} />
import Home from './components/Home';
```

### After
```javascript
<Route path="/home" element={<DashboardLayout><Home /></DashboardLayout>} />
import Home from './pages/dashboard/Home';
```

## Responsive Design Features

### TopNavigation Breakpoints

- **xs (< 600px)**: Mobile - Menu hidden, hamburger icon visible
- **sm (600-900px)**: Tablet - Icons only, hamburger menu
- **md (900-1200px)**: Tablet/Desktop - Full labels, search bar visible
- **lg (> 1200px)**: Desktop - All features visible

### Benefits

1. **More Space**: No sidebar = wider content area
2. **Better Mobile**: Hamburger menu on small screens
3. **Flexible**: Adapts automatically to screen size
4. **Clean**: Organized folder structure by feature

## Future Improvements

- Move original `components/` contents to respective `pages/` folders
- Create a `hooks/` folder for custom hooks
- Create a `utils/` folder for utility functions
- Create a `styles/` folder for shared CSS
- Create a `constants/` folder for app constants

## Running the App

The navigation and layout work seamlessly with existing authentication:
```bash
npm start
```

All routes are protected by Azure AD via `AuthProvider` - users must be authenticated before accessing dashboard pages.
