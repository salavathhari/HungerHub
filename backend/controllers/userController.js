import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import userModel from "../models/userModel.js";
import crypto from 'crypto'

//create token
const createToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET);
}

//login user
const loginUser = async (req,res) => {
    const {email, password} = req.body;
    try{
        const user = await userModel.findOne({email})

        if(!user){
            return res.json({success:false,message: "User does not exist"})
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if(!isMatch){
            return res.json({success:false,message: "Invalid credentials"})
        }

        const token = createToken(user._id)
        res.json({success:true,token, role: user.role})
    } catch (error) {
        console.log(error);
        res.json({success:false,message:"Error"})
    }
}

//register user
const registerUser = async (req,res) => {
    const {name, email, password, role} = req.body;
    try{
        //check if user already exists
        const exists = await userModel.findOne({email})
        if(exists){
            return res.json({success:false,message: "User already exists"})
        }

        // validating email format & strong password
        if(!validator.isEmail(email)){
            return res.json({success:false,message: "Please enter a valid email"})
        }
        if(password.length<8){
            return res.json({success:false,message: "Please enter a strong password"})
        }

        // hashing user password
        const salt = await bcrypt.genSalt(10); // the more no. round the more time it will take
        const hashedPassword = await bcrypt.hash(password, salt)

    const newUser = new userModel({name, email, password: hashedPassword, role: role || 'user'})
        const user = await newUser.save()
        const token = createToken(user._id)
    res.json({success:true,token, role: user.role})

    } catch(error){
        console.log(error);
        res.json({success:false,message:"Error"})
    }
}

// exports consolidated at the bottom of the file

// forgot password (dev-friendly: returns a reset link containing a token)
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await userModel.findOne({ email });
        if (!user) return res.json({ success: false, message: 'User not found' });

        const token = crypto.randomBytes(20).toString('hex');
        const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
        user.resetToken = token;
        user.resetTokenExpiry = expiry;
        await user.save();

        // In production you would email this link. For dev, return it in the response.
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
        res.json({ success: true, resetLink, message: 'Reset link generated' });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'Error' });
    }
}

// reset password
const resetPassword = async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        const user = await userModel.findOne({ email, resetToken: token });
        if (!user) return res.json({ success: false, message: 'Invalid token or email' });
        if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) return res.json({ success: false, message: 'Token expired' });

        if (!newPassword || newPassword.length < 8) return res.json({ success: false, message: 'Password too short' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetToken = null;
        user.resetTokenExpiry = null;
        await user.save();

        res.json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'Error' });
    }
}

// consolidated exports at the end of the file

// Google OAuth callback handler: exchanges code for tokens, fetches profile, creates or finds user, and returns a JWT
const googleOAuthCallback = async (req, res) => {
    try {
        // log incoming query params to help debug missing code / error responses from Google
        console.log('[Google callback] query:', req.query);
        if (req.query && req.query.error) {
            // Google returned an error (for example access_denied)
            const errMsg = `Google error: ${req.query.error}${req.query.error_description ? ' - ' + req.query.error_description : ''}`;
            console.warn('[Google callback] provider error:', errMsg);
            return res.status(400).json({ success: false, message: errMsg, query: req.query });
        }
        const code = req.query.code;
        if (!code) return res.status(400).json({ success: false, message: 'Missing code', query: req.query });

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI;
        if (!clientId || !clientSecret || !redirectUri) return res.status(500).json({ success: false, message: 'OAuth not configured' });

        // Exchange code for tokens
        const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });
        const tokenData = await tokenResp.json();
        if (!tokenData.access_token) return res.status(400).json({ success: false, message: 'Failed to get access token' });

        // fetch profile
        const profileResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const profile = await profileResp.json();
        if (!profile || !profile.email) return res.status(400).json({ success: false, message: 'Failed to fetch profile' });

        // find or create user
        // requested role can be passed through the OAuth `state` param (preferred)
        // or (as a fallback) via a plain query param if present.
        let requestedRole = 'user';
        if (req.query && req.query.state) {
            try {
                const parsed = JSON.parse(decodeURIComponent(req.query.state));
                if (parsed && parsed.role) requestedRole = parsed.role;
            } catch (e) { /** ignore malformed state */ }
        }
        // fallback: allow role to be provided directly on the callback query (helps some dev setups)
        if ((!requestedRole || requestedRole === 'user') && req.query && req.query.role) {
            try { requestedRole = decodeURIComponent(req.query.role); } catch(e) { requestedRole = req.query.role }
        }

        console.log('[Google callback] requestedRole:', requestedRole);
        let user = await userModel.findOne({ email: profile.email });
        if (!user) {
            console.log('[Google callback] creating new user with role:', requestedRole || 'user');
            user = new userModel({ name: profile.name || profile.email.split('@')[0], email: profile.email, password: crypto.randomBytes(16).toString('hex'), role: requestedRole || 'user' });
            await user.save();
        } else {
            console.log('[Google callback] found existing user:', user.email, 'role:', user.role);
        }

                        // If the signup requested a vendor role, ensure a vendor document exists for this user
                        let autoCreatedVendor = false;
                        if (requestedRole === 'vendor') {
                            try {
                                const vendorModel = (await import('../models/vendorModel.js')).default;
                                const existingVendor = await vendorModel.findOne({ ownerId: user._id });
                                if (!existingVendor) {
                                    const vendor = new vendorModel({ name: `${user.name || 'My Restaurant'}`, ownerId: user._id, address: {}, phone: '' });
                                    await vendor.save();
                                    autoCreatedVendor = true;
                                }
                            } catch (e) {
                                console.warn('Failed to auto-create vendor record:', e);
                            }
                        }

                        const jwtToken = createToken(user._id);
                        const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
                        // Redirect to frontend OAuth callback route with the token in the query string.
                        // Add newVendor flag when we auto-created a vendor so frontend can redirect to setup.
                        const redirectTo = `${frontend}/oauth-callback?token=${jwtToken}${autoCreatedVendor ? '&newVendor=1' : ''}`;
                        return res.redirect(redirectTo);
    } catch (error) {
        console.error('Google OAuth callback error', error);
        return res.status(500).json({ success: false, message: 'OAuth callback error' });
    }
}

// Return current user's profile (protected route expects authMiddleware to set req.userId)
const getProfile = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId;
        if (!userId) return res.json({ success: false, message: 'Not authorized' });
        const user = await userModel.findById(userId, { password: 0, resetToken: 0, resetTokenExpiry: 0 });
        if (!user) return res.json({ success: false, message: 'User not found' });
        res.json({ success: true, data: user });
    } catch (error) {
        console.error('getProfile error', error);
        res.json({ success: false, message: 'Error' });
    }
}

export { loginUser, registerUser, forgotPassword, resetPassword, googleOAuthCallback, getProfile }