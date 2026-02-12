import { Router } from 'express';
import * as templateService from '../services/templateService';

const router = Router();

/**
 * GET /api/admin/templates
 * Get all templates (including inactive)
 */
router.get('/', async (req, res) => {
    try {
        const templates = await templateService.getAllTemplates();
        res.json(templates);
    } catch (error: any) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

/**
 * POST /api/admin/templates
 * Create a new template
 */
router.post('/', async (req, res) => {
    try {
        const { name, description, category, targetType, targetIds, botId } = req.body;

        if (!name || !targetType || !targetIds) {
            return res.status(400).json({ error: 'Name, targetType, and targetIds are required' });
        }

        const template = await templateService.createTemplate({
            name,
            description,
            category,
            targetType,
            targetIds,
            botId
        });

        res.status(201).json(template);
    } catch (error: any) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: 'Failed to create template' });
    }
});

/**
 * PUT /api/admin/templates/:id
 * Update a template
 */
router.put('/:id', async (req, res) => {
    try {
        const { name, description, category, targetType, targetIds, isActive, botId } = req.body;

        const template = await templateService.updateTemplate(req.params.id, {
            name,
            description,
            category,
            targetType,
            targetIds,
            isActive,
            botId
        });

        res.json(template);
    } catch (error: any) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: 'Failed to update template' });
    }
});

/**
 * DELETE /api/admin/templates/:id
 * Delete a template
 */
router.delete('/:id', async (req, res) => {
    try {
        await templateService.deleteTemplate(req.params.id);
        res.json({ message: 'Template deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

/**
 * POST /api/admin/templates/:id/toggle
 * Toggle template active status
 */
router.post('/:id/toggle', async (req, res) => {
    try {
        const template = await templateService.toggleTemplateStatus(req.params.id);
        res.json(template);
    } catch (error: any) {
        console.error('Error toggling template status:', error);
        res.status(500).json({ error: 'Failed to toggle template status' });
    }
});

export default router;
