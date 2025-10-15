import React, { useEffect, useState, useContext } from 'react'
import axios from 'axios'
import { StoreContext } from '../../Context/StoreContext'

const ReviewsList = ({ entityType, entityId, refreshToken }) => {
  const { url } = useContext(StoreContext)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  // fetch reviews (called on mount, when entity changes, or when refreshToken changes)
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const resp = await axios.get(url + '/api/review/list', { params: { entityType, entityId } })
        if (!cancelled) setReviews(resp.data.data || [])
      } catch (e) {
        console.warn('load reviews failed', e)
      } finally { if (!cancelled) setLoading(false) }
    }
    if (entityType && entityId) load()
    return () => { cancelled = true }
  }, [entityType, entityId, url, refreshToken])

  // listen for review events in the same window (useful when ReviewForm posts and dispatches)
  useEffect(() => {
    const handler = async (e) => {
      try {
        if (!e || !e.detail) return
        const d = e.detail
        if (d.entityType !== entityType) return
        if (String(d.entityId) !== String(entityId)) return
        const resp = await axios.get(url + '/api/review/list', { params: { entityType, entityId } })
        setReviews(resp.data.data || [])
      } catch (err) {
        console.warn('refresh reviews handler failed', err)
      }
    }
    window.addEventListener('review:added', handler)
    return () => window.removeEventListener('review:added', handler)
  }, [entityType, entityId, url])

  if (loading) return <div>Loading reviews...</div>
  if (!reviews || reviews.length === 0) return <div>No reviews yet. Be the first to review.</div>

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {reviews.map(r => (
        <div key={r._id} style={{border:'1px solid rgba(0,0,0,0.04)', padding:10, borderRadius:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontWeight:600}}>{r.userName || 'Anonymous'}</div>
            <div style={{color:'#f59e0b'}}>{r.rating ? '★'.repeat(r.rating) : '—'}</div>
          </div>
          <div style={{color:'#666', marginTop:6}}>{r.comment}</div>
          <div style={{fontSize:12,color:'#999',marginTop:8}}>{new Date(r.createdAt).toLocaleString()}</div>
        </div>
      ))}
    </div>
  )
}

export default ReviewsList
