import orderModel from "../models/orderModel.js";
import mongoose from 'mongoose';
import userModel from "../models/userModel.js"
import Stripe from "stripe";
import vendorModel from '../models/vendorModel.js';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

//config variables
const currency = "inr";
const deliveryCharge = 50;
const frontend_URL = 'http://localhost:5173';

// Placing User Order for Frontend using stripe
const placeOrder = async (req, res) => {

    try {
        const newOrder = new orderModel({
            userId: req.body.userId,
            items: req.body.items,
            amount: req.body.amount,
            address: req.body.address,
        })
        await newOrder.save();
        await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

        const line_items = req.body.items.map((item) => ({
            price_data: {
                currency: currency,
                product_data: {
                    name: item.name
                },
                unit_amount: item.price * 100 
            },
            quantity: item.quantity
        }))

        line_items.push({
            price_data: {
                currency: currency,
                product_data: {
                    name: "Delivery Charge"
                },
                unit_amount: deliveryCharge * 100
            },
            quantity: 1
        })

        const session = await stripe.checkout.sessions.create({
            success_url: `${frontend_URL}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${frontend_URL}/verify?success=false&orderId=${newOrder._id}`,
            line_items: line_items,
            mode: 'payment',
        });

        res.json({ success: true, session_url: session.url });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }
}

// Placing User Order for Frontend using stripe
const placeOrderCod = async (req, res) => {

    try {
        const newOrder = new orderModel({
            userId: req.body.userId,
            items: req.body.items,
            amount: req.body.amount,
            address: req.body.address,
            payment: true,
        })
        await newOrder.save();
        await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

        res.json({ success: true, message: "Order Placed" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }
}

// Listing Order for Admin panel
const listOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({});
        res.json({ success: true, data: orders })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }
}

// User Orders for Frontend
const userOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({ userId: req.body.userId });
        res.json({ success: true, data: orders })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }
}

const updateStatus = async (req, res) => {
    console.log(req.body);
    try {
        await orderModel.findByIdAndUpdate(req.body.orderId, { status: req.body.status });
        res.json({ success: true, message: "Status Updated" })
    } catch (error) {
        res.json({ success: false, message: "Error" })
    }

}

// Vendor-protected: update status only for orders that include items from this vendor
const vendorUpdateStatus = async (req, res) => {
    try {
        const vendor = await vendorModel.findOne({ ownerId: req.userId });
        if (!vendor) return res.json({ success: false, message: 'Not a vendor' });

        const { orderId, status } = req.body;
        if (!orderId || !status) return res.json({ success: false, message: 'orderId and status required' });

        const order = await orderModel.findById(orderId);
        if (!order) return res.json({ success: false, message: 'Order not found' });

        const vendorIdStr = String(vendor._id);
        const ownerIdStr = String(vendor.ownerId);

        const contains = (order.items || []).some(item => {
            const vid = item.vendorId ? String(item.vendorId) : null;
            return vid === vendorIdStr || vid === ownerIdStr;
        });

        if (!contains) return res.json({ success: false, message: 'Not authorized to update this order' });

        order.status = status;
        await order.save();
        try {
            const io = req.app.get('io');
            if (io) {
                // notify vendors (this vendor)
                const vendorId = vendor._id && String(vendor._id);
                if (vendorId) io.to(`vendor:${vendorId}`).emit('order:update', { orderId: order._id, status: order.status });
                // notify vendor owner room
                if (vendor.ownerId) io.to(`vendor-owner:${vendor.ownerId}`).emit('order:update', { orderId: order._id, status: order.status });
                // also notify customer who ordered
                if (order.userId) io.to(`user:${order.userId}`).emit('order:update', { orderId: order._id, status: order.status });
            }
        } catch(e){}
    res.json({ success: true, data: order });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error' });
    }
}

const verifyOrder = async (req, res) => {
    const { orderId, success } = req.body;
    try {
        if (success === "true") {
            await orderModel.findByIdAndUpdate(orderId, { payment: true });
            res.json({ success: true, message: "Paid" })
        }
        else {
            await orderModel.findByIdAndDelete(orderId)
            res.json({ success: false, message: "Not Paid" })
        }
    } catch (error) {
        res.json({ success: false, message: "Not  Verified" })
    }
}



