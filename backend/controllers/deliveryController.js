import vendorModel from '../models/vendorModel.js';
import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';
import mongoose from 'mongoose';

// List vendors assigned to the current delivery user
const getAssignedVendors = async (req, res) => {
  try {
    const deliveryUserId = req.body.userId || req.userId;
    if (!deliveryUserId) return res.json({ success: false, message: 'Not authorized' });
  // support vendors.deliveryBoys stored as string or ObjectId by querying both variants
  const vendorQueryVals = [String(deliveryUserId)];
  if (mongoose.Types.ObjectId.isValid(String(deliveryUserId))) vendorQueryVals.push(new mongoose.Types.ObjectId(String(deliveryUserId)));
  const vendors = await vendorModel.find({ deliveryBoys: { $in: vendorQueryVals } });
    res.json({ success: true, data: vendors });
  } catch (error) {
    console.error('getAssignedVendors error', error);
    res.json({ success: false, message: 'Error' });
  }
}

// Return delivery orders for this delivery user enriched with vendor names and buyer info.
const getDeliveryOrders = async (req, res) => {
  try {
    const deliveryUserId = req.body.userId || req.userId;
    if (!deliveryUserId) return res.json({ success: false, message: 'Not authorized' });

    // find vendors assigned to this delivery user
  const vendorQueryVals = [String(deliveryUserId)];
  if (mongoose.Types.ObjectId.isValid(String(deliveryUserId))) vendorQueryVals.push(new mongoose.Types.ObjectId(String(deliveryUserId)));
  const vendors = await vendorModel.find({ deliveryBoys: { $in: vendorQueryVals } });
    if (!vendors || vendors.length === 0) return res.json({ success: true, data: [] });

    // build match ids (string and ownerId), and include ObjectId forms
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

  const objectIds = matchIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
    const queryIds = [...matchIds, ...objectIds];

  const orders = await orderModel.find({ 'items.vendorId': { $in: queryIds } });

    // gather vendor names map for enrichment
    const vendorIds = vendors.map(v => String(v._id));
    const vendorsList = await vendorModel.find({ _id: { $in: vendorIds } });
    const vendorNameMap = {};
    vendorsList.forEach(v => { vendorNameMap[String(v._id)] = v.name; if (v.ownerId) vendorNameMap[String(v.ownerId)] = v.name });

    // gather buyer ids to fetch names
    const buyerIds = Array.from(new Set(orders.map(o => String(o.userId))));
    const buyers = await userModel.find({ _id: { $in: buyerIds } }, { name: 1, email: 1 });
    const buyerMap = {};
    buyers.forEach(b => { buyerMap[String(b._id)] = { name: b.name, email: b.email } });

    // Filter items per order and enrich
    const result = orders.map(o => {
      const items = (o.items || []).filter(item => {
        const vid = item.vendorId ? String(item.vendorId) : null;
        return vid && (queryIds.includes(vid) || objectIds.some(oid => String(oid) === vid));
      }).map(it => ({ ...it, vendorName: vendorNameMap[String(it.vendorId)] || null }));

      return {
        _id: o._id,
        userId: o.userId,
        buyer: buyerMap[String(o.userId)] || null,
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

    // Optional: when requester asks for only pickup-ready orders, filter by status
    const onlyPickup = req.body && req.body.onlyPickup;
    if (onlyPickup) {
      const pickupStatuses = ['Ready for pickup', 'Accepted by vendor'];
      const pickupOnly = result.filter(o => pickupStatuses.includes(o.status) && !o.claimedBy);
      return res.json({ success: true, data: pickupOnly });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('getDeliveryOrders error', error);
    res.json({ success: false, message: 'Error' });
  }
}

// Delivery user registers themselves to a vendor (vendorId provided)
const joinVendor = async (req, res) => {
  try {
    const deliveryUserId = req.body.userId || req.userId;
    const { vendorId } = req.body;
    if (!deliveryUserId) return res.json({ success: false, message: 'Not authorized' });
    if (!vendorId) return res.json({ success: false, message: 'vendorId required' });

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) return res.json({ success: false, message: 'Vendor not found' });

    // normalize stored deliveryBoys to strings when checking/adding
    vendor.deliveryBoys = (vendor.deliveryBoys || []).map(id => String(id));
    if (!vendor.deliveryBoys.includes(String(deliveryUserId))) {
      vendor.deliveryBoys.push(String(deliveryUserId));
      await vendor.save();
    }
    res.json({ success: true, data: vendor });
  } catch (error) {
    console.error('joinVendor error', error);
    res.json({ success: false, message: 'Error' });
  }
}

// Delivery user unregisters from a vendor
const leaveVendor = async (req, res) => {
  try {
    const deliveryUserId = req.body.userId || req.userId;
    const { vendorId } = req.body;
    if (!deliveryUserId) return res.json({ success: false, message: 'Not authorized' });
    if (!vendorId) return res.json({ success: false, message: 'vendorId required' });

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) return res.json({ success: false, message: 'Vendor not found' });

  vendor.deliveryBoys = (vendor.deliveryBoys || []).map(id => String(id)).filter(id => id !== String(deliveryUserId));
    await vendor.save();
    res.json({ success: true, data: vendor });
  } catch (error) {
    console.error('leaveVendor error', error);
    res.json({ success: false, message: 'Error' });
  }
}

export { getAssignedVendors, getDeliveryOrders, joinVendor, leaveVendor, debugDeliveryOrders }

// Diagnostic endpoint for delivery users to inspect matching ids and sample orders
const debugDeliveryOrders = async (req, res) => {
  try {
    const deliveryUserId = req.body.userId || req.userId;
    if (!deliveryUserId) return res.json({ success: false, message: 'Not authorized' });

    const vendorQueryVals = [String(deliveryUserId)];
    if (mongoose.Types.ObjectId.isValid(String(deliveryUserId))) vendorQueryVals.push(new mongoose.Types.ObjectId(String(deliveryUserId)));
    const vendors = await vendorModel.find({ deliveryBoys: { $in: vendorQueryVals } });

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

    const objectIds = matchIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
    const queryIds = [...matchIds, ...objectIds];

    const orderModel = (await import('../models/orderModel.js')).default;
    const orders = await orderModel.find({ 'items.vendorId': { $in: queryIds } }).limit(20);

    res.json({ success: true, data: { vendors, matchIds, queryIdsCount: queryIds.length, ordersFound: orders.length, sampleOrders: orders.slice(0,5) } });
  } catch (error) {
    console.error('debugDeliveryOrders error', error);
    res.json({ success: false, message: 'Error' });
  }
}
