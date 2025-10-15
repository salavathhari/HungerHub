import express from 'express';
import authMiddleware from '../middleware/auth.js';
import requireRole from '../middleware/role.js';
import { listOrders, placeOrder,updateStatus,userOrders, verifyOrder, placeOrderCod, vendorOrders, deliveryOrders, claimOrder, markPicked, markDelivered, vendorUpdateStatus, updateDeliveryLocation, getDeliveryLocation } from '../controllers/orderController.js';

const orderRouter = express.Router();

orderRouter.get("/list",listOrders);
orderRouter.post("/userorders",authMiddleware,userOrders);
orderRouter.post("/place",authMiddleware,placeOrder);
orderRouter.post("/status",updateStatus);
orderRouter.post("/verify",verifyOrder);
orderRouter.post("/placecod",authMiddleware,placeOrderCod);
orderRouter.post("/vendororders", authMiddleware, vendorOrders);

// Delivery user: get orders for vendors assigned to this delivery user
orderRouter.post("/delivery-orders", authMiddleware, requireRole('delivery'), deliveryOrders);

// Delivery user actions
orderRouter.post('/claim', authMiddleware, requireRole('delivery'), claimOrder);
orderRouter.post('/picked', authMiddleware, requireRole('delivery'), markPicked);
orderRouter.post('/delivered', authMiddleware, requireRole('delivery'), markDelivered);

// Delivery location: update (delivery) and fetch (any)
orderRouter.post('/location/update', authMiddleware, requireRole('delivery'), updateDeliveryLocation);
orderRouter.post('/location', authMiddleware, getDeliveryLocation);

// vendor: update status for orders that include items from this vendor
orderRouter.post('/vendor/update-status', authMiddleware, vendorUpdateStatus);

export default orderRouter;