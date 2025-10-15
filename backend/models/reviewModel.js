import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema({
  entityType: { type: String, enum: ['food','vendor'], required: true },
  entityId: { type: String, required: true },
  userId: { type: String },
  userName: { type: String },
  rating: { type: Number, default: 0 },
  comment: { type: String, default: '' },
}, { timestamps: true })

const reviewModel = mongoose.models.review || mongoose.model('review', reviewSchema)
export default reviewModel
