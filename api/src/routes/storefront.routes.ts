import { Router } from 'express';
import { getProducts, getProductBySlug } from '../controllers/storefront.controller';

const router = Router();

// Public routes - no authentication required
// GET /api/storefront/products - List all sellable products
router.get('/products', getProducts);

// GET /api/storefront/products/:slug - Get product details
router.get('/products/:slug', getProductBySlug);

export default router;

