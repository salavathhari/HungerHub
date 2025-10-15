import React, { useContext } from 'react'
import './VendorSidebar.css'
import { useNavigate } from 'react-router-dom'
import { StoreContext } from '../../Context/StoreContext'

const VendorSidebar = () => {
  const navigate = useNavigate()
  const { setToken, setRole, setCartItems, myVendor, viewMode, setViewMode } = useContext(StoreContext)

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    setToken('')
    setRole('user')
    setCartItems({})
    navigate('/')
  }

  return (
    <div className='vendor-sidebar'>
      <div className='vendor-sidebar-header'>Vendor Panel</div>
      <ul>
        {!myVendor && <li onClick={()=>navigate('/vendor/create')}>Create Restaurant</li>}
        {myVendor && <li onClick={()=>navigate('/vendor/add-product')}>Add Product</li>}
        <li onClick={()=>navigate('/vendor/products')}>All Products</li>
  <li onClick={()=>navigate('/vendor/manage-delivery')}>Manage Delivery</li>
        <li onClick={()=>navigate('/vendor/orders')}>Orders</li>
        {myVendor && (
          <li style={{marginTop:8}} onClick={()=>navigate('/vendor/edit')}>Edit Restaurant</li>
        )}
        <hr />
        <li onClick={logout}>Logout</li>
      </ul>
    </div>
  )
}

export default VendorSidebar
