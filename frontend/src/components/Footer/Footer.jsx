import React from 'react'
import './Footer.css'
import { assets } from '../../assets/assets'

const Footer = () => {
  return (
    <div className='footer' id='footer'>
      <div className='footer-inner'>
        <div className='brand'>
          <img className='footer-logo' src={assets.logo} alt='HungerHub' />
          <div className='tagline'>Delicious food delivered fast — discover restaurants near you.</div>
          <div className='social-row' style={{marginTop:8}}>
            <img src={assets.facebook_icon} alt='facebook' />
            <img src={assets.twitter_icon} alt='twitter' />
            <img src={assets.linkedin_icon} alt='linkedin' />
          </div>
        </div>

        <div>
          <h4>Company</h4>
          <ul>
            <li>Home</li>
            <li>About us</li>
            <li>Delivery</li>
            <li>Privacy policy</li>
          </ul>
        </div>

        <div>
          <h4>Support</h4>
          <ul>
            <li>Help Center</li>
            <li>Cancellation</li>
            <li>FAQ</li>
          </ul>
        </div>

        <div className='footer-cta'>
          <h4>Get the app</h4>
          <div style={{display:'flex', gap:8}}>
            <button className='download-btn'>
              <img src={assets.logo} alt='' style={{width:20,height:20,borderRadius:4}} />
              <span>Download App</span>
            </button>
          </div>
        </div>

      </div>

      <div className='footer-bottom'>
        <div className='footer-copyright'>Copyright 2024 © HungerHub - All Rights Reserved.</div>
        <div style={{color:'var(--muted)'}}>Made with ❤️ for hungry people</div>
      </div>

    </div>
  )
}

export default Footer
