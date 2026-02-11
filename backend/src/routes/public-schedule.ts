import express from 'express';
import { publicScheduleService } from '../services/publicScheduleService';

const router = express.Router();

// Get available groups for a user code
router.get('/user/:userCode/groups', async (req, res) => {
    try {
        const { userCode } = req.params;

        if (!userCode) {
            return res.status(400).json({ error: 'User code is required' });
        }

        const groups = await publicScheduleService.getAvailableGroups(userCode);

        res.json({
            success: true,
            groups
        });
    } catch (error: any) {
        console.error('Error fetching groups:', error);
        res.status(error.message === 'User not found' ? 404 : 500).json({
            error: error.message || 'Failed to fetch groups'
        });
    }
});

// Create scheduled message
router.post('/schedule', async (req, res) => {
    try {
        const { userCode, content, scheduledTime, targetGroupId, imageUrl } = req.body;

        if (!userCode || !content || !scheduledTime || !targetGroupId) {
            return res.status(400).json({
                error: 'userCode, content, scheduledTime, and targetGroupId are required'
            });
        }

        const message = await publicScheduleService.createScheduledMessage(
            userCode,
            content,
            new Date(scheduledTime),
            targetGroupId,
            imageUrl
        );

        res.json({
            success: true,
            message
        });
    } catch (error: any) {
        console.error('Error creating scheduled message:', error);
        res.status(error.message.includes('not found') || error.message.includes('access') ? 403 : 500).json({
            error: error.message || 'Failed to create scheduled message'
        });
    }
});

// Get user's scheduled messages
router.get('/user/:userCode/messages', async (req, res) => {
    try {
        const { userCode } = req.params;

        if (!userCode) {
            return res.status(400).json({ error: 'User code is required' });
        }

        const messages = await publicScheduleService.getUserScheduledMessages(userCode);

        res.json({
            success: true,
            messages
        });
    } catch (error: any) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            error: error.message || 'Failed to fetch messages'
        });
    }
});

export default router;
