import mongoose from 'mongoose';
import orderModel from '../models/orderModel.js';
import vendorModel from '../models/vendorModel.js';
import { connectDB } from '../config/db.js';

async function inspect() {
  await connectDB();

  const orders = await orderModel.find({});
  console.log('Total orders:', orders.length);

  const vendorIdSamples = new Map();
  const unknownVendorIdOrders = [];

  // Build vendor id set (both _id and ownerId in string form)
  const vendors = await vendorModel.find({});
  const vendorIdSet = new Set();
  vendors.forEach(v => {
    vendorIdSet.add(String(v._id));
    if (v.ownerId) vendorIdSet.add(String(v.ownerId));
  });

  for (const o of orders) {
    const itemVendorIds = (o.items || []).map(it => ({ raw: it.vendorId, asString: it.vendorId ? String(it.vendorId) : null, isObjectId: it.vendorId && mongoose.Types.ObjectId.isValid(String(it.vendorId)) }));
    itemVendorIds.forEach(v => {
      if (!vendorIdSamples.has(v.asString)) vendorIdSamples.set(v.asString, { count: 0, isObjectId: v.isObjectId });
      vendorIdSamples.get(v.asString).count++;
    });

    // check if any item vendorId doesn't match known vendors
    const mismatch = (o.items || []).some(it => {
      const s = it.vendorId ? String(it.vendorId) : null;
      return s && !vendorIdSet.has(s);
    });
    if (mismatch) unknownVendorIdOrders.push({ orderId: String(o._id), items: (o.items||[]).map(it => ({ vendorId: it.vendorId })) });
  }

  console.log('Unique vendorId samples (string -> {count,isObjectId}):');
  for (const [k,v] of vendorIdSamples.entries()) {
    if (!k) continue;
    console.log(k, v);
  }

  console.log('Orders that contain vendorIds not matching any vendor._id or vendor.ownerId:', unknownVendorIdOrders.length);
  unknownVendorIdOrders.slice(0,20).forEach(o => console.log(JSON.stringify(o)));

  process.exit(0);
}

inspect().catch(e => { console.error(e); process.exit(1); });
