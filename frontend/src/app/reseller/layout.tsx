'use client';

import React from 'react';
import { ResellerSidebar } from '@/components/reseller/ResellerSidebar';
import { ResellerHeader } from '@/components/reseller/ResellerHeader';

/**
 * Reseller Shell Layout
 * 
 * Persistent layout that wraps all reseller pages.
 * - Sidebar (left)
 * - Header (top)
 * - Main content area (children)
 * 
 * Role protection is handled by middleware.ts
 */
export default function ResellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Fixed left */}
      <ResellerSidebar />

      {/* Main Content Area - Offset for sidebar */}
      <div className="lg:ml-64">
        {/* Header - Fixed top */}
        <ResellerHeader />

        {/* Page Content - Offset for header */}
        <main className="pt-16 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

