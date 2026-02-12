import prisma from './db';

export const userService = {
    // Create or Update User on Login
    async syncUser(lineUserId: string, displayName: string, pictureUrl?: string) {
        try {
            return await prisma.user.upsert({
                where: { lineUserId },
                update: {
                    displayName,
                    pictureUrl: pictureUrl || undefined,
                    updatedAt: new Date()
                },
                create: {
                    lineUserId,
                    displayName,
                    pictureUrl: pictureUrl || null,
                    role: 'user',
                    status: 'active'
                }
            });
        } catch (error) {
            console.error('Error syncing User:', error);
            throw error;
        }
    },

    // Get User by LINE User ID
    async getUserByLineId(lineUserId: string) {
        return await prisma.user.findUnique({
            where: { lineUserId },
            include: {
                assignedGroups: true
            }
        });
    },

    // Get all users
    async getAllUsers() {
        return await prisma.user.findMany({
            include: {
                assignedGroups: true
            },
            orderBy: { createdAt: 'desc' }
        });
    },

    // Assign groups to user
    async assignGroupsToUser(userId: string, groupIds: string[]) {
        return await prisma.user.update({
            where: { id: userId },
            data: {
                assignedGroups: {
                    set: groupIds.map(id => ({ id }))
                }
            },
            include: {
                assignedGroups: true
            }
        });
    },

    // Get user by user code
    async getUserByCode(userCode: string) {
        return await prisma.user.findUnique({
            where: { userCode },
            include: {
                assignedGroups: true
            }
        });
    },

    // Get assigned groups by user code
    async getUserAssignedGroupsByCode(userCode: string) {
        const user = await prisma.user.findUnique({
            where: { userCode },
            include: {
                assignedGroups: true
            }
        });
        return user?.assignedGroups || [];
    },

    // Create user with code (for admin)
    async createUserWithCode(displayName: string, userCode: string) {
        return await prisma.user.create({
            data: {
                lineUserId: `manual-${userCode}`, // Temporary LINE user ID
                displayName,
                userCode,
                role: 'user',
                status: 'active'
            },
            include: {
                assignedGroups: true
            }
        });
    }
};
