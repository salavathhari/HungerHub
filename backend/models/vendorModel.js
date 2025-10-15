import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    ownerId: { type: String, required: true }, // user who created vendor
    address: { type: Object, default: {} },
    phone: { type: String },
    // pending/processed delivery registration requests and assigned delivery persons
    deliveryRequests: { type: [{ userId: String, status: String, requestedAt: Date, respondedAt: Date, responderId: String }], default: [] },
    // array of userIds who are assigned as delivery persons for this vendor
    deliveryBoys: { type: [String], default: [] }
}, { timestamps: true });

const vendorModel = mongoose.models.vendor || mongoose.model('vendor', vendorSchema);
export default vendorModel;
