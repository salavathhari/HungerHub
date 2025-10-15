import React, { useContext, useEffect, useState, useRef } from 'react'
import './DeliverySidebar.css'
import { useNavigate } from 'react-router-dom'
import { StoreContext } from '../../Context/StoreContext'
import axios from 'axios'

const DeliverySidebar = () => {
  const navigate = useNavigate()
  const { setToken, setRole, setCartItems, url, token, role } = useContext(StoreContext)
  const [availableCount, setAvailableCount] = useState(0)
  const polling = useRef(null)

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    setToken('')
    setRole('user')
    setCartItems({})
    navigate('/')
  }

  const fetchAvailable = async () => {
    if (!token || role !== 'delivery') return setAvailableCount(0)
    try {
  const resp = await axios.post(url + '/api/delivery/orders', { onlyPickup: true }, { headers: { Authorization: `Bearer ${token}` } })
      const orders = (resp.data && resp.data.data) || []
      try { console.debug('delivery-orders resp count=', orders.length, resp.data); } catch(e){}
      const unclaimed = orders.filter(o => !o.claimedBy).length
      setAvailableCount(unclaimed)
    } catch (e) {
      console.error('Failed to fetch delivery orders for badge', e)
      setAvailableCount(0)
    }
  }

  useEffect(() => {
    // initial fetch and start polling when delivery role active
    fetchAvailable()
    if (polling.current) clearInterval(polling.current)
    polling.current = setInterval(fetchAvailable, 15000)
    return () => { if (polling.current) clearInterval(polling.current) }
  }, [token, role])

  return (
    <div className='delivery-sidebar'>
      <div className='delivery-sidebar-header'>Delivery</div>
      <ul>
        <li onClick={()=>navigate('/myorders')}>Orders {availableCount>0 && <span className='badge'>{availableCount}</span>}</li>
        <li onClick={()=>navigate('/delivery')}>Delivery Dashboard {availableCount>0 && <span className='badge small'>{availableCount}</span>}</li>
        <hr />
        <li onClick={logout}>Logout</li>
      </ul>
    </div>
  )
}

export default DeliverySidebar
