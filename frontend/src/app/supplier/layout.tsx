'use client';

import React from 'react';
import { SupplierSidebar } from '@/components/supplier/SupplierSidebar';
import { SupplierHeader } from '@/components/supplier/SupplierHeader';

/**
 * Supplier Shell Layout
 * 
 * Persistent layout that wraps all supplier pages.
 * - Sidebar (left)
 * - Header (top)
 * - Main content area (children)
 * 
 * Role protection is handled by middleware.ts
 */
export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Fixed left */}
      <SupplierSidebar />

      {/* Main Content Area - Offset for sidebar */}
      <div className="lg:ml-64">
        {/* Header - Fixed top */}
        <SupplierHeader />

        {/* Page Content - Offset for header */}
        <main className="pt-16 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

