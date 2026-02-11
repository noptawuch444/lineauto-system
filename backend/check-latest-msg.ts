
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLatestMessage() {
    try {
        const message = await prisma.scheduledMessage.findFirst({
            orderBy: { createdAt: 'desc' }
        });

        console.log('--- Latest Message ---');
        console.log('ID:', message?.id);
        console.log('Content:', message?.content);
        console.log('Legacy imageUrl:', message?.imageUrl);
        console.log('New imageUrls:', message?.imageUrls);
        console.log('Target IDs:', message?.targetIds);
        console.log('----------------------');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkLatestMessage();
