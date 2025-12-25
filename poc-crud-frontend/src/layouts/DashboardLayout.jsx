import React from 'react';
import TopNavigation from '../navigation/TopNavigation';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Top Navigation Bar */}
      <TopNavigation />

      {/* Main Content Area */}
      <main className="flex-1 mt-[72px] overflow-auto px-4 sm:px-6 md:px-8">
        <div className="mx-auto bg-white rounded-xl shadow-soft">
          {children}
        </div>
      </main>
    </div>
  );
}
