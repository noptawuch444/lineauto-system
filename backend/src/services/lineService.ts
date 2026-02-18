import { Client, ClientConfig, TextMessage, ImageMessage } from '@line/bot-sdk';
import prisma from './db';

// Cache for LINE Clients to prevent redundant allocations
const clientCache: Record<string, Client> = {};

// Function to get fresh credentials from database if botId provided, or use token/env
async function getClient(token?: string, botId?: string): Promise<Client> {
    const cacheKey = botId || token || 'default';

    // Check cache first for performance
    if (clientCache[cacheKey]) {
        return clientCache[cacheKey];
    }

    let accessToken = token || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    let secret = process.env.LINE_CHANNEL_SECRET || '';

    if (botId) {
        try {
            const bot = await prisma.lineBot.findUnique({ where: { id: botId } });
            if (bot && bot.isActive) {
                accessToken = bot.channelAccessToken.trim();
                secret = bot.channelSecret?.trim() || secret;
            }
        } catch (dbErr) {
            console.error('⚠️ DB Fetch Failed:', dbErr);
        }
    }

    const client = new Client({
        channelAccessToken: accessToken,
        channelSecret: secret,
    });

    // Cache the client
    clientCache[cacheKey] = client;
    return client;
}

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export interface MessageTarget {
    type: 'user' | 'group' | 'room';
    ids: string[];
}

/**
 * Core internal function for sequential batch sending with throttling
 */
async function batchSend(client: Client, ids: string[], messages: any[]): Promise<{ success: boolean; error?: string }> {
    const results = [];
    const isLargeBatch = ids.length > 5;

    for (const id of ids) {
        try {
            await client.pushMessage(id, messages);
            results.push({ id, success: true });

            // Critical: Respect LINE rate limits via sequential throttle
            if (isLargeBatch) await sleep(100);
        } catch (error: any) {
            console.error(`❌ [Batch Failed] ${id}: ${error.message}`);
            results.push({ id, success: false, error: error.message });
        }
    }

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
        return { success: false, error: `Failed to deliver to ${failed.length} targets` };
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

        console.log(`🚀 [TEXT] Delivering to ${target.ids.length} IDs...`);
        return await batchSend(client, target.ids, [message]);
    } catch (error: any) {
        console.error('💥 TEXT_SEND_CRITICAL:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send image messages (single or multiple) to LINE users/groups
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

        const messages: any[] = [];
        const imageMessages = urls.slice(0, text ? 4 : 5).map(url => {
            let fullUrl = url;
            if (!url.startsWith('http') && !url.startsWith('data:')) {
                fullUrl = `${process.env.BASE_URL || 'http://localhost:3000'}${url}`;
            }
            return {
                type: 'image',
                originalContentUrl: fullUrl,
                previewImageUrl: fullUrl,
            };
        });

        const textMessage = text ? { type: 'text', text } : null;

        if (imageFirst) {
            messages.push(...imageMessages);
            if (textMessage) messages.push(textMessage);
        } else {
            if (textMessage) messages.push(textMessage);
            messages.push(...imageMessages);
        }

        if (messages.length === 0) return { success: false, error: 'Empty content' };

        console.log(`🚀 [IMAGE] Delivering ${messages.length} pkgs to ${target.ids.length} IDs...`);
        return await batchSend(client, target.ids, messages);
    } catch (error: any) {
        console.error('💥 IMAGE_SEND_CRITICAL:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send a scheduled message (text or image)
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

    const images = imageUrls ? (typeof imageUrls === 'string' ? JSON.parse(imageUrls) : imageUrls) : (imageUrl ? [imageUrl] : []);

    if (images && images.length > 0) {
        return sendImageMessage(target, images, content, token, imageFirst, botId);
    } else {
        return sendTextMessage(target, content, token, botId);
    }
}
