import React, { useState, useContext, useEffect } from 'react'
import { StoreContext } from './Context/StoreContext'
import Home from './pages/Home/Home'
import Footer from './components/Footer/Footer'
import Navbar from './components/Navbar/Navbar'
import { Route, Routes } from 'react-router-dom'
import Cart from './pages/Cart/Cart'
import LoginPopup from './components/LoginPopup/LoginPopup'
import PlaceOrder from './pages/PlaceOrder/PlaceOrder'
import MyOrders from './pages/MyOrders/MyOrders'
import CreateRestaurant from './pages/Vendor/CreateRestaurant'
import AddProduct from './pages/Vendor/AddProduct'
import VendorProducts from './pages/Vendor/VendorProducts'
import VendorOrders from './pages/Vendor/VendorOrders'
import EditProduct from './pages/Vendor/EditProduct'
import EditRestaurant from './pages/Vendor/EditRestaurant'
import ProductDetail from './pages/Product/ProductDetail'
import VendorPublic from './pages/Vendor/VendorPublic'
import OAuthCallback from './pages/Auth/OAuthCallback'
import Signup from './pages/Auth/Signup'
import ResetPassword from './pages/Auth/ResetPassword'
import ManageDelivery from './pages/Vendor/ManageDelivery'
import VendorSidebar from './components/VendorSidebar/VendorSidebar'
import DeliverySidebar from './components/DeliverySidebar/DeliverySidebar'
import DeliveryDashboard from './pages/Delivery/DeliveryDashboard'
import DeliveryDebug from './pages/Delivery/DeliveryDebug'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Verify from './pages/Verify/Verify'

const App = () => {

  const [showLogin,setShowLogin] = useState(false);

  useEffect(() => {
    const onAuthRequire = () => setShowLogin(true);
    window.addEventListener('auth:require', onAuthRequire);
    return () => window.removeEventListener('auth:require', onAuthRequire);
  }, [])

  // On first load, replace the current history entry so automatic redirects
  // that previously pushed entries don't cause a refresh to go back/forward.
  useEffect(() => {
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      // optional: debug popstate events
      const onPop = (e) => { console.debug('popstate event:', e); };
      window.addEventListener('popstate', onPop);
      return () => window.removeEventListener('popstate', onPop);
    } catch (e) { /* ignore in non-browser environments */ }
  }, [])

  return (
    <>
    <ToastContainer/>
    {showLogin?<LoginPopup setShowLogin={setShowLogin}/>:<></>}
      <div className='app'>
        <Navbar setShowLogin={setShowLogin}/>
        <MainLayout />
      </div>
      <Footer />
      {/* global auth flash/snackbar */}
      <AuthSnackbar />
    </>
  )
}

function AuthSnackbar() {
  const { authFlash } = useContext(StoreContext)
  if (!authFlash) return null
  return (
    <div className='snackbar-container'>
      <div className={`snackbar ${authFlash.type || 'info'}`}>
        <div className='msg'>{authFlash.message}</div>
      </div>
    </div>
  )
}

const MainLayout = () => {
  const { role, viewMode } = useContext(StoreContext)
  const { initializing } = useContext(StoreContext)
  if (initializing) return (
    <div style={{height:'60vh', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div className='spinner dark' />
        <div>Loading session...</div>
      </div>
    </div>
  )
  const isVendorUI = role === 'vendor' && viewMode !== 'customer'
  const isDelivery = role === 'delivery'
  return (
    <div style={{display:'flex', gap:16, alignItems:'flex-start'}}>
      {isVendorUI && <VendorSidebar />}
      {isDelivery && <DeliverySidebar />}
      <div style={{flex:1}}>
        <Routes>
          <Route path='/' element={<Home />}/>
          <Route path='/oauth-callback' element={<OAuthCallback />}/>
          <Route path='/signup' element={<Signup />}/>
          <Route path='/reset-password' element={<ResetPassword />}/>
          <Route path='/cart' element={<Cart />}/>
          <Route path='/order' element={<PlaceOrder />}/>
          <Route path='/vendor/create' element={<CreateRestaurant />}/>
          <Route path='/vendor/add-product' element={<AddProduct />}/>
          <Route path='/vendor/products' element={<VendorProducts />}/>
          <Route path='/vendor/orders' element={<VendorOrders />}/>
          <Route path='/vendor/edit/:id' element={<EditProduct />}/>
          <Route path='/product/:id' element={<ProductDetail />}/>
          <Route path='/vendor/:id' element={<VendorPublic />}/>
          <Route path='/vendor/edit' element={<EditRestaurant />}/>
          <Route path='/vendor/manage-delivery' element={<ManageDelivery />}/>
                <Route path='/myorders' element={<MyOrders />}/>
                <Route path='/delivery' element={<DeliveryDashboard />}/>
                <Route path='/delivery/debug' element={<DeliveryDebug />}/>
          <Route path='/verify' element={<Verify />}/>
        </Routes>
      </div>
    </div>
  )
}
export default App
