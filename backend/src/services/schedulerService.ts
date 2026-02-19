import cron from 'node-cron';
import { sendScheduledMessage } from './lineService';
import prisma from './db';

let isProcessing = false;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;
const SEND_TIMEOUT_MS = 30_000; // 30 second timeout per message

/** Wrap a promise with a timeout */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms);
        promise.then(
            val => { clearTimeout(timer); resolve(val); },
            err => { clearTimeout(timer); reject(err); }
        );
    });
}

/**
 * Check for pending messages and send them
 */
export async function checkAndSendMessages() {
    if (isProcessing) return;

    isProcessing = true;
    try {
        const now = new Date();
        const checkWindow = new Date(now.getTime() + 2_000); // 2s lookahead

        const pendingMessages = await prisma.scheduledMessage.findMany({
            where: { status: 'pending', scheduledTime: { lte: checkWindow } },
            take: 50,
            orderBy: { scheduledTime: 'asc' }
        });

        if (pendingMessages.length === 0) {
            consecutiveErrors = 0;
            return;
        }

        console.log(`📨 [SCHEDULER] Processing ${pendingMessages.length} message(s)...`);

        // Atomically claim messages to prevent double-send across instances
        const messageIds = pendingMessages.map(m => m.id);
        await prisma.scheduledMessage.updateMany({
            where: { id: { in: messageIds }, status: 'pending' }, // double-check status
            data: { status: 'sending' }
        });

        for (const message of pendingMessages) {
            let finalStatus: 'sent' | 'failed' = 'failed';
            let errorMessage: string | null = null;

            try {
                const targetIds: string[] = JSON.parse(message.targetIds);
                const imageUrls = message.imageUrls
                    ? (() => { try { return JSON.parse(message.imageUrls!); } catch { return message.imageUrls; } })()
                    : undefined;

                const sendPromise = sendScheduledMessage(
                    message.targetType,
                    targetIds,
                    message.content,
                    message.imageUrl || undefined,
                    imageUrls,
                    message.channelAccessToken || undefined,
                    message.imageFirst,
                    message.botId || undefined
                );

                const result = await withTimeout(sendPromise, SEND_TIMEOUT_MS, `msg:${message.id}`);
                finalStatus = result.success ? 'sent' : 'failed';
                errorMessage = result.success ? null : (result.error || 'Unknown error');
            } catch (err: any) {
                console.error(`💥 [Critical] Message ${message.id}:`, err.message);
                errorMessage = err.message;
            }

            // Persist result with retry on DB failure
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await prisma.$transaction([
                        prisma.scheduledMessage.update({
                            where: { id: message.id },
                            data: { status: finalStatus }
                        }),
                        prisma.messageLog.create({
                            data: { messageId: message.id, status: finalStatus, error: errorMessage }
                        })
                    ]);
                    break; // Success — exit retry loop
                } catch (dbErr: any) {
                    if (attempt === 2) {
                        console.error(`❌ DB Sync FINAL FAIL for ${message.id}:`, dbErr.message);
                    } else {
                        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
                    }
                }
            }
        }

        consecutiveErrors = 0;
    } catch (error: any) {
        consecutiveErrors++;
        console.error(`❌ Scheduler error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error.message);

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            console.error('🚨 Too many consecutive scheduler errors — check DB/network connectivity');
            consecutiveErrors = 0; // Reset to keep trying
        }
    } finally {
        isProcessing = false;
    }
}

/**
 * Initialize the cron scheduler (every 10 seconds)
 */
export function initScheduler() {
    cron.schedule('*/10 * * * * *', () => {
        checkAndSendMessages().catch(err => {
            console.error('[SCHEDULER UNHANDLED]', err.message);
        });
    });

    console.log('🚀 Scheduler initialized — checking every 10s');
}
