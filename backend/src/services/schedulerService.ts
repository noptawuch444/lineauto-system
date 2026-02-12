import cron from 'node-cron';
import { sendScheduledMessage } from './lineService';
import prisma from './db';

/**
 * Check for pending messages and send them if it's time
 */
async function checkAndSendMessages() {
    try {
        const now = new Date();

        // Find all pending messages that should be sent now
        const pendingMessages = await prisma.scheduledMessage.findMany({
            where: {
                status: 'pending',
                scheduledTime: { lte: now }
            },
            take: 50 // Bulk process limit per minute
        });

        if (pendingMessages.length === 0) return;

        console.log(`📨 [OPTIMIZED] Processing ${pendingMessages.length} message(s) in parallel...`);

        // Process in parallel using Promise.all
        await Promise.all(pendingMessages.map(async (message) => {
            try {
                const targetIds = JSON.parse(message.targetIds);
                const imageUrls = message.imageUrls ? JSON.parse(message.imageUrls) : undefined;

                // Send the message via LINE API
                const result = await sendScheduledMessage(
                    message.targetType,
                    targetIds,
                    message.content,
                    message.imageUrl || undefined,
                    imageUrls,
                    message.channelAccessToken || undefined
                );

                const finalStatus = result.success ? 'sent' : 'failed';

                // Concurrent atomic update
                await prisma.$transaction([
                    prisma.scheduledMessage.update({
                        where: { id: message.id },
                        data: { status: finalStatus as any }
                    }),
                    prisma.messageLog.create({
                        data: {
                            messageId: message.id,
                            status: finalStatus,
                            error: result.success ? null : (result.error || 'Unknown error')
                        }
                    })
                ]);

                console.log(`${result.success ? '✅' : '❌'} Message ${message.id} complete: ${finalStatus}`);
            } catch (err: any) {
                console.error(`💥 Critical fail for message ${message.id}:`, err.message);
                await prisma.scheduledMessage.update({
                    where: { id: message.id },
                    data: { status: 'failed' }
                }).catch(() => { });
            }
        }));
    } catch (error) {
        console.error('Error in scheduler:', error);
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
