import React, { useContext, useEffect, useState, useRef } from 'react'
import './Navbar.css'
import { assets } from '../../assets/assets'
import { Link, useNavigate } from 'react-router-dom'
import { StoreContext } from '../../Context/StoreContext'
import HeroSearch from '../HeroSearch/HeroSearch'

const Navbar = ({ setShowLogin }) => {
  const [menu, setMenu] = useState('home')
  const { getTotalCartAmount, token, setToken, role, setRole, myVendor, viewMode, flashAuth } = useContext(StoreContext)
  const navigate = useNavigate()

  const [showProfile, setShowProfile] = useState(false)
  const profileRef = useRef(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { triggerAuthAnim, authAnim } = useContext(StoreContext)

  useEffect(() => {
    console.debug('Navbar role:', role)
  }, [role])

  // close dropdown when clicking outside
  useEffect(() => {
    const onDoc = (e) => {
      if (showProfile && profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false)
      }
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [showProfile])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    setToken('')
    if (setRole) setRole('user')
    if (flashAuth) flashAuth('info', 'Signed out')
    if (triggerAuthAnim) triggerAuthAnim('logout')
    setShowProfile(false)
    navigate('/')
  }

  return (
    <div className='navbar'>
      {authAnim && authAnim.active && authAnim.type === 'logout' && (
        <div className='logout-fade'>
          <div style={{fontSize:18}}>Signing out...</div>
        </div>
      )}
      <Link to='/'><img className='logo' src={assets.logo} alt='' /></Link>
  <ul className={`navbar-menu ${mobileOpen ? 'open' : ''}`}>
    {role === 'vendor' && viewMode !== 'customer' ? (
          <>
            {!myVendor && <Link to='/vendor/create' onClick={() => setMenu('vendor-create')} className={`${menu === 'vendor-create' ? 'active' : ''}`}>create restaurant</Link>}
            {myVendor && <Link to='/vendor/add-product' onClick={() => setMenu('vendor-add')} className={`${menu === 'vendor-add' ? 'active' : ''}`}>add product</Link>}
            <Link to='/vendor/products' onClick={() => setMenu('vendor-products')} className={`${menu === 'vendor-products' ? 'active' : ''}`}>all products</Link>
            <Link to='/vendor/orders' onClick={() => setMenu('vendor-orders')} className={`${menu === 'vendor-orders' ? 'active' : ''}`}>orders</Link>
          </>
        ) : (
          // show delivery dashboard link for delivery users
          role === 'delivery' ? (
            <>
              <Link to='/delivery' onClick={() => setMenu('delivery')} className={`${menu === 'delivery' ? 'active' : ''}`}>delivery</Link>
            </>
          ) : (
            <>
              {/* Compact restaurant search + location form replaces static links */}
              <li className="navbar-search-item">
                <HeroSearch onSubmit={(q, l) => { setMenu('search'); navigate(`/?q=${encodeURIComponent(q || '')}&loc=${encodeURIComponent(l || '')}`) }} className="navbar-embedded" />
              </li>
            </>
          )
        )}
      </ul>

      {/* mobile hamburger */}
      <button className={`navbar-hamburger ${mobileOpen ? 'is-open' : ''}`} aria-label='Toggle menu' onClick={() => setMobileOpen(s => !s)}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className='navbar-right'>
        {role !== 'vendor' && role !== 'delivery' && (
          <>
            <img src={assets.search_icon} alt='' />
            <Link to='/cart' className='navbar-search-icon'>
              <img src={assets.basket_icon} alt='' />
              <div className={getTotalCartAmount() > 0 ? 'dot' : ''}></div>
            </Link>
          </>
        )}

        {token && role === 'vendor' && (
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            {myVendor && myVendor.name && <div style={{fontSize:14, color:'#333'}}> {myVendor.name} </div>}
            <button className='navbar-logout-button' onClick={logout} title='Logout'>
              <img src={assets.logout_icon} alt='logout' style={{width:18, marginRight:8}} /> Logout
            </button>
          </div>
        )}

        {token && role === 'delivery' && (
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <Link to='/delivery' className='btn btn-sm btn-outline'>Dashboard</Link>
            <button className='navbar-logout-button' onClick={logout} title='Logout'>
              <img src={assets.logout_icon} alt='logout' style={{width:18, marginRight:8}} /> Logout
            </button>
          </div>
        )}

        {!token ? (
          <button onClick={() => setShowLogin(true)}>Sign in</button>
        ) : (
          // hide the small profile icon for delivery users; delivery sidebar has logout
          role !== 'vendor' && role !== 'delivery' ? (
              <div className={`navbar-profile ${showProfile ? 'open' : ''}`} ref={profileRef}>
                <img
                  src={assets.profile_icon}
                  alt='profile'
                  onClick={() => setShowProfile(s => !s)}
                  style={{ cursor: 'pointer' }}
                  className={authAnim && authAnim.type === 'pulse' ? 'avatar-pulse' : ''}
                />
              <ul className='navbar-profile-dropdown'>
                <li onClick={() => { setShowProfile(false); navigate('/myorders') }}> <img src={assets.bag_icon} alt='' /> <p>Orders</p></li>
                <hr />
                <li onClick={logout}> <img src={assets.logout_icon} alt='' /> <p>Logout</p></li>
              </ul>
            </div>
          ) : null
        )}
      </div>
    </div>
  )
}

export default Navbar
