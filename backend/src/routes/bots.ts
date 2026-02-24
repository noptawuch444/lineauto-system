import express from 'express';
import prisma from '../services/db';
import { Client } from '@line/bot-sdk';
import { invalidateClientCache } from '../services/lineService';

const router = express.Router();

/**
 * GET /api/bots — List all bots
 */
router.get('/', async (req, res) => {
    try {
        const bots = await prisma.lineBot.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                basicId: true,
                pictureUrl: true,
                channelAccessToken: true,
                channelSecret: true,
                isActive: true,
                createdAt: true
            }
        });
        res.json(bots);
    } catch (error: any) {
        console.error('Error fetching bots:', error.message);
        res.status(500).json({ error: 'Failed to fetch bots' });
    }
});

/**
 * POST /api/bots/verify — Validate token and fetch bot profile from LINE
 */
router.post('/verify', async (req, res) => {
    const { channelAccessToken } = req.body;
    if (!channelAccessToken?.trim()) {
        return res.status(400).json({ error: 'Token is required' });
    }

    try {
        const client = new Client({ channelAccessToken: channelAccessToken.trim() });
        const botInfo = await client.getBotInfo();
        res.json({
            name: botInfo.displayName,
            basicId: botInfo.basicId,
            pictureUrl: botInfo.pictureUrl
        });
    } catch (error: any) {
        console.error('Error verifying bot token:', error.message);
        res.status(400).json({ error: 'ไม่สามารถดึงข้อมูลบอทได้ กรุณาตรวจสอบ Token' });
    }
});

/**
 * POST /api/bots — Create new bot
 */
router.post('/', async (req, res) => {
    const { name, channelAccessToken, channelSecret, basicId, pictureUrl } = req.body;

    if (!name?.trim() || !channelAccessToken?.trim()) {
        return res.status(400).json({ error: 'Name and Channel Access Token are required' });
    }

    try {
        const bot = await prisma.lineBot.create({
            data: {
                name: name.trim(),
                channelAccessToken: channelAccessToken.trim(),
                channelSecret: channelSecret?.trim() || null,
                basicId: basicId?.trim() || null,
                pictureUrl: pictureUrl?.trim() || null,
                isActive: true
            }
        });
        res.status(201).json(bot);
    } catch (error: any) {
        console.error('Error creating bot:', error.message);
        res.status(500).json({ error: 'Failed to create bot' });
    }
});

/**
 * PUT /api/bots/:id — Update bot
 */
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, channelAccessToken, channelSecret, isActive, basicId, pictureUrl } = req.body;

    try {
        const bot = await prisma.lineBot.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(channelAccessToken !== undefined && { channelAccessToken: channelAccessToken.trim() }),
                ...(channelSecret !== undefined && { channelSecret: channelSecret?.trim() || null }),
                ...(basicId !== undefined && { basicId: basicId?.trim() || null }),
                ...(pictureUrl !== undefined && { pictureUrl: pictureUrl?.trim() || null }),
                ...(isActive !== undefined && { isActive })
            }
        });

        // Invalidate LINE client cache so next send picks up new token
        invalidateClientCache(id);

        res.json(bot);
    } catch (error: any) {
        console.error('Error updating bot:', error.message);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Bot not found' });
        }
        res.status(500).json({ error: 'Failed to update bot' });
    }
});

/**
 * DELETE /api/bots/:id — Delete bot (only if not referenced by templates)
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const templateCount = await prisma.messageTemplate.count({ where: { botId: id } });

        if (templateCount > 0) {
            return res.status(400).json({
                error: `Cannot delete bot — it is assigned to ${templateCount} template(s)`
            });
        }

        await prisma.lineBot.delete({ where: { id } });

        // Clear cache entry
        invalidateClientCache(id);

        res.json({ message: 'Bot deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting bot:', error.message);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Bot not found' });
        }
        res.status(500).json({ error: 'Failed to delete bot' });
    }
});

/**
 * GET /api/bots/:id/quota — Get message quota info from LINE for a specific bot
 */
router.get('/:id/quota', async (req, res) => {
    const { id } = req.params;
    try {
        const bot = await prisma.lineBot.findUnique({ where: { id } });
        if (!bot) return res.status(404).json({ error: 'Bot not found' });

        const client = new Client({ channelAccessToken: bot.channelAccessToken });
        const axios = (await import('axios')).default;

        const headers = { Authorization: `Bearer ${bot.channelAccessToken}` };

        // Fetch quota limit and consumption in parallel
        const [quotaRes, usageRes] = await Promise.all([
            axios.get('https://api.line.me/v2/bot/message/quota', { headers }),
            axios.get('https://api.line.me/v2/bot/message/quota/consumption', { headers })
        ]);

        const quotaType = quotaRes.data.type; // 'none' or 'limited'
        const quotaLimit = quotaType === 'limited' ? quotaRes.data.value : null;
        const totalUsage = usageRes.data.totalUsage;

        res.json({
            botId: id,
            botName: bot.name,
            quotaType,
            quotaLimit,
            totalUsage,
            remaining: quotaLimit ? quotaLimit - totalUsage : null,
            percentUsed: quotaLimit ? Math.round((totalUsage / quotaLimit) * 100) : 0
        });
    } catch (error: any) {
        console.error('Error fetching quota:', error.response?.data || error.message);
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลโควตาได้', detail: error.response?.data || error.message });
    }
});

export default router;
