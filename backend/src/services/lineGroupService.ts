import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const lineGroupService = {
    // Create or Update a LineGroup
    async syncGroup(groupId: string, groupName?: string, pictureUrl?: string) {
        try {
            return await prisma.lineGroup.upsert({
                where: { groupId },
                update: {
                    groupName: groupName || undefined,
                    pictureUrl: pictureUrl || undefined,
                    updatedAt: new Date()
                },
                create: {
                    groupId,
                    groupName: groupName || 'Unknown Group',
                    pictureUrl: pictureUrl || null
                }
            });
        } catch (error) {
            console.error('Error syncing LineGroup:', error);
            throw error;
        }
    },

    // Get all groups
    async getAllGroups() {
        return await prisma.lineGroup.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }
};
