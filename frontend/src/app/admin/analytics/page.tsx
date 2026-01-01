'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { salesAnalyticsAPI } from '@/lib/api';

interface SummaryData {
  summary: {
    ordersCount: number;
    grossRevenue: number;
    netRevenue: number;
    taxCollected: number;
    shippingCollected: number;
    discounts: number;
    refunds: number;
    supplierEarnings: number;
    resellerEarnings: number;
    platformEarnings: number;
  };
  comparison: {
    ordersCount: { current: number; previous: number; change: number };
    grossRevenue: { current: number; previous: number; change: number };
    netRevenue: { current: number; previous: number; change: number };
    refunds: { current: number; previous: number; change: number };
    earnings: { current: number; previous: number; change: number };
  };
}

export default function AdminAnalyticsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchSummary();
  }, [dateRange]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await salesAnalyticsAPI.getSummary({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      if (response.success) {
        setSummary(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    const color = change >= 0 ? 'text-green-600' : 'text-red-600';
    return <span className={color}>{sign}{change.toFixed(1)}%</span>;
  };

  const handleExport = async () => {
    try {
      const blob = await salesAnalyticsAPI.exportAnalytics({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format: 'csv',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${dateRange.startDate}-${dateRange.endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to export analytics');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sales Analytics</h1>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="px-3 py-2 border rounded"
          />
          <span>to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="px-3 py-2 border rounded"
          />
          <Button onClick={handleExport}>Export CSV</Button>
        </div>
      </div>

      {summary && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500">Total Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.summary.ordersCount.toLocaleString()}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {formatChange(summary.comparison.ordersCount.change)} vs previous period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500">Gross Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.summary.grossRevenue)}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {formatChange(summary.comparison.grossRevenue.change)} vs previous period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500">Net Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.summary.netRevenue)}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {formatChange(summary.comparison.netRevenue.change)} vs previous period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500">Platform Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.summary.platformEarnings)}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {formatChange(summary.comparison.earnings.change)} vs previous period
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500">Tax Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{formatCurrency(summary.summary.taxCollected)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500">Shipping Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{formatCurrency(summary.summary.shippingCollected)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500">Refunds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{formatCurrency(summary.summary.refunds)}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {formatChange(summary.comparison.refunds.change)} vs previous period
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Placeholder for Charts */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Revenue Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                Chart component - Install recharts or chart.js to render time-series charts
              </div>
            </CardContent>
          </Card>

          {/* Placeholder for Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-gray-500">
                Top products table - Use salesAnalyticsAPI.getTopProducts() to fetch data
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

