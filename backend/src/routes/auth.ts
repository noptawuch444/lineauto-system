import express from 'express';
import axios from 'axios';
import { userService } from '../services/userService';

const router = express.Router();

// Verify LINE Login and Create/Update User
router.post('/login', async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ error: 'ID Token is required' });
        }

        // Verify ID Token with LINE
        const verifyUrl = 'https://api.line.me/oauth2/v2.1/verify';
        const response = await axios.post(verifyUrl,
            new URLSearchParams({
                id_token: idToken,
                client_id: process.env.LINE_LOGIN_CHANNEL_ID || ''
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const { sub: lineUserId, name, picture } = response.data;

        // Create or update user in database
        const user = await userService.syncUser(lineUserId, name, picture);

        res.json({
            success: true,
            user: {
                id: user.id,
                lineUserId: user.lineUserId,
                displayName: user.displayName,
                pictureUrl: user.pictureUrl,
                role: user.role,
                status: user.status
            }
        });
    } catch (error: any) {
        console.error('Login error:', error.response?.data || error);
        res.status(401).json({
            error: 'Authentication failed',
            details: error.response?.data || error.message
        });
    }
});

// Get current user info
router.get('/me', async (req, res) => {
    try {
        const { lineUserId } = req.query;

        if (!lineUserId || typeof lineUserId !== 'string') {
            return res.status(400).json({ error: 'LINE User ID is required' });
        }

        const user = await userService.getUserByLineId(lineUserId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            user: {
                id: user.id,
                lineUserId: user.lineUserId,
                displayName: user.displayName,
                pictureUrl: user.pictureUrl,
                role: user.role,
                status: user.status,
                assignedGroups: user.assignedGroups
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

export default router;
