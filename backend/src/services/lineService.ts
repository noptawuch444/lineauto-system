import { Client, ClientConfig, TextMessage, ImageMessage } from '@line/bot-sdk';
import prisma from './db';

// Function to get fresh credentials from database if botId provided, or use token/env
async function getClient(token?: string, botId?: string): Promise<Client> {
    let accessToken = token || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    let secret = process.env.LINE_CHANNEL_SECRET || '';

    if (botId) {
        try {
            const bot = await prisma.lineBot.findUnique({ where: { id: botId } });
            if (bot && bot.isActive) {
                accessToken = bot.channelAccessToken;
                secret = bot.channelSecret || secret;
                console.log(`🤖 Using Bot ID: ${botId} Name: ${bot.name}`);
            }
        } catch (dbErr) {
            console.error('Error fetching bot details from DB:', dbErr);
        }
    }

    const config: ClientConfig = {
        channelAccessToken: accessToken,
        channelSecret: secret,
    };
    return new Client(config);
}

export interface MessageTarget {
    type: 'user' | 'group' | 'room';
    ids: string[];
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
        const channelAccessToken = token || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

        console.log('\n🔍 sendTextMessage called');
        console.log('   Target type:', target.type);
        console.log('   Target IDs:', target.ids);
        console.log('   Message:', text);

        const message: TextMessage = {
            type: 'text',
            text,
        };

        // Send to all target IDs
        const promises = target.ids.map(async (id) => {
            try {
                console.log(`\n📤 Sending to ${id}...`);
                await client.pushMessage(id, message);
                console.log(`✅ Success: ${id}`);
                return { id, success: true };
            } catch (error: any) {
                console.error(`\n❌ Failed to send to ${id}`);
                console.error('   Error message:', error.message);
                return { id, success: false, error: error.message };
            }
        });

        const results = await Promise.all(promises);
        const failed = results.filter(r => !r.success);

        if (failed.length > 0) {
            const errorMsg = `Failed to send to ${failed.length} target(s)`;
            return { success: false, error: errorMsg };
        }

        console.log('\n✅ All messages sent successfully!');
        return { success: true };
    } catch (error: any) {
        console.error('\n❌ Error in sendTextMessage:', error);
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

        console.log('\n🔍 sendImageMessage called');
        console.log('   Text:', text || 'No text');
        console.log('   Image URLs:', urls.length, 'images');

        const messages: (TextMessage | ImageMessage)[] = [];
        const imageMessages: ImageMessage[] = [];

        // Build image messages first
        const remainingSlots = text ? 4 : 5;
        const imagesToSend = urls.slice(0, remainingSlots);

        for (const url of imagesToSend) {
            let fullImageUrl = url;
            if (!url.startsWith('http') && !url.startsWith('data:')) {
                fullImageUrl = `${process.env.BASE_URL || 'http://localhost:3000'}${url}`;
            }

            imageMessages.push({
                type: 'image',
                originalContentUrl: fullImageUrl,
                previewImageUrl: fullImageUrl,
            });
        }

        const textMessage: TextMessage | null = text ? { type: 'text', text } : null;

        if (imageFirst) {
            messages.push(...imageMessages);
            if (textMessage) messages.push(textMessage);
        } else {
            if (textMessage) messages.push(textMessage);
            messages.push(...imageMessages);
        }

        if (messages.length === 0) return { success: false, error: 'No content to send' };

        const promises = target.ids.map(async (id) => {
            try {
                await client.pushMessage(id, messages);
                return { id, success: true };
            } catch (error: any) {
                console.error(`\n❌ Failed to ${id}:`, error.message);
                return { id, success: false, error: error.message };
            }
        });

        const results = await Promise.all(promises);
        const failed = results.filter(r => !r.success);

        if (failed.length > 0) return { success: false, error: 'Failed to send to some targets' };

        return { success: true };
    } catch (error: any) {
        console.error('\n❌ Error in sendImageMessage:', error);
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
