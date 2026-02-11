import express from 'express';
import { middleware, WebhookEvent, Client } from '@line/bot-sdk';
import { lineGroupService } from '../services/lineGroupService';

const router = express.Router();

const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

const client = new Client(config);

// Webhook Diagnostic
router.get('/', (req, res) => {
    res.json({
        status: 'Webhook is active',
        hasAccessToken: !!config.channelAccessToken,
        hasSecret: !!config.channelSecret,
        timestamp: new Date().toISOString()
    });
});

// Webhook Handler
router.post('/', (req, res, next) => {
    if (!config.channelAccessToken || !config.channelSecret) {
        console.error('[CRITICAL] LINE_CHANNEL_ACCESS_TOKEN or LINE_CHANNEL_SECRET is missing!');
    }
    next();
}, middleware(config), async (req, res) => {
    try {
        const events: WebhookEvent[] = req.body.events;
        console.log(`[LINE] Received ${events?.length || 0} events`);

        await Promise.all(events.map(async (event) => {
            console.log(`[LINE] Handling event: ${event.type} from ${event.source.type}`);
            await handleEvent(event);
        }));

        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('[LINE] Webhook Error:', error);
        res.status(500).end();
    }
});

async function handleEvent(event: WebhookEvent) {
    if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim().toLowerCase();
        console.log(`Received text message: "${text}"`);
        if (text === '!id' || text === '.id') {
            console.log('Command matched: !id or .id');
            const source = event.source;
            let id = '';
            let type = '';

            if (source.type === 'group') {
                id = source.groupId;
                type = 'Group ID';
            } else if (source.type === 'room') {
                id = source.roomId;
                type = 'Room ID';
            } else if (source.type === 'user') {
                id = source.userId;
                type = 'User ID';
            }

            if (id) {
                try {
                    await client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: `${type}: ${id}`
                    });
                    console.log(`Successfully replied with ${type}`);
                } catch (replyError) {
                    console.error('Error sending reply message:', replyError);
                }
            }
            return;
        }
    }

    if (event.type === 'join' || event.type === 'memberJoined' || event.type === 'message') {
        const source = event.source;

        if (source.type === 'group' && source.groupId) {
            console.log(`Bot detected in group: ${source.groupId}`);

            // Fetch group summary to get name and picture
            try {
                const groupSummary = await client.getGroupSummary(source.groupId);
                await lineGroupService.syncGroup(
                    source.groupId,
                    groupSummary.groupName,
                    groupSummary.pictureUrl
                );
                console.log(`Synced group: ${groupSummary.groupName} (${source.groupId})`);
            } catch (err) {
                console.error(`Failed to fetch group summary for ${source.groupId}`, err);
                // Still save the ID even if summary fails
                await lineGroupService.syncGroup(source.groupId);
            }
        } else if (source.type === 'room' && source.roomId) {
            // Optional: Handle rooms similarly if needed, currently focusing on Groups
            console.log(`Bot detected in room: ${source.roomId}`);
        }
    }

    // Handle Leave event to maybe mark as inactive (Optional, purely based on requirements)
    if (event.type === 'leave' && event.source.type === 'group') {
        console.log(`Bot left group: ${event.source.groupId}`);
    }
}

export default router;
