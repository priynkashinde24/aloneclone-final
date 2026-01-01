import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { sendSuccess, sendError } from '../utils/responseFormatter';
import { SKUHeatmapSnapshot } from '../models/SKUHeatmapSnapshot';
import { logAudit } from '../utils/auditLogger';
import { z } from 'zod';

/**
 * SKU Heatmap Analytics Controller
 * 
 * PURPOSE:
 * - Provide SKU performance heatmap insights
 * - Support Admin, Supplier, and Reseller views
 * - Use pre-aggregated snapshot data for performance
 * - Role-based data scoping
 * 
 * RULES:
 * - All queries use snapshot data (no real-time aggregation)
 * - Role-based access control enforced
 * - No cross-entity data leakage
 */

// Validation schemas
const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
});

/**
 * Get scope and entityId based on user role
 */
function getScopeAndEntity(user: any, storeId?: mongoose.Types.ObjectId | string): {
  scope: 'admin' | 'supplier' | 'reseller';
  entityId: mongoose.Types.ObjectId | string | null;
} {
  if (!user) {
    throw new Error('User not authenticated');
  }

  const userRole = user.role;

  if (userRole === 'admin') {
    return { scope: 'admin', entityId: null };
  }

  if (userRole === 'reseller') {
    const resellerId = user.id?.toString() || storeId?.toString() || '';
    return { scope: 'reseller', entityId: resellerId };
  }

  if (userRole === 'supplier') {
    const supplierId = user.id?.toString() || '';
    return { scope: 'supplier', entityId: supplierId ? new mongoose.Types.ObjectId(supplierId) : null };
  }

  throw new Error('Invalid user role for SKU heatmap analytics');
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate color threshold for heatmap
 */
function getHeatmapColor(value: number, min: number, max: number): 'hot' | 'warm' | 'cold' {
  if (max === min) return 'warm';
  const percentile = ((value - min) / (max - min)) * 100;
  if (percentile >= 80) return 'hot';
  if (percentile >= 20) return 'warm';
  return 'cold';
}

/**
 * GET /analytics/sku/heatmap
 * Get SKU heatmap data
 */
export const getSKUHeatmap = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = req.user;
    const storeId = req.store?.storeId ? new mongoose.Types.ObjectId(req.store.storeId) : null;

    if (!currentUser || !storeId) {
      sendError(res, 'Authentication and store required', 401);
      return;
    }

    // Get scope and entity
    const { scope, entityId } = getScopeAndEntity(currentUser, storeId);

    // Parse query params
    const { startDate, endDate, metric = 'sales' } = req.query;
    const today = formatDate(new Date());
    const yesterday = formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const start = (startDate as string) || yesterday;
    const end = (endDate as string) || today;

    // Validate dates
    try {
      dateRangeSchema.parse({ startDate: start, endDate: end });
    } catch (error: any) {
      sendError(res, 'Invalid date format. Use YYYY-MM-DD', 400);
      return;
    }

    // Build query
    const query: any = {
      storeId,
      scope,
      date: { $gte: start, $lte: end },
    };

    if (entityId !== null) {
      query.entityId = entityId;
    } else {
      query.entityId = null;
    }

    // Get snapshots
    const snapshots = await SKUHeatmapSnapshot.find(query).lean();

    // Aggregate by SKU
    const skuMap = new Map<string, any>();

    for (const snapshot of snapshots) {
      const skuKey = snapshot.skuId.toString();
      if (!skuMap.has(skuKey)) {
        skuMap.set(skuKey, {
          skuId: snapshot.skuId,
          sku: snapshot.sku,
          productId: snapshot.productId,
          views: 0,
          addToCart: 0,
          ordersCount: 0,
          quantitySold: 0,
          grossRevenue: 0,
          netRevenue: 0,
          returnsCount: 0,
          cancellationsCount: 0,
          stockLevel: 0,
          conversionRate: 0,
          returnRate: 0,
          stockTurnover: 0,
        });
      }

      const data = skuMap.get(skuKey)!;
      data.views += snapshot.views || 0;
      data.addToCart += snapshot.addToCart || 0;
      data.ordersCount += snapshot.ordersCount || 0;
      data.quantitySold += snapshot.quantitySold || 0;
      data.grossRevenue += snapshot.grossRevenue || 0;
      data.netRevenue += snapshot.netRevenue || 0;
      data.returnsCount += snapshot.returnsCount || 0;
      data.cancellationsCount += snapshot.cancellationsCount || 0;
      data.stockLevel = Math.max(data.stockLevel, snapshot.stockLevel || 0); // Use max stock level
      
      // Average rates
      const snapshotCount = (skuMap.get(skuKey) as any).snapshotCount || 0;
      (skuMap.get(skuKey) as any).snapshotCount = snapshotCount + 1;
    }

    // Calculate final metrics
    const heatmapData: any[] = [];
    const metricValues: number[] = [];

    for (const [skuKey, data] of skuMap.entries()) {
      const snapshotCount = (data as any).snapshotCount || 1;
      
      // Calculate averages
      data.conversionRate = data.views > 0 ? (data.ordersCount / data.views) * 100 : 0;
      data.returnRate = data.ordersCount > 0 ? (data.returnsCount / data.ordersCount) * 100 : 0;
      data.stockTurnover = data.stockLevel > 0 ? data.quantitySold / data.stockLevel : 0;

      // Get metric value based on selected metric
      let metricValue = 0;
      switch (metric) {
        case 'sales':
          metricValue = data.grossRevenue;
          break;
        case 'conversion':
          metricValue = data.conversionRate;
          break;
        case 'returns':
          metricValue = data.returnRate;
          break;
        case 'inventory':
          metricValue = data.stockLevel;
          break;
        default:
          metricValue = data.grossRevenue;
      }

      metricValues.push(metricValue);

      heatmapData.push({
        ...data,
        metricValue,
      });
    }

    // Calculate color thresholds
    const sortedValues = [...metricValues].sort((a, b) => a - b);
    const min = sortedValues[0] || 0;
    const max = sortedValues[sortedValues.length - 1] || 0;

    // Assign colors
    for (const item of heatmapData) {
      item.color = getHeatmapColor(item.metricValue, min, max);
    }

    // Log audit
    await logAudit({
      action: 'SKU_HEATMAP_VIEWED',
      actorId: currentUser.id,
      actorRole: currentUser.role as 'admin' | 'supplier' | 'reseller' | 'system',
      entityType: 'sku_heatmap',
      entityId: new mongoose.Types.ObjectId(storeId),
      description: 'SKU heatmap viewed',
      metadata: {
        scope,
        entityId: entityId?.toString() || null,
        dateRange: { start, end },
        metric,
      },
    });

    sendSuccess(res, {
      heatmap: heatmapData,
      metric,
      dateRange: { start, end },
      thresholds: { min, max },
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * GET /analytics/sku/:skuId/detail
 * Get SKU detail data
 */
export const getSKUDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = req.user;
    const storeId = req.store?.storeId ? new mongoose.Types.ObjectId(req.store.storeId) : null;
    const skuId = req.params.skuId;

    if (!currentUser || !storeId || !skuId) {
      sendError(res, 'Authentication, store, and SKU ID required', 401);
      return;
    }

    // Get scope and entity
    const { scope, entityId } = getScopeAndEntity(currentUser, storeId);

    // Parse query params
    const { startDate, endDate } = req.query;
    const today = formatDate(new Date());
    const yesterday = formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const start = (startDate as string) || yesterday;
    const end = (endDate as string) || today;

    // Validate dates
    try {
      dateRangeSchema.parse({ startDate: start, endDate: end });
    } catch (error: any) {
      sendError(res, 'Invalid date format. Use YYYY-MM-DD', 400);
      return;
    }

    // Build query
    const query: any = {
      storeId,
      scope,
      skuId: new mongoose.Types.ObjectId(skuId),
      date: { $gte: start, $lte: end },
    };

    if (entityId !== null) {
      query.entityId = entityId;
    } else {
      query.entityId = null;
    }

    // Get snapshots
    const snapshots = await SKUHeatmapSnapshot.find(query).sort({ date: 1 }).lean();

    // Aggregate totals
    let totalViews = 0;
    let totalAddToCart = 0;
    let totalOrders = 0;
    let totalQuantitySold = 0;
    let totalGrossRevenue = 0;
    let totalNetRevenue = 0;
    let totalReturns = 0;
    let totalCancellations = 0;
    let maxStockLevel = 0;

    for (const snapshot of snapshots) {
      totalViews += snapshot.views || 0;
      totalAddToCart += snapshot.addToCart || 0;
      totalOrders += snapshot.ordersCount || 0;
      totalQuantitySold += snapshot.quantitySold || 0;
      totalGrossRevenue += snapshot.grossRevenue || 0;
      totalNetRevenue += snapshot.netRevenue || 0;
      totalReturns += snapshot.returnsCount || 0;
      totalCancellations += snapshot.cancellationsCount || 0;
      maxStockLevel = Math.max(maxStockLevel, snapshot.stockLevel || 0);
    }

    // Calculate metrics
    const conversionRate = totalViews > 0 ? (totalOrders / totalViews) * 100 : 0;
    const returnRate = totalOrders > 0 ? (totalReturns / totalOrders) * 100 : 0;
    const cancellationRate = totalOrders > 0 ? (totalCancellations / totalOrders) * 100 : 0;
    const viewToCartRate = totalViews > 0 ? (totalAddToCart / totalViews) * 100 : 0;
    const cartToOrderRate = totalAddToCart > 0 ? (totalOrders / totalAddToCart) * 100 : 0;

    // Time series data
    const timeseries = snapshots.map((s) => ({
      date: s.date,
      views: s.views || 0,
      orders: s.ordersCount || 0,
      revenue: s.grossRevenue || 0,
      returns: s.returnsCount || 0,
      stockLevel: s.stockLevel || 0,
    }));

    // Log audit
    await logAudit({
      action: 'SKU_DETAIL_VIEWED',
      actorId: currentUser.id,
      actorRole: currentUser.role as 'admin' | 'supplier' | 'reseller' | 'system',
      entityType: 'sku_detail',
      entityId: skuId ? new mongoose.Types.ObjectId(skuId) : null,
      description: 'SKU detail viewed',
      metadata: {
        scope,
        entityId: entityId?.toString() || null,
        dateRange: { start, end },
      },
    });

    sendSuccess(res, {
      skuId,
      summary: {
        views: totalViews,
        addToCart: totalAddToCart,
        orders: totalOrders,
        quantitySold: totalQuantitySold,
        grossRevenue: totalGrossRevenue,
        netRevenue: totalNetRevenue,
        returns: totalReturns,
        cancellations: totalCancellations,
        stockLevel: maxStockLevel,
        conversionRate,
        returnRate,
        cancellationRate,
        viewToCartRate,
        cartToOrderRate,
      },
      timeseries,
      dateRange: { start, end },
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * GET /analytics/sku/top
 * Get top performing SKUs
 */
export const getTopSKUs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = req.user;
    const storeId = req.store?.storeId ? new mongoose.Types.ObjectId(req.store.storeId) : null;

    if (!currentUser || !storeId) {
      sendError(res, 'Authentication and store required', 401);
      return;
    }

    // Get scope and entity
    const { scope, entityId } = getScopeAndEntity(currentUser, storeId);

    // Parse query params
    const { startDate, endDate, metric = 'sales', limit = 20 } = req.query;
    const today = formatDate(new Date());
    const yesterday = formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const start = (startDate as string) || yesterday;
    const end = (endDate as string) || today;

    // Validate dates
    try {
      dateRangeSchema.parse({ startDate: start, endDate: end });
    } catch (error: any) {
      sendError(res, 'Invalid date format. Use YYYY-MM-DD', 400);
      return;
    }

    // Build query
    const query: any = {
      storeId,
      scope,
      date: { $gte: start, $lte: end },
    };

    if (entityId !== null) {
      query.entityId = entityId;
    } else {
      query.entityId = null;
    }

    // Get snapshots and aggregate
    const snapshots = await SKUHeatmapSnapshot.find(query).lean();
    const skuMap = new Map<string, any>();

    for (const snapshot of snapshots) {
      const skuKey = snapshot.skuId.toString();
      if (!skuMap.has(skuKey)) {
        skuMap.set(skuKey, {
          skuId: snapshot.skuId,
          sku: snapshot.sku,
          productId: snapshot.productId,
          grossRevenue: 0,
          ordersCount: 0,
          conversionRate: 0,
        });
      }

      const data = skuMap.get(skuKey)!;
      data.grossRevenue += snapshot.grossRevenue || 0;
      data.ordersCount += snapshot.ordersCount || 0;
      data.views = (data.views || 0) + (snapshot.views || 0);
    }

    // Calculate metrics and sort
    const topSKUs = Array.from(skuMap.values())
      .map((data) => {
        data.conversionRate = data.views > 0 ? (data.ordersCount / data.views) * 100 : 0;
        return data;
      })
      .sort((a, b) => {
        switch (metric) {
          case 'sales':
            return b.grossRevenue - a.grossRevenue;
          case 'conversion':
            return b.conversionRate - a.conversionRate;
          case 'orders':
            return b.ordersCount - a.ordersCount;
          default:
            return b.grossRevenue - a.grossRevenue;
        }
      })
      .slice(0, Number(limit));

    sendSuccess(res, {
      topSKUs,
      metric,
      dateRange: { start, end },
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * GET /analytics/sku/bottom
 * Get bottom performing SKUs
 */
export const getBottomSKUs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = req.user;
    const storeId = req.store?.storeId ? new mongoose.Types.ObjectId(req.store.storeId) : null;

    if (!currentUser || !storeId) {
      sendError(res, 'Authentication and store required', 401);
      return;
    }

    // Get scope and entity
    const { scope, entityId } = getScopeAndEntity(currentUser, storeId);

    // Parse query params
    const { startDate, endDate, metric = 'sales', limit = 20 } = req.query;
    const today = formatDate(new Date());
    const yesterday = formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const start = (startDate as string) || yesterday;
    const end = (endDate as string) || today;

    // Validate dates
    try {
      dateRangeSchema.parse({ startDate: start, endDate: end });
    } catch (error: any) {
      sendError(res, 'Invalid date format. Use YYYY-MM-DD', 400);
      return;
    }

    // Build query
    const query: any = {
      storeId,
      scope,
      date: { $gte: start, $lte: end },
    };

    if (entityId !== null) {
      query.entityId = entityId;
    } else {
      query.entityId = null;
    }

    // Get snapshots and aggregate (same logic as top, but reverse sort)
    const snapshots = await SKUHeatmapSnapshot.find(query).lean();
    const skuMap = new Map<string, any>();

    for (const snapshot of snapshots) {
      const skuKey = snapshot.skuId.toString();
      if (!skuMap.has(skuKey)) {
        skuMap.set(skuKey, {
          skuId: snapshot.skuId,
          sku: snapshot.sku,
          productId: snapshot.productId,
          grossRevenue: 0,
          ordersCount: 0,
          conversionRate: 0,
        });
      }

      const data = skuMap.get(skuKey)!;
      data.grossRevenue += snapshot.grossRevenue || 0;
      data.ordersCount += snapshot.ordersCount || 0;
      data.views = (data.views || 0) + (snapshot.views || 0);
    }

    // Calculate metrics and sort (ascending for bottom)
    const bottomSKUs = Array.from(skuMap.values())
      .map((data) => {
        data.conversionRate = data.views > 0 ? (data.ordersCount / data.views) * 100 : 0;
        return data;
      })
      .sort((a, b) => {
        switch (metric) {
          case 'sales':
            return a.grossRevenue - b.grossRevenue;
          case 'conversion':
            return a.conversionRate - b.conversionRate;
          case 'orders':
            return a.ordersCount - b.ordersCount;
          default:
            return a.grossRevenue - b.grossRevenue;
        }
      })
      .slice(0, Number(limit));

    sendSuccess(res, {
      bottomSKUs,
      metric,
      dateRange: { start, end },
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * GET /analytics/sku/export
 * Export SKU heatmap data as CSV
 */
export const exportSKUHeatmap = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = req.user;
    const storeId = req.store?.storeId ? new mongoose.Types.ObjectId(req.store.storeId) : null;

    if (!currentUser || !storeId) {
      sendError(res, 'Authentication and store required', 401);
      return;
    }

    // Get scope and entity
    const { scope, entityId } = getScopeAndEntity(currentUser, storeId);

    // Parse query params
    const { startDate, endDate } = req.query;
    const today = formatDate(new Date());
    const yesterday = formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const start = (startDate as string) || yesterday;
    const end = (endDate as string) || today;

    // Validate dates
    try {
      dateRangeSchema.parse({ startDate: start, endDate: end });
    } catch (error: any) {
      sendError(res, 'Invalid date format. Use YYYY-MM-DD', 400);
      return;
    }

    // Build query
    const query: any = {
      storeId,
      scope,
      date: { $gte: start, $lte: end },
    };

    if (entityId !== null) {
      query.entityId = entityId;
    } else {
      query.entityId = null;
    }

    // Get snapshots
    const snapshots = await SKUHeatmapSnapshot.find(query).sort({ date: 1, sku: 1 }).lean();

    // Generate CSV
    const csvRows: string[] = [];
    csvRows.push('Date,SKU,Views,Add to Cart,Orders,Quantity Sold,Gross Revenue,Net Revenue,Returns,Stock Level,Conversion Rate,Return Rate');

    for (const snapshot of snapshots) {
      const row = [
        snapshot.date,
        snapshot.sku,
        (snapshot.views || 0).toString(),
        (snapshot.addToCart || 0).toString(),
        (snapshot.ordersCount || 0).toString(),
        (snapshot.quantitySold || 0).toString(),
        (snapshot.grossRevenue || 0).toFixed(2),
        (snapshot.netRevenue || 0).toFixed(2),
        (snapshot.returnsCount || 0).toString(),
        (snapshot.stockLevel || 0).toString(),
        (snapshot.conversionRate || 0).toFixed(2),
        (snapshot.returnRate || 0).toFixed(2),
      ];
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');

    // Log audit
    await logAudit({
      action: 'SKU_HEATMAP_EXPORTED',
      actorId: currentUser.id,
      actorRole: currentUser.role as 'admin' | 'supplier' | 'reseller' | 'system',
      entityType: 'sku_heatmap',
      entityId: new mongoose.Types.ObjectId(storeId),
      description: 'SKU heatmap exported',
      metadata: {
        scope,
        entityId: entityId?.toString() || null,
        dateRange: { start, end },
      },
    });

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sku-heatmap-${start}-${end}.csv"`);
    res.send(csv);
  } catch (error: any) {
    next(error);
  }
};

