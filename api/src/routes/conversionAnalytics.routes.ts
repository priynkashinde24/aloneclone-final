import { Router } from 'express';
import {
  getConversionSummary,
  getFunnel,
  getConversionTimeseries,
  exportConversionAnalytics,
} from '../controllers/conversionAnalytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveStore } from '../middleware/resolveStore';

const router = Router();

/**
 * Conversion Analytics Routes
 * 
 * All routes require authentication and store resolution
 */

// Conversion summary
router.get('/analytics/conversion/summary', authenticate, resolveStore, getConversionSummary);

// Funnel visualization
router.get('/analytics/conversion/funnel', authenticate, resolveStore, getFunnel);

// Time series data
router.get('/analytics/conversion/timeseries', authenticate, resolveStore, getConversionTimeseries);

// Export conversion data
router.get('/analytics/conversion/export', authenticate, resolveStore, exportConversionAnalytics);

export default router;

