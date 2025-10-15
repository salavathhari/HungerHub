import React, { useState, useContext } from 'react'
import axios from 'axios'
import { StoreContext } from '../../Context/StoreContext'

const ReviewForm = ({ entityType, entityId, onSubmitted }) => {
  const { url, token } = useContext(StoreContext)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!entityType || !entityId) return
    // require authentication
    if (!token) {
      // attempt to open existing login popup via a custom event if the app supports it
      try { window.dispatchEvent(new CustomEvent('auth:require')) } catch (e) {}
      alert('You must be signed in to submit a review. Please sign in and try again.')
      return
    }

    setSubmitting(true)
    try {
      await axios.post(url + '/api/review/add', { entityType, entityId, rating, comment }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setComment('')
      setRating(5)
      // notify listeners in this window that a review was added
      try { window.dispatchEvent(new CustomEvent('review:added', { detail: { entityType, entityId } })) } catch (e) {}
      if (typeof onSubmitted === 'function') onSubmitted()
      alert('Thanks for your review!')
    } catch (e) { console.error('submit review failed', e); alert('Failed to submit review') }
    setSubmitting(false)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <label style={{fontWeight:600}}>Rating</label>
        <select value={rating} onChange={(e)=>setRating(Number(e.target.value))}>
          {[5,4,3,2,1].map(v=> <option key={v} value={v}>{v} star{v>1?'s':''}</option>)}
        </select>
      </div>
      <textarea value={comment} onChange={(e)=>setComment(e.target.value)} placeholder='Write a short review...' rows={3} />
      <div>
        <button className='btn btn-primary' onClick={submit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit review'}</button>
      </div>
    </div>
  )
}

export default ReviewForm