// Orders containing items from a given vendor
const vendorOrders = async (req, res) => {
    try {
        let { vendorId } = req.body;

        // If vendorId was not provided, and the requester is authenticated,
        // try to find the vendor owned by this user (common case for vendor owners).
        const requesterId = req.userId || req.body.userId;
        if (!vendorId) {
            if (!requesterId) return res.json({ success: false, message: 'vendorId required' });
            const myVendor = await vendorModel.findOne({ ownerId: requesterId });
            if (!myVendor) return res.json({ success: true, data: [] });
            vendorId = myVendor._id.toString();
        }

    // Try to match orders where items.vendorId equals vendor._id or vendor.ownerId
    // We'll attempt a MongoDB query that checks items.vendorId in either form.
    const vendorObj = await vendorModel.findById(vendorId);
    const ownerId = vendorObj ? String(vendorObj.ownerId) : null;

    const matchIds = [String(vendorId)];
    if (ownerId && !matchIds.includes(ownerId)) matchIds.push(ownerId);

    // also include ObjectId forms so queries match fields stored as ObjectId
    const objectIds = matchIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
    const queryIds = [...matchIds, ...objectIds];

        const orders = await orderModel.find({ 'items.vendorId': { $in: queryIds } });

    // For vendor view, only include the items that belong to this vendor.
    const filteredOrders = orders.map(o => {
        const items = (o.items || []).filter(item => {
            // item.vendorId might be stored as a string or as an ObjectId
            const vid = item.vendorId ? String(item.vendorId) : null;
            const matchesString = vid && matchIds.includes(vid);
            const matchesObjectId = item.vendorId && objectIds.some(oid => {
                try { return oid.equals(item.vendorId); } catch (e) { return String(oid) === String(item.vendorId); }
            });
            return Boolean(matchesString || matchesObjectId);
        });
        return {
            _id: o._id,
            userId: o.userId,
            items,
            amount: o.amount,
            address: o.address,
            status: o.status,
            assignedDelivery: o.assignedDelivery,
            claimedBy: o.claimedBy,
            pickedAt: o.pickedAt,
            deliveredAt: o.deliveredAt,
            date: o.date,
            payment: o.payment
        };
    }).filter(o => (o.items || []).length > 0);

    res.json({ success: true, data: filteredOrders });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error' });
    }
}

// For delivery users: list orders that contain items from vendors assigned to this delivery user
const deliveryOrders = async (req, res) => {
    try {
        const deliveryUserId = req.body.userId || req.userId;
        if (!deliveryUserId) return res.json({ success: false, message: 'Not authorized' });

    // find vendors where this delivery user is assigned
    const vendorQueryVals = [String(deliveryUserId)];
    if (mongoose.Types.ObjectId.isValid(String(deliveryUserId))) vendorQueryVals.push(new mongoose.Types.ObjectId(String(deliveryUserId)));
    const vendors = await vendorModel.find({ deliveryBoys: { $in: vendorQueryVals } });
        if (!vendors || vendors.length === 0) return res.json({ success: true, data: [] });

        // build list of matching ids: include vendor._id and vendor.ownerId for legacy items
        const matchIds = [];
        vendors.forEach(v => {
            if (v && v._id) {
                const id = String(v._id);
                if (!matchIds.includes(id)) matchIds.push(id);
            }
            if (v && v.ownerId) {
                const oid = String(v.ownerId);
                if (!matchIds.includes(oid)) matchIds.push(oid);
            }
        });

        if (matchIds.length === 0) return res.json({ success: true, data: [] });

        // include ObjectId forms so queries match fields stored as ObjectId
    const objectIds = matchIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
        const queryIds = [...matchIds, ...objectIds];

        // Query orders that have at least one item with a vendorId matching any id in queryIds
        const orders = await orderModel.find({ 'items.vendorId': { $in: queryIds } });

        // For delivery view, include only the items that belong to the assigned vendors
        const filteredOrders = orders.map(o => {
            const items = (o.items || []).filter(item => {
                const vid = item.vendorId ? String(item.vendorId) : null;
                const matchesString = vid && matchIds.includes(vid);
                const matchesObjectId = item.vendorId && objectIds.some(oid => {
                    try { return oid.equals(item.vendorId); } catch (e) { return String(oid) === String(item.vendorId); }
                });
                return Boolean(matchesString || matchesObjectId);
            });
            return {
                _id: o._id,
                userId: o.userId,
                items,
                amount: o.amount,
                address: o.address,
                status: o.status,
                assignedDelivery: o.assignedDelivery,
                claimedBy: o.claimedBy,
                pickedAt: o.pickedAt,
                deliveredAt: o.deliveredAt,
                date: o.date,
                payment: o.payment
            };
        }).filter(o => (o.items || []).length > 0);

        res.json({ success: true, data: filteredOrders });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error' });
    }
}

