import express from 'express';
import { middleware, WebhookEvent, Client, validateSignature } from '@line/bot-sdk';
import { lineGroupService } from '../services/lineGroupService';
import prisma from '../services/db';

const router = express.Router();

/**
 * Diagnostic endpoint
 */
router.get('/', (req, res) => {
    res.json({ status: 'Webhook system is online' });
});

/**
 * Multi-Bot Webhook Handler
 * URL: https://your-domain.com/webhook/:id
 */
router.post('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Find bot credentials from database
        const bot = await prisma.lineBot.findUnique({ where: { id } });

        if (!bot) {
            console.error(`[WEBHOOK] Bot not found: ${id}`);
            return res.status(404).send('Bot not found');
        }

        // 2. Signature Validation (SECURITY)
        const signature = req.headers['x-line-signature'] as string;
        const body = (req as any).rawBody || JSON.stringify(req.body); // Fallback to body string if rawBody missed

        // Note: LINE Verify sends a request with no events to check 200 OK
        if (!signature && req.body.events?.length === 0) {
            return res.status(200).send('Verify OK');
        }

        if (bot.channelSecret && signature) {
            // If secret exists, we MUST validate
            const isValid = validateSignature(body, bot.channelSecret, signature);
            if (!isValid) {
                console.error(`[WEBHOOK] Invalid signature for bot: ${bot.name}`);
                return res.status(401).send('Invalid signature');
            }
        }

        // 3. Process Events
        const events: WebhookEvent[] = req.body.events;
        if (!events || events.length === 0) {
            return res.status(200).send('OK');
        }

        const client = new Client({
            channelAccessToken: bot.channelAccessToken,
            channelSecret: bot.channelSecret || undefined
        });

        await Promise.all(events.map(event => handleEvent(event, client)));

        res.status(200).send('OK');
    } catch (error: any) {
        console.error(`[WEBHOOK ERROR] Bot ${id}:`, error.message);
        res.status(500).send('Internal Server Error');
    }
});

/**
 * Default Webhook (Backward compatibility or fallback)
 * Uses ENV variables if available
 */
router.post('/', (req, res, next) => {
    const secret = process.env.LINE_CHANNEL_SECRET;
    if (!secret) return res.status(200).send('No default bot configured');

    middleware({ channelSecret: secret })(req, res, next);
}, async (req, res) => {
    const secret = process.env.LINE_CHANNEL_SECRET;
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) return res.status(200).send('OK');

    const client = new Client({ channelAccessToken: token, channelSecret: secret });
    const events: WebhookEvent[] = req.body.events;
    await Promise.all(events.map(event => handleEvent(event, client)));
    res.status(200).send('OK');
});

async function handleEvent(event: WebhookEvent, client: Client) {
    if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim().toLowerCase();

        if (text === '!id' || text === '.id') {
            const source = event.source;
            let targetId = '';
            let targetType = '';

            if (source.type === 'group') { targetId = source.groupId; targetType = 'Group ID'; }
            else if (source.type === 'room') { targetId = source.roomId; targetType = 'Room ID'; }
            else if (source.type === 'user') { targetId = source.userId; targetType = 'User ID'; }

            if (targetId) {
                try {
                    await client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: `${targetType}: ${targetId}`
                    });
                } catch (err) { console.error('Reply failed:', err); }
            }
        }
    }

    // Sync Group Info
    if (['join', 'memberJoined', 'message'].includes(event.type)) {
        const source = event.source;
        if (source.type === 'group' && source.groupId) {
            try {
                const groupSummary = await client.getGroupSummary(source.groupId);
                await lineGroupService.syncGroup(source.groupId, groupSummary.groupName, groupSummary.pictureUrl);
            } catch (err) {
                await lineGroupService.syncGroup(source.groupId);
            }
        }
    }
}

export default router;
