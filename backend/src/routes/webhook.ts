import express from 'express';
import { WebhookEvent, Client, validateSignature } from '@line/bot-sdk';
import { lineGroupService } from '../services/lineGroupService';
import prisma from '../services/db';
import bodyParser from 'body-parser';

const router = express.Router();

// ── Bot cache to avoid DB query on every webhook call ──
type BotRecord = { id: string; name: string; channelAccessToken: string; channelSecret: string | null; isActive: boolean };
let botCache: BotRecord[] = [];
let botCacheExpiry = 0;
const BOT_CACHE_TTL_MS = 60_000; // 60 seconds

async function getActiveBots(): Promise<BotRecord[]> {
    const now = Date.now();
    if (botCache.length > 0 && now < botCacheExpiry) return botCache;

    const bots = await prisma.lineBot.findMany({
        where: { isActive: true },
        select: { id: true, name: true, channelAccessToken: true, channelSecret: true, isActive: true }
    });

    botCache = bots;
    botCacheExpiry = now + BOT_CACHE_TTL_MS;
    return bots;
}

/** Call this when a bot is updated/deleted to force cache refresh */
export function invalidateBotCache() {
    botCache = [];
    botCacheExpiry = 0;
}

// ── Health Check ──
router.get('/', (_req, res) => {
    res.status(200).send('Webhook active');
});

// ── Per-Bot Webhook: POST /webhook/:botId ──
router.post('/:botId', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    const { botId } = req.params;
    const signature = req.headers['x-line-signature'] as string;
    const rawBody = req.body.toString('utf8');

    // Respond 200 immediately (LINE requires < 1s)
    res.status(200).send('OK');

    (async () => {
        try {
            const bot = await prisma.lineBot.findUnique({
                where: { id: botId, isActive: true },
                select: { id: true, name: true, channelAccessToken: true, channelSecret: true, isActive: true }
            });

            if (!bot) return;

            // Validate signature when secret is set
            if (signature && bot.channelSecret) {
                const valid = validateSignature(rawBody, bot.channelSecret.trim(), signature);
                if (!valid) {
                    console.warn(`[WEBHOOK] Invalid signature for bot ${botId}`);
                    return;
                }
            }

            const parsedBody = JSON.parse(rawBody);
            const events: WebhookEvent[] = parsedBody.events || [];

            if (events.length === 0) return;

            const client = new Client({
                channelAccessToken: bot.channelAccessToken.trim(),
                channelSecret: bot.channelSecret?.trim() || undefined
            });

            for (const event of events) {
                await handleEvent(event, client, bot.id, bot.name);
            }
        } catch (err: any) {
            console.error(`[WEBHOOK /${botId}] Error:`, err.message);
        }
    })();
});

// ── Root/Smart Webhook: POST /webhook ──
router.post('/', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['x-line-signature'] as string;
    const rawBody = req.body.toString('utf8');

    // Respond 200 immediately
    res.status(200).send('OK');

    (async () => {
        try {
            const allBots = await getActiveBots();
            let targetBot: BotRecord | null = null;

            // Match by signature (most accurate)
            if (signature && allBots.length > 0) {
                for (const bot of allBots) {
                    const secret = bot.channelSecret?.trim();
                    if (secret && validateSignature(rawBody, secret, signature)) {
                        targetBot = bot;
                        break;
                    }
                }
            }

            // Fallback: env secret match or first active bot
            if (!targetBot && allBots.length > 0) {
                targetBot = allBots.find(b =>
                    b.channelSecret?.trim() === process.env.LINE_CHANNEL_SECRET?.trim()
                ) ?? allBots[0];
            }

            if (!targetBot) return;

            const parsedBody = JSON.parse(rawBody);
            const events: WebhookEvent[] = parsedBody.events || [];

            if (events.length === 0) return;

            const client = new Client({
                channelAccessToken: targetBot.channelAccessToken.trim(),
                channelSecret: targetBot.channelSecret?.trim() || undefined
            });

            for (const event of events) {
                await handleEvent(event, client, targetBot.id, targetBot.name);
            }
        } catch (err: any) {
            console.error('[WEBHOOK ROOT] Error:', err.message);
        }
    })();
});

// ── Event Handler ──
async function handleEvent(event: WebhookEvent, client: Client, botId: string, botName: string) {
    const source = event.source;

    if (source.type === 'group' && source.groupId) {
        try {
            const summary = await client.getGroupSummary(source.groupId);
            await lineGroupService.syncGroup(source.groupId, summary.groupName, summary.pictureUrl, botId);
        } catch {
            // Bot may not have permission yet — save ID only
            await lineGroupService.syncGroup(source.groupId, undefined, undefined, botId);
        }
    }

    if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim().toLowerCase();
        if (text === '!id' || text === '.id') {
            const id = (source as any).groupId || (source as any).roomId || source.userId;
            await client.replyMessage(event.replyToken, {
                type: 'text',
                text: `✅ [${botName}]\nID: ${id}`
            });
        }
    }
}

export default router;
