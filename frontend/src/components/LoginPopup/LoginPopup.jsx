import React, { useContext, useState } from 'react'
import './LoginPopup.css'
import { assets } from '../../assets/assets'
import { StoreContext } from '../../Context/StoreContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { ROLES } from '../../constants/roles'

const LoginPopup = ({ setShowLogin }) => {

    const { setToken, url,loadCartData, setRole, flashAuth, triggerAuthAnim } = useContext(StoreContext)
    const navigate = useNavigate()
    // default to Login to reduce accidental register submissions
    const [currState, setCurrState] = useState("Login");

    const [data, setData] = useState({
        name: "",
        email: "",
        password: ""
    })

    const [role, setLocalRole] = useState('user')
    const [showForgot, setShowForgot] = useState(false)
    const [forgotEmail, setForgotEmail] = useState('')

    const onChangeHandler = (event) => {
        const name = event.target.name
        const value = event.target.value
        setData(data => ({ ...data, [name]: value }))
    }

    const onLogin = async (e) => {
        e.preventDefault()

        let new_url = url;
        if (currState === "Login") {
            new_url += "/api/user/login";
        }
        else {
            new_url += "/api/user/register"
        }
        const payload = { ...data };
        if (currState !== 'Login') payload.role = role;
        try {
            const response = await axios.post(new_url, payload);
                        if (response && response.data && response.data.success) {
                                setToken(response.data.token)
                                if (response.data.role) setRole(response.data.role)
                                if (flashAuth) flashAuth('success', 'Signed in successfully')
                                if (triggerAuthAnim) triggerAuthAnim('pulse')
                                try { if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') { window.localStorage.setItem('token', response.data.token); if (response.data.role) window.localStorage.setItem('role', response.data.role) } } catch(e) {}
                                // show auth flash
                                try { const { flashAuth } = require('../../Context/StoreContext'); } catch(e){}
                                try { if (typeof window !== 'undefined') {
                                    const sc = require('../../Context/StoreContext');
                                }} catch(e){}
                try {
                    if (response.data.role && window.localStorage && typeof window.localStorage.setItem === 'function') window.localStorage.setItem('role', response.data.role)
                    if (window.localStorage && typeof window.localStorage.setItem === 'function') window.localStorage.setItem('token', response.data.token)
                } catch (e) { console.warn('Failed to write token/role to localStorage', e) }
                try { await loadCartData({token:response.data.token}) } catch(e){ console.error('loadCartData failed', e) }
                setShowLogin(false)
                if (response.data.role === 'vendor') {
                    navigate('/vendor/products', { replace: true })
                } else if (response.data.role === 'delivery') {
                    navigate('/delivery', { replace: true })
                }
            } else if (response && response.data) {
                toast.error(response.data.message || 'Login failed')
                console.error('Login response:', response.data)
            } else {
                toast.error('Unexpected login response')
                console.error('Unexpected login response', response)
            }
        } catch (err) {
            // network or server error
            console.error('Login error', err)
            const msg = err.response && err.response.data && err.response.data.message ? err.response.data.message : (err.message || 'Network error')
            toast.error(msg)
        }
    }

    return (
        <div className='login-popup'>
            <form onSubmit={onLogin} className="login-popup-container">
                <div className="login-popup-title">
                    <h2>{currState}</h2> <img onClick={() => setShowLogin(false)} src={assets.cross_icon} alt="" />
                </div>
                <div className="login-popup-inputs">
                    {currState === "Sign Up" ? <input name='name' onChange={onChangeHandler} value={data.name} type="text" placeholder='Your name' required /> : <></>}
                    <input name='email' onChange={onChangeHandler} value={data.email} type="email" placeholder='Your email' />
                    <input name='password' onChange={onChangeHandler} value={data.password} type="password" placeholder='Password' required />
                    {currState === 'Sign Up' && (
                        <div className='role-select'>
                            {ROLES.map(r => (
                                <label key={r.value}><input type='radio' name='role' value={r.value} checked={role===r.value} onChange={(e)=>setLocalRole(e.target.value)}/> {r.label}</label>
                            ))}
                        </div>
                    )}
                </div>
                <button>{currState === "Login" ? "Login" : "Create account"}</button>
                <div className='login-extras'>
                    <button type='button' className='google-signin responsive-google' onClick={async ()=>{
                        try{
                            // confirm role selection when signing up with Google
                            if (currState === 'Sign Up') {
                                const sel = ROLES.find(r=>r.value === role)
                                const label = sel ? sel.label : role
                                const proceed = window.confirm(`You are about to sign up with Google as: ${label}\n\nProceed?`)
                                if (!proceed) return
                                const roleParam = `?role=${encodeURIComponent(role)}`
                                window.location.href = url + '/api/user/auth/google' + roleParam
                                return
                            }

                            // If we're in Login mode, ask the user whether they intend to sign in
                            // or go to Sign Up to choose a role for Google sign-up.
                            const wantToSignIn = window.confirm('Do you want to sign in with Google?\n\nPress OK to sign in with Google (existing account). Press Cancel to go to Sign Up and choose a role before using Google.')
                            if (wantToSignIn) {
                                // proceed with sign-in (no role param)
                                window.location.href = url + '/api/user/auth/google'
                            } else {
                                // navigate to Signup so user can pick a role, then start Google there
                                setShowLogin(false)
                                navigate('/signup')
                            }
                        } catch (e) {
                            console.error(e);
                            toast.error('Google sign-in failed')
                        }
                    }}>
                        <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.22 9.22 3.22l6.9-6.9C35.37 2.12 30.99 0.5 24 0.5 14.98 0.5 7.12 5.6 3.44 13.47l7.98 6.2C13.62 13 18.42 9.5 24 9.5z"/>
                            <path fill="#34A853" d="M46.5 24c0-1.6-.14-2.8-.44-4.02H24v8.02h12.8c-.56 3.02-2.6 5.6-5.5 7.34l8.38 6.48C44.24 36.02 46.5 30.5 46.5 24z"/>
                            <path fill="#4A90E2" d="M11.42 28.67A14.4 14.4 0 0 1 10.2 24c0-1.6.28-3.1.82-4.52l-7.98-6.2C0.6 15.87 0 19.86 0 24s.6 8.13 3.04 11.72l8.38-6.05z"/>
                            <path fill="#FBBC05" d="M24 46.5c6.99 0 12.37-2.62 16.68-7.08l-8.38-6.48c-2.42 1.62-5.5 2.6-8.3 2.6-5.58 0-10.38-3.5-12.76-8.68l-7.98 6.2C7.12 42.4 14.98 46.5 24 46.5z"/>
                        </svg>
                        <span>{currState === 'Sign Up' ? 'Sign up with Google' : 'Sign in with Google'}</span>
                    </button>
                    {currState === 'Login' && (
                        <button type='button' className='link-like' onClick={()=>setShowForgot(true)}>Forgot password?</button>
                    )}
                </div>

                {showForgot && (
                    <div className='forgot-container'>
                        <h4>Forgot password</h4>
                        <input type='email' placeholder='Your email' value={forgotEmail} onChange={(e)=>setForgotEmail(e.target.value)} />
                        <div className='forgot-actions'>
                            <button type='button' onClick={async ()=>{
                                try{
                                    const resp = await axios.post(url + '/api/user/forgot-password', { email: forgotEmail })
                                    if (resp.data && resp.data.success) {
                                        toast.success('Reset link generated. Opening reset page...')
                                        // navigate to reset page with token/email if backend returned resetLink
                                        if (resp.data.resetLink) {
                                            // backend returns full reset link; open it in a new tab
                                            window.open(resp.data.resetLink, '_blank')
                                        } else {
                                            // otherwise navigate to reset-password with email prefilled
                                            navigate('/reset-password?email=' + encodeURIComponent(forgotEmail))
                                        }
                                        setShowForgot(false)
                                    } else {
                                        toast.error(resp.data.message || 'Failed')
                                    }
                                } catch (e) { console.error(e); toast.error('Request failed') }
                            }}>Send reset link</button>
                            <button type='button' className='link-like' onClick={()=>setShowForgot(false)}>Cancel</button>
                        </div>
                    </div>
                )}
                <div className="login-popup-condition">
                    <input type="checkbox" name="" id="" required/>
                    <p>By continuing, i agree to the terms of use & privacy policy.</p>
                </div>
                {currState === "Login"
                    ? <p>Don't have an account? <span onClick={() => { setShowLogin(false); navigate('/signup?role=' + encodeURIComponent(role)) }}>Sign up</span></p>
                    : <p>Already have an account? <span onClick={() => setCurrState('Login')}>Login here</span></p>
                }
            </form>
        </div>
    )
}

export default LoginPopup
