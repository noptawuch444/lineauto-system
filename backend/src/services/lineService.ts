import { Client, ClientConfig, TextMessage, ImageMessage } from '@line/bot-sdk';

// Function to get fresh credentials from environment or use provided token
function getClient(token?: string): Client {
    const config: ClientConfig = {
        channelAccessToken: token || process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
        channelSecret: process.env.LINE_CHANNEL_SECRET || '',
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
    token?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const client = getClient(token);
        const channelAccessToken = token || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
        const channelSecret = process.env.LINE_CHANNEL_SECRET || '';

        console.log('\n🔍 sendTextMessage called');
        console.log('   Target type:', target.type);
        console.log('   Target IDs:', target.ids);
        console.log('   Message:', text);
        console.log('   Token Source:', token ? 'Custom (Template)' : 'Default (Env)');
        console.log('   Channel Access Token:', channelAccessToken ? `${channelAccessToken.substring(0, 20)}... ✅` : 'Missing ❌');

        if (!channelAccessToken) {
            const error = 'LINE API credentials not configured (Missing Token)';
            console.error('❌ Error:', error);
            throw new Error(error);
        }

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
                console.error('   Error name:', error.name);
                console.error('   Error message:', error.message);
                console.error('   Error code:', error.code);
                console.error('   Status code:', error.statusCode);
                if (error.statusCode === 401) {
                    console.error('   💡 401 Unauthorized - Check Channel Access Token!');
                    console.error('   Current token:', channelAccessToken.substring(0, 30) + '...');
                }
                console.error('   Full error:', JSON.stringify(error, null, 2));
                return { id, success: false, error: error.message };
            }
        });

        const results = await Promise.all(promises);
        const failed = results.filter(r => !r.success);

        if (failed.length > 0) {
            const errorMsg = `Failed to send to ${failed.length} target(s): ${failed.map(f => f.id).join(', ')}`;
            console.error('\n❌ Overall result:', errorMsg);
            return {
                success: false,
                error: errorMsg
            };
        }

        console.log('\n✅ All messages sent successfully!');
        return { success: true };
    } catch (error: any) {
        console.error('\n❌ Error in sendTextMessage:');
        console.error('   Name:', error.name);
        console.error('   Message:', error.message);
        console.error('   Stack:', error.stack);
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
    token?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const client = getClient(token);
        const channelAccessToken = token || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
        const channelSecret = process.env.LINE_CHANNEL_SECRET || '';

        const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];

        console.log('\n🔍 sendImageMessage called');
        console.log('   Target type:', target.type);
        console.log('   Target IDs:', target.ids);
        console.log('   Text:', text || 'No text');
        console.log('   Image URLs:', urls.length, 'images');
        console.log('   Token Source:', token ? 'Custom (Template)' : 'Default (Env)');

        if (!channelAccessToken) {
            const error = 'LINE API credentials not configured (Missing Token)';
            console.error('❌ Error:', error);
            throw new Error(error);
        }

        const messages: (TextMessage | ImageMessage)[] = [];

        // Add text message if provided
        if (text) {
            messages.push({
                type: 'text',
                text,
            });
        }

        // Add image messages (Max 5 total messages allowed by LINE)
        const remainingSlots = 5 - messages.length;
        const imagesToSend = urls.slice(0, remainingSlots);

        if (urls.length > remainingSlots) {
            console.warn(`⚠️ Warning: Too many messages. Sending only first ${remainingSlots} images.`);
        }

        for (const url of imagesToSend) {
            // Ensure imageUrl is absolute (for http/https URLs)
            let fullImageUrl = url;
            if (!url.startsWith('http') && !url.startsWith('data:')) {
                fullImageUrl = `${process.env.BASE_URL || 'http://localhost:3000'}${url}`;
            }

            messages.push({
                type: 'image',
                originalContentUrl: fullImageUrl,
                previewImageUrl: fullImageUrl,
            });
        }

        if (messages.length === 0) {
            console.warn('⚠️ No messages to send (no text and no images provided)');
            return { success: false, error: 'No content to send' };
        }

        console.log('   Sending', messages.length, 'message(s)');

        // Send to all target IDs
        const promises = target.ids.map(async (id) => {
            try {
                console.log(`\n📤 Sending message to ${id}...`);
                await client.pushMessage(id, messages);
                console.log(`✅ Success: ${id}`);
                return { id, success: true };
            } catch (error: any) {
                console.error(`\n❌ Failed to send to ${id}`);
                console.error('   Error name:', error.name);
                console.error('   Error message:', error.message);
                return { id, success: false, error: error.message };
            }
        });

        const results = await Promise.all(promises);
        const failed = results.filter(r => !r.success);

        if (failed.length > 0) {
            const errorMsg = `Failed to send to ${failed.length} target(s): ${failed.map(f => f.id).join(', ')}`;
            console.error('\n❌ Overall result:', errorMsg);
            return {
                success: false,
                error: errorMsg
            };
        }

        console.log('\n✅ All messages sent successfully!');
        return { success: true };
    } catch (error: any) {
        console.error('\n❌ Error in sendImageMessage:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send a scheduled message (text or image)
 */
/**
 * Send a scheduled message (text or image)
 */
export async function sendScheduledMessage(
    targetType: string,
    targetIds: string[],
    content: string,
    imageUrl?: string,
    imageUrls?: string | string[],
    token?: string
): Promise<{ success: boolean; error?: string }> {
    const target: MessageTarget = {
        type: targetType as 'user' | 'group' | 'room',
        ids: targetIds,
    };

    // Prioritize imageUrls (new), then imageUrl (legacy), then text-only
    const images = imageUrls ? (typeof imageUrls === 'string' ? JSON.parse(imageUrls) : imageUrls) : (imageUrl ? [imageUrl] : []);

    if (images && images.length > 0) {
        return sendImageMessage(target, images, content, token);
    } else {
        return sendTextMessage(target, content, token);
    }
}
