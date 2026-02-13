import cron from 'node-cron';
import { sendScheduledMessage } from './lineService';
import prisma from './db';

let isProcessing = false;

/**
 * Check for pending messages and send them if it's time
 */
async function checkAndSendMessages() {
    if (isProcessing) return; // Prevent overlapping runs

    try {
        isProcessing = true;
        const now = new Date();

        // 1. Fetch pending messages
        const pendingMessages = await prisma.scheduledMessage.findMany({
            where: {
                status: 'pending',
                scheduledTime: { lte: now }
            },
            take: 50
        });

        if (pendingMessages.length === 0) return;

        console.log(`📨 [OPTIMIZED] Processing ${pendingMessages.length} message(s)...`);

        // 2. Mark as 'sending' immediately to prevent other runs from picking them up
        const messageIds = pendingMessages.map(m => m.id);
        await prisma.scheduledMessage.updateMany({
            where: { id: { in: messageIds } },
            data: { status: 'sending' }
        });

        // 3. Process each message sequentially for STABILITY
        for (const message of pendingMessages) {
            let finalStatus: 'sent' | 'failed' = 'failed';
            let errorMessage: string | null = null;

            try {
                const targetIds = JSON.parse(message.targetIds);
                const imageUrls = message.imageUrls ? JSON.parse(message.imageUrls) : undefined;

                const result = await sendScheduledMessage(
                    message.targetType,
                    targetIds,
                    message.content,
                    message.imageUrl || undefined,
                    imageUrls,
                    message.channelAccessToken || undefined,
                    message.imageFirst,
                    message.botId || undefined
                );

                finalStatus = result.success ? 'sent' : 'failed';
                errorMessage = result.success ? null : (result.error || 'Unknown error');
            } catch (err: any) {
                console.error(`💥 [Critical] Message ${message.id}:`, err.message);
                errorMessage = err.message;
            }

            // 4. Update final result and log
            try {
                await prisma.$transaction([
                    prisma.scheduledMessage.update({ where: { id: message.id }, data: { status: finalStatus } }),
                    prisma.messageLog.create({
                        data: { messageId: message.id, status: finalStatus, error: errorMessage }
                    })
                ]);
            } catch (dbErr: any) {
                console.error(`❌ DB Sync Failed for ${message.id}:`, dbErr.message);
            }
        }
    } catch (error) {
        console.error('Error in scheduler:', error);
    } finally {
        isProcessing = false;
    }
}

/**
 * Initialize the scheduler to check every minute
 */
export function initScheduler() {
    // Run every minute
    cron.schedule('* * * * *', () => {
        checkAndSendMessages();
    });

    console.log('✅ Scheduler initialized - checking every minute');
}
