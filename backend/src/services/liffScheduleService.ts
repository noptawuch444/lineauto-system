import prisma from './db';

/**
 * Get groups assigned to a user by LINE User ID
 */
export async function getMyGroups(lineUserId: string) {
    const user = await prisma.user.findUnique({
        where: { lineUserId },
        include: {
            assignedGroups: true
        }
    });

    if (!user) {
        throw new Error('User not found');
    }

    return {
        user: {
            id: user.id,
            displayName: user.displayName,
            lineUserId: user.lineUserId
        },
        groups: user.assignedGroups
    };
}

/**
 * Create a scheduled message for LIFF user
 */
export async function createScheduledMessage(
    lineUserId: string,
    content: string,
    scheduledTime: Date,
    targetGroupId: string,
    imageUrl?: string
) {
    // Get user
    const user = await prisma.user.findUnique({
        where: { lineUserId },
        include: {
            assignedGroups: true
        }
    });

    if (!user) {
        throw new Error('User not found');
    }

    // Check if user has permission to send to this group
    const hasPermission = user.assignedGroups.some(g => g.id === targetGroupId);
    if (!hasPermission) {
        throw new Error('You do not have permission to send messages to this group');
    }

    // Get the group details
    const group = await prisma.lineGroup.findUnique({
        where: { id: targetGroupId }
    });

    if (!group) {
        throw new Error('Group not found');
    }

    // Create scheduled message
    return await prisma.scheduledMessage.create({
        data: {
            content,
            imageUrl: imageUrl || null,
            scheduledTime,
            status: 'pending',
            targetType: 'group',
            targetIds: JSON.stringify([group.groupId]), // Store LINE group ID
            createdByUserId: user.id,
            userIdentifier: lineUserId
        }
    });
}

/**
 * Get all scheduled messages created by this user
 */
export async function getMyMessages(lineUserId: string) {
    const user = await prisma.user.findUnique({
        where: { lineUserId }
    });

    if (!user) {
        throw new Error('User not found');
    }

    return await prisma.scheduledMessage.findMany({
        where: {
            createdByUserId: user.id
        },
        orderBy: {
            scheduledTime: 'asc'
        }
    });
}
