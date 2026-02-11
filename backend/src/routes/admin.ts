import express from 'express';
import { userService } from '../services/userService';
import { lineGroupService } from '../services/lineGroupService';

const router = express.Router();

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get all groups
router.get('/groups', async (req, res) => {
    try {
        const groups = await lineGroupService.getAllGroups();
        res.json(groups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

// Assign groups to a user
router.post('/assign', async (req, res) => {
    try {
        const { userId, groupIds } = req.body;

        if (!userId || !Array.isArray(groupIds)) {
            return res.status(400).json({ error: 'userId and groupIds (array) are required' });
        }

        const updatedUser = await userService.assignGroupsToUser(userId, groupIds);

        res.json({
            success: true,
            user: updatedUser
        });
    } catch (error) {
        console.error('Error assigning groups:', error);
        res.status(500).json({ error: 'Failed to assign groups' });
    }
});

// Create user with code
router.post('/users', async (req, res) => {
    try {
        const { displayName, userCode } = req.body;

        if (!displayName || !userCode) {
            return res.status(400).json({ error: 'displayName and userCode are required' });
        }

        const user = await userService.createUserWithCode(displayName, userCode);

        res.json({
            success: true,
            user
        });
    } catch (error: any) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: error.message || 'Failed to create user' });
    }
});

export default router;
