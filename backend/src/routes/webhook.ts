import express from 'express';
import { WebhookEvent, Client, validateSignature } from '@line/bot-sdk';
import { lineGroupService } from '../services/lineGroupService';
import prisma from '../services/db';
import bodyParser from 'body-parser';

const router = express.Router();

// Middleware สำหรับดึง Raw Body ไว้เช็ค Signature (จำเป็นมากสำหรับ Multi-Bot)
const rawParser = bodyParser.raw({ type: 'application/json' });

/**
 * GET /webhook
 * สำหรับให้คุณเช็คเองผ่าน Browser ว่าระบบออนไลน์ไหม
 */
router.get('/', (req, res) => {
    res.json({
        status: 'Webhook is active and ready!',
        mode: 'Smart Multi-Bot Mode',
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /webhook
 * ลิงก์หลักสำหรับบอททุกตัว
 */
router.post('/', rawParser, async (req, res) => {
    await processWebhook(req, res);
});

/**
 * POST /webhook/:id
 * รองรับลิงก์แบบระบุไอดีด้วย (กันเหนียว)
 */
router.post('/:id', rawParser, async (req, res) => {
    await processWebhook(req, res);
});

async function processWebhook(req: express.Request, res: express.Response) {
    const signature = req.headers['x-line-signature'] as string;
    const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);

    try {
        // --- 1. ตรวจสอบการ Verify จาก LINE ---
        // ถ้าไม่มี Signature หรือไม่มี Events แสดงว่าเป็นการกดปุ่ม Verify จากหน้า Console
        const parsedBody = JSON.parse(rawBody);
        if (!signature || !parsedBody.events || parsedBody.events.length === 0) {
            console.log('[WEBHOOK] Verify request received - Responding 200 OK');
            return res.status(200).send('OK');
        }

        // --- 2. ค้นหาบอทที่เหมาะสม ---
        const allBots = await prisma.lineBot.findMany({ where: { isActive: true } });
        let targetBot = null;

        // เช็คว่า Signature นี้เป็นของบอทตัวไหนในฐานข้อมูล
        for (const bot of allBots) {
            if (bot.channelSecret && validateSignature(rawBody, bot.channelSecret, signature)) {
                targetBot = bot;
                break;
            }
        }

        // หากหาไม่เจอจริงๆ (อาจจะเป็นบอทตัวแรกที่ใช้ Env)
        if (!targetBot) {
            const defaultSecret = process.env.LINE_CHANNEL_SECRET;
            if (defaultSecret && validateSignature(rawBody, defaultSecret, signature)) {
                targetBot = {
                    id: 'env-default',
                    name: 'Default Bot',
                    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
                };
            }
        }

        if (!targetBot) {
            console.error('[WEBHOOK] Unknown Bot or Invalid Signature');
            return res.status(200).send('OK'); // ตอบ 200 เพื่อไม่ให้ LINE ส่งซ้ำขณะทดสอบ
        }

        const events: WebhookEvent[] = parsedBody.events;
        const client = new Client({
            channelAccessToken: targetBot.channelAccessToken,
            channelSecret: (targetBot as any).channelSecret || undefined
        });

        // --- 3. ประมวลผลแต่ละ Event ---
        await Promise.all(events.map(event => handleEvent(event, client, targetBot!.id, targetBot!.name)));

        res.status(200).send('OK');
    } catch (error: any) {
        console.error('[WEBHOOK ERROR]', error.message);
        res.status(200).send('OK');
    }
}

async function handleEvent(event: WebhookEvent, client: Client, botId: string, botName: string) {
    const source = event.source;

    // บันทึกข้อมูลกลุ่มอัตโนมัติ
    if (source.type === 'group' && source.groupId) {
        try {
            const summary = await client.getGroupSummary(source.groupId);
            // ถ้า botId เป็น 'env-default' ให้พยายามหา botId จริงจากเบส (ถ้ามี)
            let actualBotId = botId === 'env-default' ? null : botId;

            await lineGroupService.syncGroup(
                source.groupId,
                summary.groupName,
                summary.pictureUrl,
                actualBotId || undefined
            );
        } catch (e) {
            await lineGroupService.syncGroup(source.groupId, undefined, undefined, botId === 'env-default' ? undefined : botId);
        }
    }

    // คำสั่งพื้นฐาน !id
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
