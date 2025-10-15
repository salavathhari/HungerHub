import vendorModel from '../models/vendorModel.js';
import userModel from '../models/userModel.js';

const createVendor = async (req, res) => {
    try {
        const { name, address, phone } = req.body;
        const ownerId = req.body.userId;
        if (!ownerId) return res.json({ success: false, message: 'Not authorized' });

        // ensure a vendor (restaurant) per owner is unique
        const existing = await vendorModel.findOne({ ownerId });
        if (existing) {
            return res.json({ success: false, message: 'A vendor account already exists for this user' });
        }

        const vendor = new vendorModel({ name, address, phone, ownerId });
        await vendor.save();
        res.json({ success: true, data: vendor });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error' });
    }
}

const listVendors = async (req, res) => {
    try {
        const vendors = await vendorModel.find({});
        res.json({ success: true, data: vendors });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error' });
    }
}

const getMyVendor = async (req, res) => {
    try {
        const ownerId = req.body.userId || req.userId || (req.user && req.user._id);
        if (!ownerId) return res.json({ success: false, message: 'Not authorized' });
        const vendor = await vendorModel.findOne({ ownerId });
        res.json({ success: true, data: vendor || null });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error' });
    }
}

// Assign a delivery user (by userId) to a vendor - only vendor owner should call
const assignDeliveryBoy = async (req, res) => {
    try {
        const ownerId = req.body.userId || req.userId;
        const { vendorId, deliveryUserId } = req.body;
        if (!ownerId) return res.json({ success: false, message: 'Not authorized' });
        if (!vendorId || !deliveryUserId) return res.json({ success: false, message: 'vendorId and deliveryUserId required' });

        const vendor = await vendorModel.findById(vendorId);
        if (!vendor) return res.json({ success: false, message: 'Vendor not found' });
        if (vendor.ownerId !== ownerId) return res.json({ success: false, message: 'Not vendor owner' });

        if (!vendor.deliveryBoys.includes(deliveryUserId)) {
            vendor.deliveryBoys.push(deliveryUserId);
            await vendor.save();
        }
        res.json({ success: true, data: vendor });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error' });
    }
}

// Unassign a delivery user from vendor
const unassignDeliveryBoy = async (req, res) => {
    try {
        const ownerId = req.body.userId || req.userId;
        const { vendorId, deliveryUserId } = req.body;
        if (!ownerId) return res.json({ success: false, message: 'Not authorized' });
        if (!vendorId || !deliveryUserId) return res.json({ success: false, message: 'vendorId and deliveryUserId required' });

        const vendor = await vendorModel.findById(vendorId);
        if (!vendor) return res.json({ success: false, message: 'Vendor not found' });
        if (vendor.ownerId !== ownerId) return res.json({ success: false, message: 'Not vendor owner' });

        vendor.deliveryBoys = vendor.deliveryBoys.filter(id => id !== deliveryUserId);
        await vendor.save();
        res.json({ success: true, data: vendor });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error' });
    }
}

// List vendors assigned to a delivery user
const listAssignedVendors = async (req, res) => {
    try {
        const deliveryUserId = req.body.userId || req.userId;
        if (!deliveryUserId) return res.json({ success: false, message: 'Not authorized' });
        const vendors = await vendorModel.find({ deliveryBoys: deliveryUserId });
        res.json({ success: true, data: vendors });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error' });
    }
}

// For vendor owner: list delivery users assigned to a specific vendor (returns basic profile info)
const listDeliveryUsersForVendor = async (req, res) => {
    try {
        const ownerId = req.body.userId || req.userId;
        const { vendorId } = req.body;
        if (!ownerId) return res.json({ success: false, message: 'Not authorized' });
        if (!vendorId) return res.json({ success: false, message: 'vendorId required' });

        const vendor = await vendorModel.findById(vendorId);
        if (!vendor) return res.json({ success: false, message: 'Vendor not found' });
        if (vendor.ownerId !== ownerId) return res.json({ success: false, message: 'Not vendor owner' });

        const deliveryIds = vendor.deliveryBoys || [];
        if (deliveryIds.length === 0) return res.json({ success: true, data: [] });

        const users = await userModel.find({ _id: { $in: deliveryIds } }, { name: 1, email: 1, role: 1 });
        res.json({ success: true, data: users });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error' });
    }
}

// Admin/vendor-owner helper: find user by email (returns basic profile) - protected to vendors
const findUserByEmail = async (req, res) => {
    try {
        const ownerId = req.body.userId || req.userId;
        if (!ownerId) return res.json({ success: false, message: 'Not authorized' });
        const { email } = req.body;
        if (!email) return res.json({ success: false, message: 'email required' });
        const user = await userModel.findOne({ email }, { name: 1, email: 1, role: 1 });
        if (!user) return res.json({ success: false, message: 'User not found' });
        res.json({ success: true, data: user });
    } catch (error) {
        console.error('findUserByEmail error', error);
        res.json({ success: false, message: 'Error' });
    }
}

// Delivery user: request to join a vendor (vendor owner will accept/reject)
const requestJoinVendor = async (req, res) => {
    try {
        const userId = req.body.userId || req.userId;
        const { vendorId } = req.body;
        if (!userId) return res.json({ success: false, message: 'Not authorized' });
        if (!vendorId) return res.json({ success: false, message: 'vendorId required' });

        const vendor = await vendorModel.findById(vendorId);
        if (!vendor) return res.json({ success: false, message: 'Vendor not found' });

        // Already assigned?
        if (vendor.deliveryBoys && vendor.deliveryBoys.includes(userId)) return res.json({ success: false, message: 'Already assigned to this vendor' });

        // Existing pending request?
        vendor.deliveryRequests = vendor.deliveryRequests || [];
        const existing = vendor.deliveryRequests.find(r => String(r.userId) === String(userId) && r.status === 'pending');
        if (existing) return res.json({ success: false, message: 'Request already pending' });

        const reqObj = { userId, status: 'pending', requestedAt: new Date() };
        vendor.deliveryRequests.push(reqObj);
        await vendor.save();
        res.json({ success: true, data: reqObj });
    } catch (error) {
        console.error('requestJoinVendor error', error);
        res.json({ success: false, message: 'Error' });
    }
}

