import React, { useContext } from 'react'
import './Sidebar.css'
import { Link, useNavigate } from 'react-router-dom'
import { StoreContext } from '../../Context/StoreContext'
import { assets } from '../../assets/assets'

const Sidebar = ({ setShowLogin }) => {
  const navigate = useNavigate()
  const { role, token, setToken, setRole, setCartItems, myVendor, getTotalCartAmount } = useContext(StoreContext)

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    setToken('')
    setRole('user')
    setCartItems({})
    navigate('/')
  }

  return (
    <aside className='app-sidebar'>
      <div className='sidebar-top'>
        <img src={assets.logo} alt='logo' className='sidebar-logo' />
      </div>

      <nav className='sidebar-nav'>
        {role === 'vendor' ? (
          <ul>
            {!myVendor && <li onClick={() => navigate('/vendor/create')}>Create restaurant</li>}
            {myVendor && <li onClick={() => navigate('/vendor/add-product')}>Add product</li>}
            <li onClick={() => navigate('/vendor/products')}>All products</li>
            <li onClick={() => navigate('/vendor/orders')}>Orders</li>
            {myVendor && <li onClick={() => navigate('/vendor/edit')}>Edit restaurant</li>}
            <li onClick={() => navigate('/vendor/manage-delivery')}>Manage delivery</li>
          </ul>
        ) : role === 'delivery' ? (
          <ul>
            <li onClick={() => navigate('/delivery')}>Dashboard</li>
            <li onClick={() => navigate('/delivery/debug')}>Debug</li>
            <li onClick={() => navigate('/myorders')}>My orders</li>
          </ul>
        ) : (
          <ul>
            <li><Link to='/'>Home</Link></li>
            <li><a href='#explore-menu'>Menu</a></li>
            <li><Link to='/cart'>Cart <span className='badge'>{getTotalCartAmount() > 0 ? getTotalCartAmount() : ''}</span></Link></li>
            <li><a href='#app-download'>Mobile app</a></li>
            <li><Link to='/verify'>Verify</Link></li>
          </ul>
        )}
      </nav>

      <div className='sidebar-bottom'>
        {!token ? (
          <button className='btn signin' onClick={() => setShowLogin(true)}>Sign in</button>
        ) : (
          <>
            <button className='btn logout' onClick={logout}>Logout</button>
          </>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
