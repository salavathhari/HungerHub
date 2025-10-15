import express from 'express';
import { addFood, listFood, removeFood, rateFood, getFoodById, updateFood } from '../controllers/foodController.js';
import authMiddleware from '../middleware/auth.js';
import requireRole from '../middleware/role.js';
import multer from 'multer';
const foodRouter = express.Router();

//Image Storage Engine (Saving Image to uploads folder & rename it)

import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: path.join(__dirname, '..', 'uploads'),
    filename: (req, file, cb) => {
        return cb(null,`${Date.now()}${file.originalname}`);
    }
})

const upload = multer({ storage: storage})

foodRouter.get("/list",listFood);
foodRouter.post("/add", authMiddleware, requireRole('vendor'), upload.single('image'), addFood);
foodRouter.post("/rate", rateFood);
foodRouter.post("/remove",removeFood);
foodRouter.get('/item/:id', getFoodById);
foodRouter.post('/update', authMiddleware, requireRole('vendor'), upload.single('image'), updateFood);

export default foodRouter;