import prisma from './db';

export const publicScheduleService = {
    // Get available groups for a user code
    async getAvailableGroups(userCode: string) {
        const user = await prisma.user.findUnique({
            where: { userCode },
            include: {
                assignedGroups: true
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user.assignedGroups;
    },

    // Create scheduled message from public link
    async createScheduledMessage(
        userCode: string,
        content: string,
        scheduledTime: Date,
        targetGroupId: string,
        imageUrl?: string
    ) {
        // Verify user exists and has access to the group
        const user = await prisma.user.findUnique({
            where: { userCode },
            include: {
                assignedGroups: true
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Check if user has access to this group
        const hasAccess = user.assignedGroups.some(group => group.id === targetGroupId);
        if (!hasAccess) {
            throw new Error('User does not have access to this group');
        }

        // Get the group details
        const group = await prisma.lineGroup.findUnique({
            where: { id: targetGroupId }
        });

        if (!group) {
            throw new Error('Group not found');
        }

        // Create the scheduled message
        return await prisma.scheduledMessage.create({
            data: {
                content,
                imageUrl: imageUrl || null,
                scheduledTime,
                status: 'pending',
                targetType: 'group',
                targetIds: JSON.stringify([group.groupId]), // Store LINE group ID
                createdByUserId: user.id,
                userIdentifier: userCode
            }
        });
    },

    // Get scheduled messages for a user code
    async getUserScheduledMessages(userCode: string) {
        return await prisma.scheduledMessage.findMany({
            where: {
                userIdentifier: userCode
            },
            orderBy: {
                scheduledTime: 'asc'
            }
        });
    }
};
