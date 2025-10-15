import express from 'express'
import authMiddleware from '../middleware/auth.js'
import requireRole from '../middleware/role.js'
import { getAssignedVendors, getDeliveryOrders, joinVendor, leaveVendor, debugDeliveryOrders } from '../controllers/deliveryController.js'

const router = express.Router()

// return vendors assigned to delivery user
router.post('/assigned', authMiddleware, requireRole('delivery'), getAssignedVendors)

// return delivery orders (enriched)
router.post('/orders', authMiddleware, requireRole('delivery'), getDeliveryOrders)

// Diagnostic: delivery debug endpoint
router.post('/debug-orders', authMiddleware, requireRole('delivery'), debugDeliveryOrders)

// delivery user register/unregister
router.post('/join', authMiddleware, requireRole('delivery'), joinVendor)
router.post('/leave', authMiddleware, requireRole('delivery'), leaveVendor)

export default router
