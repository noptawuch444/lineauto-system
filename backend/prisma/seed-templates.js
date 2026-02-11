const { PrismaClient } = require('@prisma/client');
const { customAlphabet } = require('nanoid');

const prisma = new PrismaClient();
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

async function seedTemplates() {
    console.log('🌱 Seeding sample templates...');

    const templates = [
        {
            name: 'ส่งข่าวกลุ่ม A',
            description: 'สำหรับส่งข่าวสารไปยังกลุ่ม A',
            category: 'news',
            targetType: 'group',
            targetIds: JSON.stringify(['Cxxxxxxxxxxxxx']),
            publicCode: nanoid(),
            isActive: true
        },
        {
            name: 'โปรโมชั่นพิเศษ',
            description: 'ส่งโปรโมชั่นไปทุกกลุ่ม',
            category: 'promotion',
            targetType: 'group',
            targetIds: JSON.stringify(['Cxxxxxxxxxxxxx', 'Cyyyyyyyyyyyyy']),
            publicCode: nanoid(),
            isActive: true
        }
    ];

    for (const template of templates) {
        const existing = await prisma.messageTemplate.findFirst({
            where: { name: template.name }
        });

        if (existing) {
            await prisma.messageTemplate.update({
                where: { id: existing.id },
                data: template
            });
            console.log(`✅ Updated template: ${template.name}`);
        } else {
            await prisma.messageTemplate.create({
                data: template
            });
            console.log(`✅ Created template: ${template.name} (${template.publicCode})`);
        }
    }

    console.log('✨ Seeding completed!');
}

seedTemplates()
    .catch((e) => {
        console.error('❌ Error seeding templates:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
