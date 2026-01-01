import { Router } from 'express';
import {
  addToResellerCatalog,
  removeFromResellerCatalog,
  updateResellerPrice,
} from '../controllers/resellerController';
import {
  getResellerCatalog,
  selectResellerProduct,
  getResellerProducts,
  createResellerProduct,
  updateResellerProduct,
} from '../controllers/resellerProduct.controller';
import { getResellerPayouts } from '../controllers/resellerPayout.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// GET /api/reseller/catalog - Get available supplier products for selection (reseller or admin)
router.get('/catalog', authenticate, authorize(['reseller', 'admin']), getResellerCatalog);

// POST /api/reseller/products/select - Select supplier variant and create reseller product
router.post('/products/select', authenticate, authorize(['reseller']), selectResellerProduct);

// POST /api/reseller/catalog/add - Add product to reseller catalog (reseller or admin)
router.post('/catalog/add', authenticate, authorize(['reseller', 'admin']), addToResellerCatalog);

// PUT /api/reseller/catalog/:id/price - Update reseller price (reseller or admin)
router.put('/catalog/:id/price', authenticate, authorize(['reseller', 'admin']), updateResellerPrice);

// DELETE /api/reseller/catalog/:id - Remove product from catalog (reseller or admin)
router.delete('/catalog/:id', authenticate, authorize(['reseller', 'admin']), removeFromResellerCatalog);

// GET /api/reseller/products - Get reseller's product catalog (new model)
router.get('/products', authenticate, authorize(['reseller']), getResellerProducts);

// POST /api/reseller/products - Create reseller product (new model)
router.post('/products', authenticate, authorize(['reseller']), createResellerProduct);

// PATCH /api/reseller/products/:id - Update reseller product (new model)
router.patch('/products/:id', authenticate, authorize(['reseller']), updateResellerProduct);

// GET /api/reseller/payouts - Get reseller's payouts (earnings)
router.get('/payouts', authenticate, authorize(['reseller']), getResellerPayouts);

export default router;

