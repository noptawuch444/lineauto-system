import express from 'express';
import { middleware, WebhookEvent, Client } from '@line/bot-sdk';
import { lineGroupService } from '../services/lineGroupService';

const router = express.Router();

const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

// Check for required environment variables
if (!config.channelAccessToken || !config.channelSecret) {
    console.error('[CRITICAL] Webhook initialization failed: LINE_CHANNEL_ACCESS_TOKEN or LINE_CHANNEL_SECRET is missing!');
}

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

/**
 * Custom middleware to handle LINE verification and signature checking
 */
const lineMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!config.channelSecret) {
        console.error('[ERROR] Cannot verify signature: LINE_CHANNEL_SECRET is empty');
        return res.status(500).send('Channel Secret Missing');
    }

    // The middleware(config) returns a function that expects (req, res, next)
    return middleware(config)(req, res, next);
};

// Webhook Handler
router.post('/', lineMiddleware, async (req, res) => {
    try {
        const events: WebhookEvent[] = req.body.events;

        // Handle case where events might be missing (e.g., some test requests)
        if (!events || !Array.isArray(events)) {
            console.log('[LINE] Webhook received but no events found in body');
            return res.status(200).json({ status: 'ok', message: 'No events' });
        }

        console.log(`[LINE] Received ${events.length} events`);

        // Process events
        await Promise.all(events.map(async (event) => {
            try {
                console.log(`[LINE] Handling event: ${event.type} from ${event.source.type}`);
                await handleEvent(event);
            } catch (err) {
                console.error(`[LINE] Error handling individual event [${event.type}]:`, err);
                // We keep moving for other events
            }
        }));

        res.status(200).json({ status: 'ok' });
    } catch (error: any) {
        console.error('[LINE] Webhook Handler Crash:', error);
        res.status(500).json({ error: error.message });
    }
});

async function handleEvent(event: WebhookEvent) {
    // 1. Handle Commands (e.g. !id)
    if (event.type === 'message' && event.message.type === 'text') {
        const text = event.message.text.trim().toLowerCase();

        if (text === '!id' || text === '.id') {
            const source = event.source;
            let targetId = '';
            let targetType = '';

            if (source.type === 'group') {
                targetId = source.groupId;
                targetType = 'Group ID';
            } else if (source.type === 'room') {
                targetId = source.roomId;
                targetType = 'Room ID';
            } else if (source.type === 'user') {
                targetId = source.userId;
                targetType = 'User ID';
            }

            if (targetId) {
                try {
                    await client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: `${targetType}: ${targetId}`
                    });
                } catch (replyError) {
                    console.error('Error sending reply:', replyError);
                }
            }
            return;
        }
    }

    // 2. Handle Auto-Sync for Groups
    const isRelevantEvent = ['join', 'memberJoined', 'message'].includes(event.type);
    if (isRelevantEvent) {
        const source = event.source;

        if (source.type === 'group' && source.groupId) {
            try {
                // Try to get group details, but don't crash if it fails (e.g. test events)
                try {
                    const groupSummary = await client.getGroupSummary(source.groupId);
                    await lineGroupService.syncGroup(
                        source.groupId,
                        groupSummary.groupName,
                        groupSummary.pictureUrl
                    );
                } catch (summaryErr) {
                    // Fallback: search/save without details
                    await lineGroupService.syncGroup(source.groupId);
                }
            } catch (err) {
                console.error(`Failed to sync group ${source.groupId}`, err);
            }
        }
    }
}

export default router;
