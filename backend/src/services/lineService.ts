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
/** Detect public base URL for images — important for LINE push */
function getBaseUrl(req?: any): string {
    // Priority 1: Explicitly set BASE_URL
    if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');

    // Priority 2: Render's automatic external URL
    if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');

    // Guess from request if available (for on-the-fly uploads)
    if (req) {
        const host = req.get('x-forwarded-host') || req.get('host');
        const proto = req.get('x-forwarded-proto') || req.protocol;
        return `${proto}://${host}`;
    }

    return 'http://localhost:3000'; // Fallback
}

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
        const baseUrl = getBaseUrl();

        const imageMessages: any[] = urls.slice(0, text ? 4 : 5)
            .map(url => {
                if (!url) return null;

                let fullUrl = url;
                if (!url.startsWith('http') && !url.startsWith('data:')) {
                    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
                    fullUrl = `${baseUrl}${cleanUrl}`;
                }

                // Block data: URLs (LINE doesn't support them)
                if (fullUrl.startsWith('data:')) {
                    console.error('❌ [LINE_URL_ERROR] Cannot send data: URI to LINE. Image must be a public URL.');
                    return null;
                }

                // Protocol Check & Upgrade
                if (fullUrl.startsWith('http://')) {
                    // Check if it's localhost (impossible for LINE)
                    if (fullUrl.includes('localhost') || fullUrl.includes('127.0.0.1')) {
                        console.warn('⚠️ [LINE_URL_WARN] Image URL contains "localhost". LINE cannot fetch this. Please use a public HTTPS URL or ngrok.');
                    } else {
                        // Upgrade to https for common deployment domains
                        const publicDomains = ['.ngrok', '.onrender.com', '.app', '.dev', '.net', '.com'];
                        if (publicDomains.some(d => fullUrl.toLowerCase().includes(d))) {
                            fullUrl = fullUrl.replace('http://', 'https://');
                        }
                    }
                }

                return {
                    type: 'image',
                    originalContentUrl: fullUrl,
                    previewImageUrl: fullUrl
                };
            })
            .filter(Boolean);

        const textMessage = text ? { type: 'text', text } : null;
        const messages: any[] = imageFirst
            ? [...imageMessages, ...(textMessage ? [textMessage] : [])]
            : [...(textMessage ? [textMessage] : []), ...imageMessages];

        if (messages.length === 0) return { success: false, error: 'Empty content' };

        // Debug: Show what we are sending
        console.log(`🚀 [LINE] Sending ${messages.length} content block(s) to ${target.ids.length} target(s)`);
        messages.forEach((m, i) => {
            if (m.type === 'image') console.log(`   [${i + 1}] 🖼️ URL: ${m.originalContentUrl}`);
        });
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
