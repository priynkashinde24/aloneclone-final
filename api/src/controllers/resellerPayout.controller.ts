import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/responseFormatter';
import { PayoutLedger } from '../models/PayoutLedger';
import { getPayoutSummary } from '../services/payout.service';
import { z } from 'zod';
import mongoose from 'mongoose';

/**
 * Reseller Payout Controller
 * 
 * PURPOSE:
 * - Reseller dashboard: view margin earned, pending, paid
 * - Read-only access
 */

const getResellerPayoutsSchema = z.object({
  status: z.enum(['pending', 'eligible', 'paid']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * GET /reseller/payouts
 * Get reseller payouts
 */
export const getResellerPayouts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUser = req.user;
    const storeId = req.store?.storeId;

    if (!currentUser || !storeId) {
      sendError(res, 'Authentication and store context required', 401);
      return;
    }

    const validatedData = getResellerPayoutsSchema.parse(req.query);

    const query: any = {
      storeId: new mongoose.Types.ObjectId(storeId),
      entityType: 'reseller',
      entityId: currentUser.id,
    };

    if (validatedData.status) {
      query.status = validatedData.status;
    }

    const payouts = await PayoutLedger.find(query)
      .sort({ createdAt: -1 })
      .limit(validatedData.limit)
      .skip(validatedData.offset)
      .populate('paymentSplitId')
      .lean();

    const total = await PayoutLedger.countDocuments(query);

    // Get summary
    const summary = await getPayoutSummary('reseller', currentUser.id, storeId);

    sendSuccess(
      res,
      {
        payouts,
        summary,
        pagination: {
          total,
          limit: validatedData.limit,
          offset: validatedData.offset,
          hasMore: validatedData.offset + validatedData.limit < total,
        },
      },
      'Reseller payouts retrieved successfully'
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendError(res, error.errors[0].message, 400);
      return;
    }
    next(error);
  }
};

/**
 * GET /reseller/payouts/summary
 * Get reseller payout summary
 */
export const getResellerPayoutSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUser = req.user;
    const storeId = req.store?.storeId;

    if (!currentUser || !storeId) {
      sendError(res, 'Authentication and store context required', 401);
      return;
    }

    const summary = await getPayoutSummary('reseller', currentUser.id, storeId);

    sendSuccess(res, summary, 'Reseller payout summary retrieved successfully');
  } catch (error) {
    next(error);
  }
};
