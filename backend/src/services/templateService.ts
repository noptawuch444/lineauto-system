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
        orderBy: { createdAt: 'desc' }
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
            isActive: true
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
}) {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.targetType !== undefined) updateData.targetType = data.targetType;
    if (data.targetIds !== undefined) updateData.targetIds = JSON.stringify(data.targetIds);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return await prisma.messageTemplate.update({
        where: { id },
        data: updateData
    });
}

/**
 * Delete template
 */
export async function deleteTemplate(id: string) {
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

    return await prisma.messageTemplate.update({
        where: { id },
        data: { isActive: !template.isActive }
    });
}
