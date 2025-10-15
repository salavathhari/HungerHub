import userModel from '../models/userModel.js';

const requireRole = (role) => {
    return async (req, res, next) => {
        try {
            const userId = req.userId || req.body.userId;
            if (!userId) return res.json({ success: false, message: 'Not authorized' });
            const user = await userModel.findById(userId);
            if (!user) return res.json({ success: false, message: 'User not found' });
            if (user.role !== role) return res.json({ success: false, message: 'Insufficient permissions' });
            next();
        } catch (error) {
            console.log(error);
            res.json({ success: false, message: 'Error' })
        }
    }
}

export default requireRole;
