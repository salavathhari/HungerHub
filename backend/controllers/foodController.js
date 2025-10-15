import foodModel from "../models/foodModel.js";
import vendorModel from '../models/vendorModel.js';
import fs from 'fs'

// all food list
const listFood = async (req, res) => {
    try {
        const foods = await foodModel.find({})
        res.json({ success: true, data: foods })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }

}

// add food
const addFood = async (req, res) => {

    try {
        let image_filename = `${req.file.filename}`

        const foodData = {
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            category: req.body.category,
            image: image_filename,
        };
        // If auth middleware sets req.userId, prefer that (multer may clear body)
        const vendorId = req.userId || req.body.userId;
        if (vendorId) {
            // prefer storing the vendor document _id on the food item
            try {
                const myVendor = await vendorModel.findOne({ ownerId: vendorId });
                if (myVendor && myVendor._id) {
                    foodData.vendorId = String(myVendor._id);
                } else {
                    // fallback: store the user id if vendor not found (legacy)
                    foodData.vendorId = vendorId;
                }
            } catch (e) {
                foodData.vendorId = vendorId;
            }
        }

        const food = new foodModel(foodData)

        await food.save();
        res.json({ success: true, message: "Food Added" })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }
}

// delete food
const removeFood = async (req, res) => {
    try {

        const food = await foodModel.findById(req.body.id);
        fs.unlink(`uploads/${food.image}`, () => { })

        await foodModel.findByIdAndDelete(req.body.id)
        res.json({ success: true, message: "Food Removed" })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }

}

// get single food by id
const getFoodById = async (req, res) => {
    try {
        const id = req.params.id;
        const food = await foodModel.findById(id);
        if (!food) return res.json({ success: false, message: 'Not found' });
        res.json({ success: true, data: food });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error' })
    }
}

// update food (supports optional image upload)
const updateFood = async (req, res) => {
    try {
        const id = req.body.id || req.params.id;
        const food = await foodModel.findById(id);
        if (!food) return res.json({ success: false, message: 'Not found' });

        // ensure vendor owns this product
            // ensure vendor owns this product
            const requesterId = req.userId || req.body.userId;
            if (!requesterId) return res.json({ success: false, message: 'Not authorized' });

            // find vendor document for this requester (if any)
            const myVendor = await vendorModel.findOne({ ownerId: requesterId });
            const owns = myVendor && ((String(food.vendorId) === String(myVendor._id)) || (String(food.vendorId) === String(myVendor.ownerId)));
            // if there's no vendor doc, also allow if food.vendorId equals requesterId (legacy)
            const legacyOwns = String(food.vendorId) === String(requesterId);

            if (!owns && !legacyOwns) {
                return res.json({ success: false, message: 'Not authorized' });
            }

        // update fields
        const updates = {};
        if (req.body.name) updates.name = req.body.name;
        if (req.body.description) updates.description = req.body.description;
        if (req.body.price) updates.price = req.body.price;
        if (req.body.category) updates.category = req.body.category;

        // handle image replacement
        if (req.file && req.file.filename) {
            // remove old image file
            try { fs.unlinkSync(`uploads/${food.image}`) } catch (e) {}
            updates.image = req.file.filename;
        }

        await foodModel.findByIdAndUpdate(id, updates, { new: true })
        res.json({ success: true, message: 'Food updated' })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error' })
    }
}

// export functions after all are defined to avoid TDZ for const-declared handlers

// rate food
const rateFood = async (req, res) => {
    try {
        const { id, rating } = req.body;
        const food = await foodModel.findById(id);
        if (!food) return res.status(404).json({ success: false, message: 'Food not found' });

        // Update average rating
        const newCount = (food.ratingCount || 0) + 1;
        const newAvg = ((food.averageRating || 0) * (food.ratingCount || 0) + Number(rating)) / newCount;

        food.ratingCount = newCount;
        food.averageRating = newAvg;
        await food.save();

        res.json({ success: true, message: 'Rating submitted', data: { averageRating: food.averageRating, ratingCount: food.ratingCount } });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error' })
    }
}

export { listFood, addFood, removeFood, rateFood, getFoodById, updateFood }