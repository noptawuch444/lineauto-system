import express from 'express';
import { WebhookEvent, Client, validateSignature } from '@line/bot-sdk';
import { lineGroupService } from '../services/lineGroupService';
import prisma from '../services/db';
import bodyParser from 'body-parser';

const router = express.Router();

/**
 * Diagnostic endpoint
 */
router.get('/', (req, res) => {
    res.json({ status: 'Multi-Bot Webhook System is online' });
});

/**
 * Multi-Bot Webhook Handler with manual body parsing for signature validation
 */
router.post('/:id', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    const { id } = req.params;
    const signature = req.headers['x-line-signature'] as string;

    try {
        // 1. Find bot
        const bot = await prisma.lineBot.findUnique({ where: { id } });
        if (!bot) return res.status(404).send('Bot not found');

        // 2. Validate Signature
        const rawBody = req.body.toString();
        if (bot.channelSecret && signature) {
            const isValid = validateSignature(rawBody, bot.channelSecret, signature);
            if (!isValid) {
                console.error(`[SIG FAIL] Bot: ${bot.name} (${id})`);
                return res.status(401).send('Invalid signature');
            }
        }

        // 3. Parse Body
        const parsedBody = JSON.parse(rawBody);
        const events: WebhookEvent[] = parsedBody.events;

        if (!events || events.length === 0) {
            return res.status(200).send('OK');
        }

        const client = new Client({
            channelAccessToken: bot.channelAccessToken,
            channelSecret: bot.channelSecret || undefined
        });

        // 4. Process
        await Promise.all(events.map(event => handleEvent(event, client, bot.id)));

        res.status(200).send('OK');
    } catch (error: any) {
        console.error(`[WEBHOOK ERROR] ${id}:`, error.message);
        res.status(500).send('Internal Error');
    }
});

async function handleEvent(event: WebhookEvent, client: Client, botId: string) {
    // 1. Registration & ID Commands
    if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim().toLowerCase();
        const triggers = ['!id', '.id', '!reg', '!sync'];

        if (triggers.includes(text)) {
            const source = event.source;
            let targetId = '';
            let targetType = '';

            if (source.type === 'group') { targetId = source.groupId; targetType = 'Group ID'; }
            else if (source.type === 'room') { targetId = source.roomId; targetType = 'Room ID'; }
            else if (source.type === 'user') { targetId = source.userId; targetType = 'User ID'; }

            if (targetId) {
                try {
                    // Try to fetch newest info to sync
                    if (source.type === 'group') {
                        try {
                            const summary = await client.getGroupSummary(source.groupId);
                            await lineGroupService.syncGroup(source.groupId, summary.groupName, summary.pictureUrl, botId);
                        } catch (e) {
                            await lineGroupService.syncGroup(source.groupId, undefined, undefined, botId);
                        }
                    }

                    await client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: `✅ ลงทะเบียน/อัปเดตข้อมูลห้องสำเร็จ!\n${targetType}: ${targetId}`
                    });
                } catch (err) { console.error('Reply failed:', err); }
            }
        }
    }

    // 2. Auto-Sync on Join
    if (['join', 'memberJoined'].includes(event.type)) {
        const source = event.source;
        if (source.type === 'group' && source.groupId) {
            try {
                const groupSummary = await client.getGroupSummary(source.groupId);
                await lineGroupService.syncGroup(source.groupId, groupSummary.groupName, groupSummary.pictureUrl, botId);
            } catch (err) {
                await lineGroupService.syncGroup(source.groupId, undefined, undefined, botId);
            }
        }
    }
}

export default router;
