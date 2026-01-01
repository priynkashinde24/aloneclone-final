'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function ResellerDashboardPage() {
  // Placeholder stat cards (empty content slots)
  const statCards = [
    {
      title: 'Total Stores',
      value: '—',
      description: 'Active stores',
    },
    {
      title: 'Total Products',
      value: '—',
      description: 'Products in stores',
    },
    {
      title: 'Total Orders',
      value: '—',
      description: 'All time orders',
    },
    {
      title: 'Total Earnings',
      value: '—',
      description: 'All time revenue',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Reseller Dashboard</h1>
        <p className="text-text-secondary">Welcome to Reseller Panel</p>
      </div>

      {/* Empty Stat Cards (Placeholders) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <Card key={index} className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-text-secondary">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-1">{card.value}</div>
              <p className="text-xs text-text-muted">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

