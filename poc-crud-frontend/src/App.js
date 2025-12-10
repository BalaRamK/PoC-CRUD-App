import React from "react";
import { Routes, Route } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import LoginScreen from "./pages/auth/LoginScreen";
import AuthCallback from './pages/auth/AuthCallback';
import Home from './pages/dashboard/Home';
import Reports from "./pages/reports/Reports";
import ProjectsPage from "./pages/jira/ProjectsPage";
import DataTable from "./pages/pocDelivery/DataTable";
import Schedule from "./pages/dashboard/Schedule";
import Documentation from "./pages/docs/Documentation";

export default function App() {
  return (
    <Routes>
      {/* Public/auth routes rendered without the dashboard layout */}
      <Route path="/" element={<LoginScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected/dashboard routes wrapped with DashboardLayout */}
      {/* All these routes will now have the top navigation and main content area */}
      <Route path="/home" element={<DashboardLayout><Home /></DashboardLayout>} />
      <Route path="/poc-delivery-list" element={<DashboardLayout><DataTable /></DashboardLayout>} />
      <Route path="/projects" element={<DashboardLayout><ProjectsPage /></DashboardLayout>} />
      <Route path="/reports" element={<DashboardLayout><Reports /></DashboardLayout>} />
      <Route path="/schedule" element={<DashboardLayout><Schedule /></DashboardLayout>} />
      <Route path="/documents" element={<DashboardLayout><Documentation /></DashboardLayout>} />
      <Route path="/settings" element={<DashboardLayout><div style={{ padding: '20px' }}>Settings Page Content</div></DashboardLayout>} />
      <Route path="/test" element={<DashboardLayout><div style={{ background: 'lime', padding: '48px' }}>TEST ROUTE (LIME)</div></DashboardLayout>} />
    </Routes>
  );
}
