'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarWidth = collapsed ? 72 : 260;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Navbar
        onMobileMenuToggle={() => setMobileOpen(true)}
        sidebarCollapsed={collapsed}
      />
      <main
        className="pt-16 min-h-screen transition-all duration-200"
        style={{ paddingLeft: `max(${sidebarWidth}px, 0px)` }}
      >
        <style>{`@media (max-width: 1023px) { main { padding-left: 0 !important; } }`}</style>
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
