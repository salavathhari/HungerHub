import jwt from 'jsonwebtoken';

// Auth middleware: accepts either a custom `token` header or the standard
// `Authorization: Bearer <token>` header. On success it attaches `req.userId`.
const authMiddleware = async (req, res, next) => {
    // support multiple header formats for compatibility
    const authHeader = req.headers.authorization || req.headers.Authorization || req.headers.token || req.headers.Token || req.headers['x-access-token'];
    if (!authHeader) {
        return res.status(401).json({ success: false, message: 'Not authorized. Please log in.' });
    }

    // extract token from "Bearer <token>" or raw token
    let token = authHeader;
    if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.slice(7).trim();
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        // attach a top-level userId (and mirror into body for older handlers that expect it)
        req.userId = payload.id;
        if (!req.body) req.body = {};
        req.body.userId = payload.id;
        // also expose the token payload in case handlers need it
        req.tokenPayload = payload;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

export default authMiddleware;