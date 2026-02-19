import { Client, TextMessage } from '@line/bot-sdk';
import prisma from './db';

// Cache LINE Clients by botId/token — cleared when bot is updated
const clientCache = new Map<string, { client: Client; createdAt: number }>();
const CLIENT_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Get (or create) a client with TTL-based cache to handle token rotation */
async function getClient(token?: string, botId?: string): Promise<Client> {
    const cacheKey = botId || token || 'default';
    const cached = clientCache.get(cacheKey);

    // Return cached client if fresh
    if (cached && Date.now() - cached.createdAt < CLIENT_TTL_MS) {
        return cached.client;
    }

    let accessToken = token || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    let secret = process.env.LINE_CHANNEL_SECRET || '';

    if (botId) {
        try {
            const bot = await prisma.lineBot.findUnique({
                where: { id: botId },
                select: { channelAccessToken: true, channelSecret: true, isActive: true }
            });
            if (bot?.isActive) {
                accessToken = bot.channelAccessToken.trim();
                secret = bot.channelSecret?.trim() || secret;
            }
        } catch (dbErr) {
            console.error('⚠️ DB Fetch Failed for bot client:', dbErr);
        }
    }

    if (!accessToken) {
        throw new Error('No LINE Channel Access Token available');
    }

    const client = new Client({ channelAccessToken: accessToken, channelSecret: secret });
    clientCache.set(cacheKey, { client, createdAt: Date.now() });
    return client;
}

/** Invalidate a cached client (call after bot token update) */
export function invalidateClientCache(botId?: string, token?: string) {
    const key = botId || token || 'default';
    clientCache.delete(key);
}

const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

export interface MessageTarget {
    type: 'user' | 'group' | 'room';
    ids: string[];
}

/**
 * Core: Sequential batch send with rate-limit protection
 */
async function batchSend(
    client: Client,
    ids: string[],
    messages: any[]
): Promise<{ success: boolean; error?: string }> {
    const failed: string[] = [];

    for (const id of ids) {
        try {
            await client.pushMessage(id, messages);
            // Throttle for batches > 5 to respect LINE rate limits
            if (ids.length > 5) await sleep(120);
        } catch (error: any) {
            console.error(`❌ [Batch] Failed ${id}: ${error.message}`);
            failed.push(id);
        }
    }

    if (failed.length > 0) {
        return {
            success: failed.length < ids.length, // partial success still counts
            error: `Failed to deliver to ${failed.length}/${ids.length} targets`
        };
    }
    return { success: true };
}

/**
 * Send a text message to LINE users/groups
 */
export async function sendTextMessage(
    target: MessageTarget,
    text: string,
    token?: string,
    botId?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const client = await getClient(token, botId);
        const message: TextMessage = { type: 'text', text };
        console.log(`🚀 [TEXT] → ${target.ids.length} target(s)`);
        return await batchSend(client, target.ids, [message]);
    } catch (error: any) {
        console.error('💥 TEXT_SEND_CRITICAL:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send image messages (single or multiple) with optional text
 */
export async function sendImageMessage(
    target: MessageTarget,
    imageUrls: string | string[],
    text?: string,
    token?: string,
    imageFirst: boolean = false,
    botId?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const client = await getClient(token, botId);
        const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

        const imageMessages: any[] = urls.slice(0, text ? 4 : 5).map(url => {
            const fullUrl = url.startsWith('http') || url.startsWith('data:')
                ? url
                : `${baseUrl}${url}`;
            return { type: 'image', originalContentUrl: fullUrl, previewImageUrl: fullUrl };
        });

        const textMessage = text ? { type: 'text', text } : null;
        const messages: any[] = imageFirst
            ? [...imageMessages, ...(textMessage ? [textMessage] : [])]
            : [...(textMessage ? [textMessage] : []), ...imageMessages];

        if (messages.length === 0) return { success: false, error: 'Empty content' };

        console.log(`🚀 [IMAGE] ${messages.length} msg(s) → ${target.ids.length} target(s)`);
        return await batchSend(client, target.ids, messages);
    } catch (error: any) {
        console.error('💥 IMAGE_SEND_CRITICAL:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send a scheduled message (auto-detects text vs image)
 */
export async function sendScheduledMessage(
    targetType: string,
    targetIds: string[],
    content: string,
    imageUrl?: string,
    imageUrls?: string | string[],
    token?: string,
    imageFirst: boolean = false,
    botId?: string
): Promise<{ success: boolean; error?: string }> {
    const target: MessageTarget = {
        type: targetType as 'user' | 'group' | 'room',
        ids: targetIds,
    };

    let images: string[] = [];
    if (imageUrls) {
        images = typeof imageUrls === 'string'
            ? (() => { try { return JSON.parse(imageUrls); } catch { return [imageUrls]; } })()
            : imageUrls;
    } else if (imageUrl) {
        images = [imageUrl];
    }

    if (images.length > 0) {
        return sendImageMessage(target, images, content, token, imageFirst, botId);
    }
    return sendTextMessage(target, content, token, botId);
}