// exports moved to the end so delivery helper functions are included

// Delivery user claims an order (if unclaimed)
const claimOrder = async (req, res) => {
    try {
        const deliveryUserId = req.body.userId || req.userId;
        const { orderId } = req.body;
        if (!deliveryUserId) return res.json({ success: false, message: 'Not authorized' });
        if (!orderId) return res.json({ success: false, message: 'orderId required' });

        const order = await orderModel.findById(orderId);
        if (!order) return res.json({ success: false, message: 'Order not found' });

        // If order already claimed by someone else
        if (order.claimedBy && order.claimedBy !== deliveryUserId) {
            return res.json({ success: false, message: 'Order already claimed' });
        }

    order.claimedBy = deliveryUserId;
    order.status = 'Accepted by delivery';
    await order.save();
        // emit socket events to relevant rooms (vendors, vendor owners, and the customer)
        try {
            const io = req.app.get('io');
            if (io) {
                // notify customer
                if (order.userId) io.to(`user:${order.userId}`).emit('order:update', { orderId: order._id, status: order.status, claimedBy: order.claimedBy });
                // notify vendors referenced in items
                const vendorIds = Array.from(new Set((order.items || []).map(it => it.vendorId).filter(Boolean).map(String)));
                for (const vid of vendorIds) {
                    io.to(`vendor:${vid}`).emit('order:update', { orderId: order._id, status: order.status, claimedBy: order.claimedBy });
                    // try to find owner id to notify owner room
                    try { const v = await vendorModel.findById(vid); if (v && v.ownerId) io.to(`vendor-owner:${v.ownerId}`).emit('order:update', { orderId: order._id, status: order.status, claimedBy: order.claimedBy }); } catch(e){}
                }
            }
        } catch(e){}
    res.json({ success: true, data: order });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error' });
    }
}

const markPicked = async (req, res) => {
    try {
        const deliveryUserId = req.body.userId || req.userId;
        const { orderId } = req.body;
        if (!deliveryUserId) return res.json({ success: false, message: 'Not authorized' });
        if (!orderId) return res.json({ success: false, message: 'orderId required' });

        const order = await orderModel.findById(orderId);
        if (!order) return res.json({ success: false, message: 'Order not found' });
        if (order.claimedBy !== deliveryUserId) return res.json({ success: false, message: 'Not claimed by you' });

    order.pickedAt = new Date();
    order.status = 'Picked up';
    await order.save();
        try {
            const io = req.app.get('io');
            if (io) {
                if (order.userId) io.to(`user:${order.userId}`).emit('order:update', { orderId: order._id, status: order.status, pickedAt: order.pickedAt });
                const vendorIds = Array.from(new Set((order.items || []).map(it => it.vendorId).filter(Boolean).map(String)));
                for (const vid of vendorIds) {
                    io.to(`vendor:${vid}`).emit('order:update', { orderId: order._id, status: order.status, pickedAt: order.pickedAt });
                    try { const v = await vendorModel.findById(vid); if (v && v.ownerId) io.to(`vendor-owner:${v.ownerId}`).emit('order:update', { orderId: order._id, status: order.status, pickedAt: order.pickedAt }); } catch(e){}
                }
            }
        } catch(e){}
    res.json({ success: true, data: order });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error' });
    }
}

const markDelivered = async (req, res) => {
    try {
        const deliveryUserId = req.body.userId || req.userId;
        const { orderId } = req.body;
        if (!deliveryUserId) return res.json({ success: false, message: 'Not authorized' });
        if (!orderId) return res.json({ success: false, message: 'orderId required' });

        const order = await orderModel.findById(orderId);
        if (!order) return res.json({ success: false, message: 'Order not found' });
        if (order.claimedBy !== deliveryUserId) return res.json({ success: false, message: 'Not claimed by you' });

    order.deliveredAt = new Date();
    order.status = 'Delivered';
    await order.save();
        try {
            const io = req.app.get('io');
            if (io) {
                if (order.userId) io.to(`user:${order.userId}`).emit('order:update', { orderId: order._id, status: order.status, deliveredAt: order.deliveredAt });
                const vendorIds = Array.from(new Set((order.items || []).map(it => it.vendorId).filter(Boolean).map(String)));
                for (const vid of vendorIds) {
                    io.to(`vendor:${vid}`).emit('order:update', { orderId: order._id, status: order.status, deliveredAt: order.deliveredAt });
                    try { const v = await vendorModel.findById(vid); if (v && v.ownerId) io.to(`vendor-owner:${v.ownerId}`).emit('order:update', { orderId: order._id, status: order.status, deliveredAt: order.deliveredAt }); } catch(e){}
                }
            }
        } catch(e){}
    res.json({ success: true, data: order });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error' });
    }
}

