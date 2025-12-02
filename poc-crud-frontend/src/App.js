import React from "react";
import { Routes, Route } from "react-router-dom";
import DeliveryDashboard from "./components/DeliveryDashboard";
import LoginScreen from "./components/LoginScreen";
import AuthCallback from './components/AuthCallback';
import Home from './components/Home';
import Reports from "./components/Reports";
import ProjectsPage from "./components/ProjectsPage"; // Import ProjectsPage
import DataTable from "./components/DataTable";       // Import DataTable
import Schedule from "./components/Schedule";         // Import Schedule

export default function App() {
  return (
    <Routes>
      {/* Public/auth routes rendered without the dashboard layout */}
      <Route path="/" element={<LoginScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected/dashboard routes wrapped with DeliveryDashboard layout */}
      {/* All these routes will now have the sidebar and topbar from DeliveryDashboard */}
      <Route path="/home" element={<DeliveryDashboard><Home /></DeliveryDashboard>} />
      <Route path="/poc-delivery-list" element={<DeliveryDashboard><DataTable /></DeliveryDashboard>} />
      <Route path="/projects" element={<DeliveryDashboard><ProjectsPage /></DeliveryDashboard>} /> {/* Jira Projects Dashboard */}
      <Route path="/reports" element={<DeliveryDashboard><Reports /></DeliveryDashboard>} /> {/* Report Dashboard */}

      {/* Other routes that use the dashboard layout */}
      <Route path="/schedule" element={<DeliveryDashboard><Schedule /></DeliveryDashboard>} />
      <Route path="/documents" element={<DeliveryDashboard><div style={{ padding: '20px' }}>Documents Page Content</div></DeliveryDashboard>} />
      <Route path="/settings" element={<DeliveryDashboard><div style={{ padding: '20px' }}>Settings Page Content</div></DeliveryDashboard>} />

      {/* Original test route (also wrapped) */}
      <Route path="/test" element={<DeliveryDashboard><div style={{ background: 'lime', padding: '48px' }}>TEST ROUTE (LIME)</div></DeliveryDashboard>} />
    </Routes>
  );
}
