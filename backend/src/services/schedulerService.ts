import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendScheduledMessage } from './lineService';

const prisma = new PrismaClient();

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
                scheduledTime: {
                    lte: now
                }
            }
        });

        if (pendingMessages.length === 0) {
            return;
        }

        console.log(`📨 Found ${pendingMessages.length} message(s) to send`);

        // Process each message
        for (const message of pendingMessages) {
            try {
                console.log(`Sending message ${message.id}...`);

                const targetIds = JSON.parse(message.targetIds);

                // Send the message via LINE API
                const imageUrls = message.imageUrls ? JSON.parse(message.imageUrls) : undefined;

                const result = await sendScheduledMessage(
                    message.targetType,
                    targetIds,
                    message.content,
                    message.imageUrl || undefined,
                    imageUrls,
                    message.channelAccessToken || undefined
                );

                // Update message status
                if (result.success) {
                    await prisma.scheduledMessage.update({
                        where: { id: message.id },
                        data: { status: 'sent' }
                    });

                    // Create success log
                    await prisma.messageLog.create({
                        data: {
                            messageId: message.id,
                            status: 'success',
                        }
                    });

                    console.log(`✅ Message ${message.id} sent successfully`);
                } else {
                    await prisma.scheduledMessage.update({
                        where: { id: message.id },
                        data: { status: 'failed' }
                    });

                    // Create error log
                    await prisma.messageLog.create({
                        data: {
                            messageId: message.id,
                            status: 'failed',
                            error: result.error || 'Unknown error'
                        }
                    });

                    console.error(`❌ Message ${message.id} failed: ${result.error}`);
                }
            } catch (error: any) {
                console.error(`Error processing message ${message.id}:`, error);

                // Update to failed status
                await prisma.scheduledMessage.update({
                    where: { id: message.id },
                    data: { status: 'failed' }
                });

                // Create error log
                await prisma.messageLog.create({
                    data: {
                        messageId: message.id,
                        status: 'failed',
                        error: error.message
                    }
                });
            }
        }
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