// Delivery user: update live location for an order they claimed/are assigned to
const updateDeliveryLocation = async (req, res) => {
    try {
        const deliveryUserId = req.body.userId || req.userId;
        const { orderId, lat, lng } = req.body;
        if (!deliveryUserId) return res.json({ success: false, message: 'Not authorized' });
        if (!orderId || lat == null || lng == null) return res.json({ success: false, message: 'orderId, lat and lng required' });

        const order = await orderModel.findById(orderId);
        if (!order) return res.json({ success: false, message: 'Order not found' });

        // only the assigned or claimed delivery user can update location
        if (order.claimedBy && String(order.claimedBy) !== String(deliveryUserId) && order.assignedDelivery && String(order.assignedDelivery) !== String(deliveryUserId)) {
            return res.json({ success: false, message: 'Not authorized to update location for this order' });
        }

        // Log the update (low-volume) for debugging
        console.log(`[updateDeliveryLocation] order=${orderId} by=${deliveryUserId} lat=${lat} lng=${lng}`);

        order.deliveryLocation = { lat: Number(lat), lng: Number(lng), updatedAt: new Date(), userId: String(deliveryUserId) };
        await order.save();
        // Emit real-time update to sockets: order-specific room and the ordering user
        try {
            const io = req.app.get('io');
            const payload = { orderId: order._id, lat: order.deliveryLocation.lat, lng: order.deliveryLocation.lng, updatedAt: order.deliveryLocation.updatedAt };
            if (io) {
                io.to(`order:${String(order._id)}`).emit('order:location', payload);
                if (order.userId) io.to(`user:${order.userId}`).emit('order:location', payload);
            }
        } catch (e) { console.warn('emit order:location failed', e) }

        res.json({ success: true, data: order.deliveryLocation });
    } catch (error) {
        console.error('updateDeliveryLocation error', error);
        res.json({ success: false, message: 'Error' });
    }
}

// Anyone (customer/vendor/delivery) can fetch latest delivery location for an order
const getDeliveryLocation = async (req, res) => {
    try {
        const { orderId } = req.body;
        if (!orderId) return res.json({ success: false, message: 'orderId required' });
        const requesterId = req.body.userId || req.userId;
        if (!requesterId) return res.json({ success: false, message: 'Not authorized' });

        // Fetch necessary fields for authorization checks
        const order = await orderModel.findById(orderId, { deliveryLocation: 1, userId: 1, claimedBy: 1, assignedDelivery: 1, items: 1 });
        if (!order) return res.json({ success: false, message: 'Order not found' });

        // Allow customer, assigned/claimed delivery user, or vendor owner of any item to fetch location
        let authorized = false;
        if (order.userId && String(order.userId) === String(requesterId)) authorized = true;
        if (order.claimedBy && String(order.claimedBy) === String(requesterId)) authorized = true;
        if (order.assignedDelivery && String(order.assignedDelivery) === String(requesterId)) authorized = true;

        if (!authorized) {
            // Check if requester is owner of any vendor referenced by the order items
            const myVendors = await vendorModel.find({ ownerId: requesterId });
            if (myVendors && myVendors.length > 0) {
                const matchIds = [];
                myVendors.forEach(v => {
                    if (v && v._id) matchIds.push(String(v._id));
                    if (v && v.ownerId) matchIds.push(String(v.ownerId));
                });
                if (matchIds.length > 0) {
                    for (const item of (order.items || [])) {
                        const vid = item.vendorId ? String(item.vendorId) : null;
                        if (vid && matchIds.includes(vid)) {
                            authorized = true;
                            break;
                        }
                    }
                }
            }
        }

        if (!authorized) return res.json({ success: false, message: 'Not authorized to view location' });

        // Log the fetch for low-volume debugging
        console.log(`[getDeliveryLocation] order=${orderId} requestedBy=${requesterId} locationPresent=${!!(order.deliveryLocation)} `);

        res.json({ success: true, data: order.deliveryLocation || null });
    } catch (error) {
        console.error('getDeliveryLocation error', error);
        res.json({ success: false, message: 'Error' });
    }
}

export { placeOrder, listOrders, userOrders, updateStatus, verifyOrder, placeOrderCod, vendorOrders, deliveryOrders, claimOrder, markPicked, markDelivered, vendorUpdateStatus, updateDeliveryLocation, getDeliveryLocation };