import express from 'express';
import { WebhookEvent, Client, validateSignature } from '@line/bot-sdk';
import { lineGroupService } from '../services/lineGroupService';
import prisma from '../services/db';
import bodyParser from 'body-parser';

const router = express.Router();

/**
 * SMART WEBHOOK (ROOT)
 * รองรับบอททุกตัวในลิงก์เดียว!
 */
router.post('/', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['x-line-signature'] as string;
    const rawBody = req.body.toString('utf8');

    try {
        // 1. ดึงข้อมูลบอททั้งหมดที่มีในระบบมาเช็คลายเซ็น
        const allBots = await prisma.lineBot.findMany({ where: { isActive: true } });
        let targetBot = null;

        // ค้นหาว่าลายเซ็นที่ส่งมา ตรงกับ Channel Secret ของบอทตัวไหน
        if (signature) {
            for (const bot of allBots) {
                if (bot.channelSecret && validateSignature(rawBody, bot.channelSecret, signature)) {
                    targetBot = bot;
                    break;
                }
            }
        }

        // หากไม่เจอ (อาจเป็นการกด Verify หรือบอทตัวแรกที่ใช้ Env)
        if (!targetBot) {
            // ลองใช้บอทตัวแรกในฐานข้อมูลเป็นค่าเริ่มต้น
            targetBot = allBots[0];
        }

        if (!targetBot) {
            console.log('[WEBHOOK] No bots configured in database.');
            return res.status(200).send('OK');
        }

        const parsedBody = JSON.parse(rawBody);
        const events: WebhookEvent[] = parsedBody.events;

        if (!events || events.length === 0) return res.status(200).send('OK');

        const client = new Client({
            channelAccessToken: targetBot.channelAccessToken,
            channelSecret: targetBot.channelSecret || undefined
        });

        // ประมวลผลเหตุการณ์
        await Promise.all(events.map(event => handleEvent(event, client, targetBot!.id, targetBot!.name)));

        res.status(200).send('OK');
    } catch (error: any) {
        console.error('[SMART WEBHOOK ERROR]', error.message);
        res.status(200).send('OK'); // ตอบ 200 เสมอเพื่อไม่ให้ LINE ส่งซ้ำ
    }
});

/**
 * รองรับ URL แบบระบุไอดี (เพื่อความแม่นยำสูงสุดในบางกรณี)
 */
router.post('/:id', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    const { id } = req.params;
    const signature = req.headers['x-line-signature'] as string;
    const rawBody = req.body.toString('utf8');

    try {
        const bot = await prisma.lineBot.findUnique({ where: { id } });
        if (!bot) return res.status(200).send('OK');

        const parsedBody = JSON.parse(rawBody);
        const events: WebhookEvent[] = parsedBody.events;
        if (!events || events.length === 0) return res.status(200).send('OK');

        const client = new Client({
            channelAccessToken: bot.channelAccessToken,
            channelSecret: bot.channelSecret || undefined
        });

        await Promise.all(events.map(event => handleEvent(event, client, bot.id, bot.name)));
        res.status(200).send('OK');
    } catch (error) {
        res.status(200).send('OK');
    }
});

async function handleEvent(event: WebhookEvent, client: Client, botId: string, botName: string) {
    // Sync ข้อมูลอัตโนมัติเมื่อพบบทสนทนาในกลุ่ม
    const source = event.source;
    if (source.type === 'group' && source.groupId) {
        try {
            // พยายามดึงชื่อกลุ่มล่าสุด
            const summary = await client.getGroupSummary(source.groupId);
            await lineGroupService.syncGroup(source.groupId, summary.groupName, summary.pictureUrl, botId);
            console.log(`[AUTO-SYNC] Bot: ${botName} synced Group: ${summary.groupName}`);
        } catch (e) {
            // ถ้าดึง Summary ไม่ได้ (กรณีบอทไม่มีสิทธิ์) ให้เก็บแค่ ID ไว้ก่อน
            await lineGroupService.syncGroup(source.groupId, undefined, undefined, botId);
        }
    }

    // รองรับคำสั่งเช็คไอดีพื้นฐาน
    if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim().toLowerCase();
        if (text === '!id' || text === '.id') {
            let id = (source as any).groupId || (source as any).roomId || source.userId;
            await client.replyMessage(event.replyToken, {
                type: 'text',
                text: `✅ [${botName}]\nID: ${id}`
            });
        }
    }
}

export default router;
