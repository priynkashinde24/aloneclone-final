import { Router } from 'express';
import {
  createSubscriptionPayment,
  verifyPayment,
} from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// POST /payments/subscribe - Create payment session
router.post('/subscribe', authenticate, createSubscriptionPayment);

// POST /payments/verify - Verify payment
router.post('/verify', authenticate, verifyPayment);

export default router;

