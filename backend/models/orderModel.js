import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: {type:String,required:true},
    items: { type: Array, required:true},
    amount: { type: Number, required: true},
    address:{type:Object,required:true},
    status: {type:String,default:"Food Processing"},
    // the delivery user assigned by vendor(s) - optional
    assignedDelivery: { type: String, default: null },
    // the delivery user who claimed the order (might equal assignedDelivery)
    claimedBy: { type: String, default: null },
    // live delivery location (latest update)
    deliveryLocation: {
        lat: { type: Number },
        lng: { type: Number },
        updatedAt: { type: Date },
        userId: { type: String }
    },
    pickedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    date: {type:Date,default:Date.now()},
    payment:{type:Boolean,default:false}
})

const orderModel = mongoose.models.order || mongoose.model("order", orderSchema);
export default orderModel;