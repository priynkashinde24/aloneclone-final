'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Verify user is admin
    const user = getCurrentUser();
    
    if (!user) {
      router.push('/login?redirect=/admin');
      return;
    }

    if (user.role !== 'admin') {
      router.push('/unauthorized');
      return;
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="lg:ml-64">
        {/* Header */}
        <AdminHeader />

        {/* Page Content */}
        <main className="pt-16 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