// Vendor owner: list delivery registration requests for their vendor
const listDeliveryRequests = async (req, res) => {
    try {
        const ownerId = req.body.userId || req.userId;
        const { vendorId } = req.body; // optional - if omitted, use owner's vendor
        if (!ownerId) return res.json({ success: false, message: 'Not authorized' });

        const vendor = vendorId ? await vendorModel.findById(vendorId) : await vendorModel.findOne({ ownerId });
        if (!vendor) return res.json({ success: true, data: [] });
        if (vendor.ownerId !== ownerId) return res.json({ success: false, message: 'Not vendor owner' });

        const requests = vendor.deliveryRequests || [];
        if (requests.length === 0) return res.json({ success: true, data: [] });

        // enrich with basic user info
        const userIds = requests.map(r => r.userId);
        const users = await userModel.find({ _id: { $in: userIds } }, { name: 1, email: 1 });
        const enriched = requests.map(r => ({ ...r, user: users.find(u => String(u._id) === String(r.userId)) || null }));
        res.json({ success: true, data: enriched });
    } catch (error) {
        console.error('listDeliveryRequests error', error);
        res.json({ success: false, message: 'Error' });
    }
}

// Vendor owner: accept or reject a delivery registration request
const respondDeliveryRequest = async (req, res) => {
    try {
        const ownerId = req.body.userId || req.userId;
        const { vendorId, userId: targetUserId, action } = req.body; // action: 'accept' | 'reject'
        if (!ownerId) return res.json({ success: false, message: 'Not authorized' });
        if (!vendorId || !targetUserId || !action) return res.json({ success: false, message: 'vendorId, userId and action required' });

        const vendor = await vendorModel.findById(vendorId);
        if (!vendor) return res.json({ success: false, message: 'Vendor not found' });
        if (vendor.ownerId !== ownerId) return res.json({ success: false, message: 'Not vendor owner' });

        vendor.deliveryRequests = vendor.deliveryRequests || [];
        const idx = vendor.deliveryRequests.findIndex(r => String(r.userId) === String(targetUserId) && r.status === 'pending');
        if (idx === -1) return res.json({ success: false, message: 'No pending request found for this user' });

        const now = new Date();
        vendor.deliveryRequests[idx].status = action === 'accept' ? 'accepted' : 'rejected';
        vendor.deliveryRequests[idx].respondedAt = now;
        vendor.deliveryRequests[idx].responderId = ownerId;

        // If accepted, add to deliveryBoys if not already
        if (action === 'accept') {
            vendor.deliveryBoys = vendor.deliveryBoys || [];
            if (!vendor.deliveryBoys.includes(targetUserId)) vendor.deliveryBoys.push(targetUserId);
        }

        await vendor.save();
        res.json({ success: true, data: { vendor, request: vendor.deliveryRequests[idx] } });
    } catch (error) {
        console.error('respondDeliveryRequest error', error);
        res.json({ success: false, message: 'Error' });
    }
}

export { createVendor, listVendors, getMyVendor, assignDeliveryBoy, unassignDeliveryBoy, listAssignedVendors, listDeliveryUsersForVendor, findUserByEmail, debugVendorOrders, requestJoinVendor, listDeliveryRequests, respondDeliveryRequest };

// Update vendor details (owner only)
const updateVendor = async (req, res) => {
    try {
        const ownerId = req.body.userId || req.userId;
        if (!ownerId) return res.json({ success: false, message: 'Not authorized' });
        const { name, address, phone } = req.body;
        const vendor = await vendorModel.findOne({ ownerId });
        if (!vendor) return res.json({ success: false, message: 'Vendor not found' });

        if (name) vendor.name = name;
        if (address) vendor.address = address;
        if (phone) vendor.phone = phone;

        await vendor.save();
        res.json({ success: true, data: vendor });
    } catch (error) {
        console.error('updateVendor error', error);
        res.json({ success: false, message: 'Error' });
    }
}

export { updateVendor };

// Diagnostic: return vendor debug info to help inspect matching ids and sample orders
const debugVendorOrders = async (req, res) => {
    try {
        const ownerId = req.body.userId || req.userId;
        if (!ownerId) return res.json({ success: false, message: 'Not authorized' });
        const vendor = await vendorModel.findOne({ ownerId });
        if (!vendor) return res.json({ success: true, data: { vendor: null, message: 'No vendor for this owner' } });

        // build match ids like vendorOrders does
        const matchIds = [String(vendor._id)];
        if (vendor.ownerId && !matchIds.includes(String(vendor.ownerId))) matchIds.push(String(vendor.ownerId));
        const objectIds = matchIds.filter(id => require('mongoose').Types.ObjectId.isValid(id)).map(id => new (require('mongoose').Types.ObjectId)(id));
        const queryIds = [...matchIds, ...objectIds];

        // sample a few orders that match
        const orderModel = (await import('../models/orderModel.js')).default;
        const orders = await orderModel.find({ 'items.vendorId': { $in: queryIds } }).limit(10);

        res.json({ success: true, data: { vendor, matchIds, queryIdsCount: queryIds.length, ordersFound: orders.length, sampleOrders: orders.slice(0,3) } });
    } catch (error) {
        console.error('debugVendorOrders error', error);
        res.json({ success: false, message: 'Error' });
    }
}
