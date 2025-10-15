import mongoose from "mongoose";

const foodSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true},
    image: { type: String, required: true },
    category:{ type:String, required:true},
    // Rating fields added to allow customers to rate food items
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 }
    ,
    vendorId: { type: String, required: false }
})

const foodModel = mongoose.models.food || mongoose.model("food", foodSchema);
export default foodModel;