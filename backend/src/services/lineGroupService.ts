import prisma from './db';

export const lineGroupService = {
    // Create or Update a LineGroup
    async syncGroup(groupId: string, groupName?: string, pictureUrl?: string, botId?: string) {
        try {
            return await prisma.lineGroup.upsert({
                where: { groupId },
                update: {
                    groupName: groupName || undefined,
                    pictureUrl: pictureUrl || undefined,
                    botId: botId || undefined, // Update bot association if it joins again
                    updatedAt: new Date()
                },
                create: {
                    groupId,
                    groupName: groupName || 'Unknown Group',
                    pictureUrl: pictureUrl || null,
                    botId: botId || null
                }
            });
        } catch (error) {
            console.error('Error syncing LineGroup:', error);
            throw error;
        }
    },

    // Get all groups, optionally filtered by botId
    async getAllGroups(botId?: string) {
        return await prisma.lineGroup.findMany({
            where: botId ? { botId } : {},
            orderBy: { createdAt: 'desc' }
        });
    }
};
