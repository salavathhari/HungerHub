import express from 'express';
import authMiddleware from '../middleware/auth.js';
import requireRole from '../middleware/role.js';
import { createVendor, listVendors, getMyVendor, assignDeliveryBoy, unassignDeliveryBoy, listAssignedVendors, listDeliveryUsersForVendor, debugVendorOrders, requestJoinVendor, listDeliveryRequests, respondDeliveryRequest, findUserByEmail, updateVendor } from '../controllers/vendorController.js';

const router = express.Router();

router.post('/create', authMiddleware, requireRole('vendor'), createVendor);
router.get('/list', listVendors);
router.get('/me', authMiddleware, getMyVendor);
router.post('/update', authMiddleware, requireRole('vendor'), updateVendor);

// Vendor owner assigns/unassigns delivery users
router.post('/assign-delivery', authMiddleware, requireRole('vendor'), assignDeliveryBoy);
router.post('/unassign-delivery', authMiddleware, requireRole('vendor'), unassignDeliveryBoy);

// Delivery user: list vendors assigned to them
router.post('/assigned', authMiddleware, requireRole('delivery'), listAssignedVendors);

// Vendor owner: list delivery user profiles assigned to a vendor
router.post('/delivery-users', authMiddleware, requireRole('vendor'), listDeliveryUsersForVendor);

// Vendor debug endpoint (vendor owner only)
router.post('/debug-orders', authMiddleware, requireRole('vendor'), debugVendorOrders);

// Delivery user: request to join a vendor
router.post('/request-join', authMiddleware, requireRole('delivery'), requestJoinVendor);

// Vendor owner: list pending/processed delivery requests for their vendor
router.post('/requests', authMiddleware, requireRole('vendor'), listDeliveryRequests);

// Vendor owner: respond to a delivery request (accept/reject)
router.post('/requests/respond', authMiddleware, requireRole('vendor'), respondDeliveryRequest);

// Vendor owner: find a user by email to assign as delivery
router.post('/find-user', authMiddleware, requireRole('vendor'), findUserByEmail);

export default router;
