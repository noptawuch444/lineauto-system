import express from 'express';
import { WebhookEvent, Client, validateSignature } from '@line/bot-sdk';
import { lineGroupService } from '../services/lineGroupService';
import prisma from '../services/db';
import bodyParser from 'body-parser';

const router = express.Router();

// GET /webhook
router.get('/', (req, res) => {
    console.log('[WEBHOOK] Health check hit');
    res.send('Webhook is active and ready! (Smart Mode)');
});

// GET /webhook/test (อีกทางเลือก)
router.get('/test', (req, res) => {
    res.json({ status: 'ok', msg: 'Webhook router is working' });
});

/**
 * POST /webhook (Universal)
 */
router.post('/', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['x-line-signature'] as string;
        const rawBody = req.body.toString('utf8');
        const parsedBody = JSON.parse(rawBody);

        // 1. ตอบ Verify ทันทีถ้าไม่มีข้อมูล
        if (!signature || !parsedBody.events || parsedBody.events.length === 0) {
            return res.status(200).send('OK');
        }

        // 2. ค้นหาบอทที่รองรับ
        const allBots = await prisma.lineBot.findMany({ where: { isActive: true } });
        let targetBot = null;

        for (const bot of allBots) {
            if (bot.channelSecret && validateSignature(rawBody, bot.channelSecret, signature)) {
                targetBot = bot;
                break;
            }
        }

        if (!targetBot) {
            // ลองใช้บอทตัวแรกเป็น Fallback
            targetBot = allBots[0];
        }

        if (!targetBot) return res.status(200).send('OK');

        const client = new Client({
            channelAccessToken: targetBot.channelAccessToken,
            channelSecret: targetBot.channelSecret || undefined
        });

        // 3. จัดการ Event
        await Promise.all(parsedBody.events.map((event: any) => handleEvent(event, client, targetBot!.id, targetBot!.name)));

        res.status(200).send('OK');
    } catch (error) {
        console.error('[WEBHOOK ERROR]', error);
        res.status(200).send('OK');
    }
});

async function handleEvent(event: WebhookEvent, client: Client, botId: string, botName: string) {
    const source = event.source;

    // Auto sync
    if (source.type === 'group' && source.groupId) {
        try {
            const summary = await client.getGroupSummary(source.groupId);
            await lineGroupService.syncGroup(source.groupId, summary.groupName, summary.pictureUrl, botId);
        } catch (e) {
            await lineGroupService.syncGroup(source.groupId, undefined, undefined, botId);
        }
    }

    // Command
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
