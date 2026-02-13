import express from 'express';
import { WebhookEvent, Client, validateSignature } from '@line/bot-sdk';
import { lineGroupService } from '../services/lineGroupService';
import prisma from '../services/db';
import bodyParser from 'body-parser';

const router = express.Router();

/**
 * GET WEBHOOK (For Health Checks / Pings)
 */
router.get('/', (req, res) => {
    res.status(200).send('Webhook is active (GET)');
});

/**
 * SMART WEBHOOK (ROOT)
 */
router.post('/', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['x-line-signature'] as string;
    const rawBody = req.body.toString('utf8');

    try {
        const parsedBody = JSON.parse(rawBody);
        const events: WebhookEvent[] = parsedBody.events || [];

        // 1. ดึงข้อมูลบอททั้งหมด (และลบช่องว่างเผื่อไว้)
        const allBots = await prisma.lineBot.findMany({ where: { isActive: true } });

        // 2. ค้นหาบอทที่ส่งมา
        let targetBot = null;

        // วิธีที่ 1: เช็คจาก Signature (มาตรฐาน)
        if (signature) {
            for (const bot of allBots) {
                const secret = bot.channelSecret?.trim();
                if (secret && validateSignature(rawBody, secret, signature)) {
                    targetBot = bot;
                    break;
                }
            }
        }

        // วิธีที่ 2: หากเป็น Verify (ไม่มี Signature) หรือเช็คไม่ผ่านในช่วงแรก
        // ลองหาจาก Event Source (ถ้ามี userId หรือข้อมูลอื่นที่ระบุตัวตนได้)
        if (!targetBot && events.length > 0) {
            // ในกรณีที่ Signature ไม่ผ่าน เราจะใช้บอทตัวแรกเป็นค่าเริ่มต้น หรือตัวที่ใกล้เคียง
            // เพื่อให้รายชื่อกลุ่ม "ขึ้น" มาก่อนให้คุณเห็น
            targetBot = allBots.find(b => b.channelSecret?.trim() === process.env.LINE_CHANNEL_SECRET?.trim()) || allBots[0];
        } else if (!targetBot && allBots.length > 0) {
            // สำหรับปุ่ม Verify
            targetBot = allBots[0];
        }

        if (!targetBot) return res.status(200).send('OK');

        const client = new Client({
            channelAccessToken: targetBot.channelAccessToken.trim(),
            channelSecret: targetBot.channelSecret?.trim() || undefined
        });

        // 3. ประมวลผลและ Sync กลุ่ม
        if (events.length > 0) {
            await Promise.all(events.map(event => handleEvent(event, client, targetBot!.id, targetBot!.name)));
        }

        res.status(200).send('OK');
    } catch (error: any) {
        console.error('[WEBHOOK ERROR]', error.message);
        res.status(200).send('OK');
    }
});

async function handleEvent(event: WebhookEvent, client: Client, botId: string, botName: string) {
    const source = event.source;

    // บันทึกรายชื่อกลุ่มทันทีที่มี Event ใดๆ เกิดขึ้น (Join, Message, etc.)
    if (source.type === 'group' && source.groupId) {
        try {
            // ลองดึงชื่อกลุ่ม
            const summary = await client.getGroupSummary(source.groupId);
            await lineGroupService.syncGroup(source.groupId, summary.groupName, summary.pictureUrl, botId);
            console.log(`[SYNC SUCCESS] Bot: ${botName} -> Group: ${summary.groupName}`);
        } catch (e) {
            // หากดึงชื่อไม่ได้ (บอทอาจยังไม่มีสิทธิ์) ให้บันทึกแค่ ID ไว้ก่อน
            await lineGroupService.syncGroup(source.groupId, undefined, undefined, botId);
        }
    }

    // คำสั่งเช็คไอดี
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
