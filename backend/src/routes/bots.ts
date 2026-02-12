import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/bots - List all bots
 */
router.get('/', async (req, res) => {
    try {
        const bots = await prisma.lineBot.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(bots);
    } catch (error: any) {
        console.error('Error fetching bots:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/bots - Create new bot
 */
router.post('/', async (req, res) => {
    try {
        const { name, channelAccessToken, channelSecret } = req.body;

        if (!name || !channelAccessToken) {
            return res.status(400).json({ error: 'Name and Channel Access Token are required' });
        }

        const bot = await prisma.lineBot.create({
            data: {
                name,
                channelAccessToken,
                channelSecret: channelSecret || null,
                isActive: true
            }
        });

        res.status(201).json(bot);
    } catch (error: any) {
        console.error('Error creating bot:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/bots/:id - Update bot
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, channelAccessToken, channelSecret, isActive } = req.body;

        const bot = await prisma.lineBot.update({
            where: { id },
            data: {
                name,
                channelAccessToken,
                channelSecret,
                isActive
            }
        });

        res.json(bot);
    } catch (error: any) {
        console.error('Error updating bot:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/bots/:id - Delete bot
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Count templates using this bot
        const templateCount = await prisma.messageTemplate.count({
            where: { botId: id }
        });

        if (templateCount > 0) {
            return res.status(400).json({ error: 'Cannot delete bot because it is assigned to templates' });
        }

        await prisma.lineBot.delete({ where: { id } });
        res.json({ message: 'Bot deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting bot:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
