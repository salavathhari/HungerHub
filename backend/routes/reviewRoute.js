import express from 'express'
import { addReview, listReviews } from '../controllers/reviewController.js'
import authMiddleware from '../middleware/auth.js'

const router = express.Router()

// only authenticated users can add reviews
router.post('/add', authMiddleware, addReview)
router.get('/list', listReviews)

export default router
