const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking Scheduled Messages (Detailed)...');

    const messages = await prisma.scheduledMessage.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            userIdentifier: true,
            content: true,
            status: true,
            scheduledTime: true,
            createdAt: true
        }
    });

    console.log(`Found ${messages.length} messages (showing last 20).`);

    messages.forEach((msg: any) => {
        console.log(`ID: ${msg.id}`);
        console.log(`User: "${msg.userIdentifier}"`);
        console.log(`Content: ${msg.content.substring(0, 20)}...`);
        console.log(`Status: ${msg.status}`);
        console.log(`Scheduled: ${msg.scheduledTime.toISOString()}`); // Check Timezone/Format
        console.log(`Created:   ${msg.createdAt.toISOString()}`);
        console.log('-------------------------');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
