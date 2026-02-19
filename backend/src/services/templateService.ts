import prisma from './db';
import { customAlphabet } from 'nanoid';

// Simple in-memory cache for public codes
const publicCache = new Map<string, any>();
const CACHE_TTL = 30000; // 30 seconds

// Generate short alphanumeric code
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

/**
 * Generate unique public code
 */
export function generatePublicCode(): string {
    return nanoid();
}

/**
 * Get all active templates
 */
export async function getActiveTemplates() {
    return await prisma.messageTemplate.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
    });
}

/**
 * Get all templates (for admin)
 */
export async function getAllTemplates() {
    return await prisma.messageTemplate.findMany({
        orderBy: { createdAt: 'desc' },
        include: { bot: { select: { name: true } } }
    });
}

/**
 * Get template by ID
 */
export async function getTemplateById(id: string) {
    return await prisma.messageTemplate.findUnique({
        where: { id }
    });
}

/**
 * Get template by public code
 */
export async function getTemplateByPublicCode(publicCode: string) {
    // Check cache
    const cached = publicCache.get(publicCode);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }

    const template = await prisma.messageTemplate.findUnique({
        where: { publicCode }
    });

    if (template) {
        publicCache.set(publicCode, { data: template, timestamp: Date.now() });
    }

    return template;
}

/**
 * Create a new template
 */
export async function createTemplate(data: {
    name: string;
    description?: string;
    category?: string;
    targetType: string;
    targetIds: string[];
    botId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
}) {
    const publicCode = generatePublicCode();

    return await prisma.messageTemplate.create({
        data: {
            name: data.name,
            description: data.description || null,
            category: data.category || null,
            targetType: data.targetType,
            targetIds: JSON.stringify(data.targetIds),
            publicCode,
            isActive: true,
            botId: data.botId || null,
            startDate: data.startDate ? new Date(data.startDate) : null,
            endDate: data.endDate ? new Date(data.endDate) : null
        }
    });
}

/**
 * Update template
 */
export async function updateTemplate(id: string, data: {
    name?: string;
    description?: string;
    category?: string;
    targetType?: string;
    targetIds?: string[];
    isActive?: boolean;
    botId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
}) {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.targetType !== undefined) updateData.targetType = data.targetType;
    if (data.targetIds !== undefined) updateData.targetIds = JSON.stringify(data.targetIds);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.botId !== undefined) updateData.botId = data.botId;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

    const updated = await prisma.messageTemplate.update({
        where: { id },
        data: updateData
    });

    // Invalidate cache
    publicCache.delete(updated.publicCode);

    return updated;
}

/**
 * Delete template
 */
export async function deleteTemplate(id: string) {
    const template = await prisma.messageTemplate.findUnique({ where: { id } });
    if (template) {
        publicCache.delete(template.publicCode);
    }
    return await prisma.messageTemplate.delete({
        where: { id }
    });
}

/**
 * Toggle template active status
 */
export async function toggleTemplateStatus(id: string) {
    const template = await getTemplateById(id);
    if (!template) {
        throw new Error('Template not found');
    }

    const updated = await prisma.messageTemplate.update({
        where: { id },
        data: { isActive: !template.isActive }
    });

    // Invalidate cache
    publicCache.delete(updated.publicCode);

    return updated;
}
