'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { useEffect } from 'react';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Redirect based on role if needed
    if (user.role === 'admin') {
      router.push('/admin');
    } else if (user.role === 'supplier') {
      router.push('/supplier');
    }
  }, [router]);

  const user = getCurrentUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-text-primary mb-6">Dashboard</h1>
        <div className="bg-surface rounded-lg p-6">
          <p className="text-text-secondary">Welcome, {user.name || user.email}!</p>
          <p className="text-text-secondary mt-2">Role: {user.role}</p>
          <p className="text-text-muted mt-4 text-sm">This is a placeholder dashboard page for resellers.</p>
        </div>
      </div>
    </div>
  );
}

