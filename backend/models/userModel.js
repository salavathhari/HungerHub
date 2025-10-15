import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    cartData:{type:Object,default:{}},
    // role: 'user' | 'vendor' | 'delivery'
    role: { type: String, enum: ['user','vendor','delivery'], default: 'user' },
    // password reset token and expiry (dev-friendly flow)
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null }
}, { minimize: false })

const userModel = mongoose.models.user || mongoose.model("user", userSchema);
export default userModel;