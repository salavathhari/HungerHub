import express from 'express';
import { loginUser, registerUser, forgotPassword, resetPassword, googleOAuthCallback, getProfile } from '../controllers/userController.js';
import authMiddleware from '../middleware/auth.js';
const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/forgot-password", forgotPassword);
userRouter.post("/reset-password", resetPassword);

// Google OAuth stub: in production you'd redirect to Google's OAuth flow
userRouter.get('/auth/google', (req, res) => {
	// Return a Google OAuth URL if configured, otherwise return a helpful error for devs
	const clientId = process.env.GOOGLE_CLIENT_ID;
	const redirectUri = process.env.GOOGLE_REDIRECT_URI;
	if (!clientId || !redirectUri) {
		return res.status(400).json({ success: false, message: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI in your environment.' });
	}
	const scope = encodeURIComponent('profile email');
	// allow a `role` query param to be passed from frontend (for signup flows)
	// and serialize it into the OAuth `state` so it round-trips back in the callback.
	let stateObj = {};
	if (req.query && req.query.role) stateObj.role = req.query.role;
	const stateParam = Object.keys(stateObj).length ? `&state=${encodeURIComponent(JSON.stringify(stateObj))}` : '';
	const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent${stateParam}`;
	// debug mode: return the URL as JSON so developers can inspect it (visit ?debug=1)
	if (req.query && req.query.debug === '1') {
		console.log('[OAuth debug] generated google url:', url);
		return res.json({ success: true, url });
	}
	// If the request prefers JSON (API client) return URL, otherwise redirect the browser to Google
	const accept = req.headers.accept || '';
	if (accept.indexOf('application/json') !== -1) {
		return res.json({ success: true, url });
	}
	return res.redirect(url);
})

	// Google OAuth callback endpoint (redirect target configured in Google Console should point here)
	userRouter.get('/auth/google/callback', googleOAuthCallback);

	userRouter.get('/me', authMiddleware, getProfile);

export default userRouter;