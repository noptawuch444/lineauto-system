import { Router } from 'express';
import * as liffScheduleService from '../services/liffScheduleService';

const router = Router();

/**
 * GET /api/liff/my-groups
 * Get groups assigned to the authenticated user
 */
router.get('/my-groups', async (req, res) => {
    try {
        const lineUserId = req.query.lineUserId as string;
        
        if (!lineUserId) {
            return res.status(400).json({ error: 'LINE User ID is required' });
        }

        const result = await liffScheduleService.getMyGroups(lineUserId);
        res.json(result);
    } catch (error: any) {
        console.error('Error fetching user groups:', error);
        res.status(404).json({ error: error.message || 'Failed to fetch groups' });
    }
});

/**
 * POST /api/liff/schedule
 * Create a scheduled message
 */
router.post('/schedule', async (req, res) => {
    try {
        const { lineUserId, content, scheduledTime, targetGroupId, imageUrl } = req.body;

        if (!lineUserId || !content || !scheduledTime || !targetGroupId) {
            return res.status(400).json({ 
                error: 'Missing required fields: lineUserId, content, scheduledTime, targetGroupId' 
            });
        }

        const message = await liffScheduleService.createScheduledMessage(
            lineUserId,
            content,
            new Date(scheduledTime),
            targetGroupId,
            imageUrl
        );

        res.status(201).json(message);
    } catch (error: any) {
        console.error('Error creating scheduled message:', error);
        
        if (error.message === 'User not found') {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (error.message.includes('permission')) {
            return res.status(403).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to create scheduled message' });
    }
});

/**
 * GET /api/liff/my-messages
 * Get all scheduled messages created by the authenticated user
 */
router.get('/my-messages', async (req, res) => {
    try {
        const lineUserId = req.query.lineUserId as string;
        
        if (!lineUserId) {
            return res.status(400).json({ error: 'LINE User ID is required' });
        }

        const messages = await liffScheduleService.getMyMessages(lineUserId);
        res.json(messages);
    } catch (error: any) {
        console.error('Error fetching user messages:', error);
        res.status(404).json({ error: error.message || 'Failed to fetch messages' });
    }
});

export default router;
