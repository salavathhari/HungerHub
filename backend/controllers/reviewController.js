import reviewModel from '../models/reviewModel.js'
import foodModel from '../models/foodModel.js'
import userModel from '../models/userModel.js'

const addReview = async (req, res) => {
  try {
    // req.userId is set by authMiddleware
    const requesterId = req.userId || req.body.userId
    if (!requesterId) return res.status(401).json({ success: false, message: 'Not authorized' })

    const { entityType, entityId, rating, comment } = req.body
    if (!entityType || !entityId) return res.status(400).json({ success: false, message: 'Missing entityType or entityId' })

    // determine userName: prefer provided, otherwise fetch from users collection
    let userName = req.body.userName
    if (!userName) {
      try {
        const user = await userModel.findById(requesterId)
        userName = user ? (user.name || user.email || 'Anonymous') : 'Anonymous'
      } catch (e) {
        userName = 'Anonymous'
      }
    }

    const review = new reviewModel({ entityType, entityId, userId: requesterId, userName, rating, comment })
    await review.save()

    // Optionally update aggregate rating for food items when a food review is added
    if (entityType === 'food' && rating) {
      try {
        const food = await foodModel.findById(entityId)
        if (food) {
          const newCount = (food.ratingCount || 0) + 1
          const newAvg = ((food.averageRating || 0) * (food.ratingCount || 0) + Number(rating)) / newCount
          food.ratingCount = newCount
          food.averageRating = newAvg
          await food.save()
        }
      } catch (e) { /* non-fatal */ }
    }

    res.json({ success: true, data: review })
  } catch (e) {
    console.error('addReview failed', e)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const listReviews = async (req, res) => {
  try {
    const { entityType, entityId } = req.query
    if (!entityType || !entityId) return res.status(400).json({ success: false, message: 'Missing params' })
    const reviews = await reviewModel.find({ entityType, entityId }).sort({ createdAt: -1 })
    res.json({ success: true, data: reviews })
  } catch (e) {
    console.error('listReviews failed', e)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

export { addReview, listReviews }
