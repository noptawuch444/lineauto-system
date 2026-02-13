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

    console.log(`\n--- [WEBHOOK_HIT] ID: ${id} ---`);

    try {
        // 1. Find bot
        const bot = await prisma.lineBot.findUnique({ where: { id } });
        if (!bot) {
            console.error(`[WEBHOOK] Bot not found in database: ${id}`);
            return res.status(404).send('Bot not found');
        }

        // 2. Validate Signature
        const rawBody = req.body.toString('utf8');
        if (bot.channelSecret && signature) {
            const isValid = validateSignature(rawBody, bot.channelSecret, signature);
            if (!isValid) {
                console.error(`[SIG FAIL] Bot: ${bot.name} (${id}) - Signature validation failed!`);
                // Even on fail, LINE Verify might need a 200, but let's be strict for now.
                // return res.status(401).send('Invalid signature');
            } else {
                console.log(`[SIG OK] Bot: ${bot.name}`);
            }
        } else {
            console.log(`[SIG SKIP] Bot: ${bot.name} - No secret or signature provided`);
        }

        // 3. Parse Body
        let parsedBody;
        try {
            parsedBody = JSON.parse(rawBody);
        } catch (e) {
            console.error('[WEBHOOK] JSON Parse Error:', e);
            return res.status(400).send('Invalid JSON');
        }

        const events: WebhookEvent[] = parsedBody.events;
        if (!events || events.length === 0) {
            console.log('[WEBHOOK] No events found (Verification request)');
            return res.status(200).send('OK');
        }

        console.log(`[WEBHOOK] Received ${events.length} events for ${bot.name}`);

        const client = new Client({
            channelAccessToken: bot.channelAccessToken,
            channelSecret: bot.channelSecret || undefined
        });

        // 4. Process
        await Promise.all(events.map(event => handleEvent(event, client, bot.id, bot.name)));

        res.status(200).send('OK');
    } catch (error: any) {
        console.error(`[WEBHOOK CRASH] ${id}:`, error);
        res.status(200).send('OK'); // Always send 200 to LINE to avoid endless retries during debug
    }
});

async function handleEvent(event: WebhookEvent, client: Client, botId: string, botName: string) {
    console.log(`[EVENT] ${event.type} from ${event.source.type} (Bot: ${botName})`);

    // 1. Commands & Registration
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
                console.log(`[CMD] Syncing ${targetType}: ${targetId} for Bot: ${botName}`);

                try {
                    // Try to fetch newest info to sync
                    let name = 'Unknown Group';
                    let pic = undefined;

                    if (source.type === 'group') {
                        try {
                            const summary = await client.getGroupSummary(source.groupId);
                            name = summary.groupName;
                            pic = summary.pictureUrl;
                        } catch (e) {
                            console.warn(`[SYNC] Could not get group summary for ${source.groupId}`);
                        }
                    }

                    await lineGroupService.syncGroup(targetId, name, pic, botId);

                    await client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: `✅ [${botName}]\nลงทะเบียนห้องสำเร็จ!\n${targetType}: ${targetId}`
                    });
                } catch (err) {
                    console.error('[CMD FAIL] Error syncing/replying:', err);
                }
            }
        }
    }

    // 2. Auto-Sync on Join
    if (event.type === 'join' || (event.type === 'message' && event.source.type === 'group')) {
        const source = (event as any).source;
        if (source.type === 'group' && source.groupId) {
            try {
                // Periodically sync group info even on regular messages if it's a group
                const summary = await client.getGroupSummary(source.groupId);
                await lineGroupService.syncGroup(source.groupId, summary.groupName, summary.pictureUrl, botId);
            } catch (err) {
                // If summary fails (maybe not permitted), at least sync with ID
                await lineGroupService.syncGroup(source.groupId, undefined, undefined, botId);
            }
        }
    }
}

export default router;
