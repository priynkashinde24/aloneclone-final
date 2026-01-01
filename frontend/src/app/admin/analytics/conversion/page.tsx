'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { conversionAnalyticsAPI } from '@/lib/api';

interface FunnelStep {
  step: string;
  count: number;
  dropOff: number;
  dropOffPercent?: number;
  conversionRate: number;
}

interface SummaryData {
  summary: {
    pageViews: number;
    productViews: number;
    addToCart: number;
    checkoutStarted: number;
    paymentInitiated: number;
    ordersConfirmed: number;
    addToCartRate: number;
    checkoutConversionRate: number;
    paymentSuccessRate: number;
    overallConversionRate: number;
    cartAbandonmentRate: number;
    checkoutAbandonmentRate: number;
    cartAbandoned: number;
    checkoutAbandoned: number;
    recoveryConverted: number;
    stripeInitiated: number;
    paypalInitiated: number;
    codInitiated: number;
    stripeSuccess: number;
    paypalSuccess: number;
    codSuccess: number;
    paymentFailures: number;
  };
  comparison: {
    overallConversionRate: { current: number; previous: number; change: number };
    ordersConfirmed: { current: number; previous: number; change: number };
  };
}

export default function AdminConversionPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryResponse, funnelResponse] = await Promise.all([
        conversionAnalyticsAPI.getSummary({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }),
        conversionAnalyticsAPI.getFunnel({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }),
      ]);

      if (summaryResponse.success) {
        setSummary(summaryResponse.data);
      }
      if (funnelResponse.success) {
        setFunnel(funnelResponse.data.funnel);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load conversion analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    const color = change >= 0 ? 'text-green-600' : 'text-red-600';
    return <span className={color}>{sign}{change.toFixed(1)}%</span>;
  };

  const handleExport = async () => {
    try {
      const blob = await conversionAnalyticsAPI.exportAnalytics({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format: 'csv',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversion-analytics-${dateRange.startDate}-${dateRange.endDate}.csv`;
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
        <div className="text-center">Loading conversion analytics...</div>
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
        <h1 className="text-3xl font-bold">Conversion Analytics</h1>
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
                <CardTitle className="text-sm font-medium text-gray-500">Overall Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.summary.overallConversionRate.toFixed(2)}%</div>
                <div className="text-sm text-gray-500 mt-1">
                  {formatChange(summary.comparison.overallConversionRate.change)} vs previous period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500">Orders Confirmed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.summary.ordersConfirmed.toLocaleString()}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {formatChange(summary.comparison.ordersConfirmed.change)} vs previous period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500">Add to Cart Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.summary.addToCartRate.toFixed(2)}%</div>
                <div className="text-sm text-gray-500 mt-1">
                  {summary.summary.productViews.toLocaleString()} product views
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500">Checkout Conversion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.summary.checkoutConversionRate.toFixed(2)}%</div>
                <div className="text-sm text-gray-500 mt-1">
                  {summary.summary.checkoutStarted.toLocaleString()} checkouts started
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Funnel Visualization */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnel.map((step, index) => (
                  <div key={step.step} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-semibold">{step.step}</span>
                        <span className="text-2xl font-bold">{step.count.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {step.conversionRate.toFixed(2)}% conversion
                        </div>
                        {step.dropOff > 0 && (
                          <div className="text-sm text-red-600">
                            {step.dropOff.toLocaleString()} dropped ({step.dropOffPercent?.toFixed(1)}%)
                          </div>
                        )}
                      </div>
                    </div>
                    {index < funnel.length - 1 && (
                      <div className="ml-4 text-gray-400">↓</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Abandonment Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500">Cart Abandonment Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.summary.cartAbandonmentRate.toFixed(2)}%</div>
                <div className="text-sm text-gray-500 mt-1">
                  {summary.summary.cartAbandoned.toLocaleString()} abandoned carts
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500">Checkout Abandonment Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.summary.checkoutAbandonmentRate.toFixed(2)}%</div>
                <div className="text-sm text-gray-500 mt-1">
                  {summary.summary.checkoutAbandoned.toLocaleString()} abandoned checkouts
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500">Recovery Conversions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.summary.recoveryConverted.toLocaleString()}</div>
                <div className="text-sm text-gray-500 mt-1">
                  Carts recovered via email/WhatsApp
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Method Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Stripe</h3>
                  <div className="text-sm">
                    <div>Initiated: {summary.summary.stripeInitiated.toLocaleString()}</div>
                    <div>Success: {summary.summary.stripeSuccess.toLocaleString()}</div>
                    <div className="text-green-600">
                      Success Rate: {summary.summary.stripeInitiated > 0 
                        ? ((summary.summary.stripeSuccess / summary.summary.stripeInitiated) * 100).toFixed(2) 
                        : 0}%
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">PayPal</h3>
                  <div className="text-sm">
                    <div>Initiated: {summary.summary.paypalInitiated.toLocaleString()}</div>
                    <div>Success: {summary.summary.paypalSuccess.toLocaleString()}</div>
                    <div className="text-green-600">
                      Success Rate: {summary.summary.paypalInitiated > 0 
                        ? ((summary.summary.paypalSuccess / summary.summary.paypalInitiated) * 100).toFixed(2) 
                        : 0}%
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">COD</h3>
                  <div className="text-sm">
                    <div>Initiated: {summary.summary.codInitiated.toLocaleString()}</div>
                    <div>Success: {summary.summary.codSuccess.toLocaleString()}</div>
                    <div className="text-green-600">
                      Success Rate: {summary.summary.codInitiated > 0 
                        ? ((summary.summary.codSuccess / summary.summary.codInitiated) * 100).toFixed(2) 
                        : 0}%
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-red-600">
                  Payment Failures: {summary.summary.paymentFailures.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

