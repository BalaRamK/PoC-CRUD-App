import React from 'react';
import TopNavigation from '../navigation/TopNavigation';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)' }}>
      {/* Top Navigation Bar */}
      <TopNavigation />

      {/* Main Content Area */}
      <main className="flex-1 mt-[72px] overflow-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
