import React, { useState, useEffect } from 'react';
import { MessageTemplate, CreateTemplateRequest, UpdateTemplateRequest } from '../types';
import { templateApi } from '../services/api';

const TemplateManager: React.FC = () => {
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [targetType, setTargetType] = useState<'user' | 'group' | 'room'>('user');
    const [targetIds, setTargetIds] = useState('');
    const [channelAccessToken, setChannelAccessToken] = useState('');

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const data = await templateApi.getAll();
            setTemplates(data);
        } catch (error) {
            console.error('Failed to fetch templates', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (template?: MessageTemplate) => {
        if (template) {
            setEditingTemplate(template);
            setName(template.name);
            setTargetType(template.targetType);
            setTargetIds(template.targetIds.join(','));
            setChannelAccessToken(template.channelAccessToken || '');
        } else {
            setEditingTemplate(null);
            setName('');
            setTargetType('user');
            setTargetIds('');
            setChannelAccessToken('');
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTemplate(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const idList = targetIds.split(',').map(id => id.trim()).filter(id => id);

        const templateData: CreateTemplateRequest = {
            name,
            targetType,
            targetIds: idList,
            channelAccessToken: channelAccessToken.trim() || undefined
        };

        try {
            if (editingTemplate) {
                await templateApi.update(editingTemplate.id, templateData);
            } else {
                await templateApi.create(templateData);
            }
            fetchTemplates();
            handleCloseModal();
        } catch (error) {
            alert('Failed to save template');
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this template?')) {
            try {
                await templateApi.delete(id);
                fetchTemplates();
            } catch (error) {
                alert('Failed to delete template');
            }
        }
    };

    return (
        <div className="template-manager">
            {/* Header / Stats Section */}
            <div className="tm-stats-grid">
                <div className="tm-stat-card primary">
                    <div className="stat-icon">📦</div>
                    <div className="stat-info">
                        <span className="stat-label">เทมเพลตทั้งหมด</span>
                        <span className="stat-value">{templates.length}</span>
                    </div>
                </div>
                <div className="tm-stat-card success">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <span className="stat-label">ใช้งานอยู่</span>
                        <span className="stat-value">{templates.length}</span>
                    </div>
                </div>
                <div className="tm-stat-card info">
                    <div className="stat-icon">📅</div>
                    <div className="stat-info">
                        <span className="stat-label">อัปเดตล่าสุด</span>
                        <span className="stat-value">วันนี้</span>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="tm-toolbar">
                <h2 className="section-title">รายการเทมเพลต <span>{templates.length}</span></h2>
                <button className="btn-create-new" onClick={() => handleOpenModal()}>
                    + สร้างใหม่
                </button>
            </div>

            {/* Template Grid */}
            <div className="tm-grid">
                {loading ? (
                    <div className="loading-spinner">Loading...</div>
                ) : templates.length === 0 ? (
                    <div className="empty-state">No templates found. Create one!</div>
                ) : (
                    templates.map(template => (
                        <div key={template.id} className="tm-card">
                            <div className="tm-card-header">
                                <div className={`tm-badge ${template.targetType}`}>
                                    {template.targetType.toUpperCase()}
                                </div>
                                <div className="tm-menu">
                                    <button onClick={() => handleDelete(template.id)}>⋮</button>
                                </div>
                            </div>
                            <div className="tm-card-body">
                                <h3>{template.name}</h3>
                                <div className="tm-detail-row">
                                    <span>Target IDs:</span>
                                    <span className="count-badge">{template.targetIds.length}</span>
                                </div>
                                <div className="tm-detail-row">
                                    <span>Bot Token:</span>
                                    <span className={`token-status ${template.channelAccessToken ? 'active' : 'default'}`}>
                                        {template.channelAccessToken ? 'Custom' : 'Default'}
                                    </span>
                                </div>
                                <div className="tm-date">
                                    📅 {new Date(template.updatedAt).toLocaleDateString('th-TH')}
                                </div>
                            </div>
                            <div className="tm-card-footer">
                                <button className="btn-edit-template" onClick={() => handleOpenModal(template)}>
                                    OPEN EDITOR
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingTemplate ? 'แก้ไขเทมเพลต' : 'สร้างเทมเพลตใหม่'}</h3>
                            <button className="close-btn" onClick={handleCloseModal}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>ชื่อเทมเพลต</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="เช่น: กลุ่มลูกค้า VIP"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>ประเภทเป้าหมาย</label>
                                <select
                                    value={targetType}
                                    onChange={e => setTargetType(e.target.value as any)}
                                >
                                    <option value="user">👤 User</option>
                                    <option value="group">👥 Group</option>
                                    <option value="room">🚪 Room</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Target IDs (คั่นด้วยเครื่องหมายจุลภาค)</label>
                                <textarea
                                    value={targetIds}
                                    onChange={e => setTargetIds(e.target.value)}
                                    placeholder="Uc38d..., C49e..."
                                    rows={3}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Channel Access Token (Optional)</label>
                                <input
                                    type="text"
                                    value={channelAccessToken}
                                    onChange={e => setChannelAccessToken(e.target.value)}
                                    placeholder="ใส่เฉพาะถ้าต้องการใช้บอทแยก"
                                />
                                <small className="hint">ปล่อยว่างไว้เพื่อใช้ Token หลักของระบบ</small>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>ยกเลิก</button>
                                <button type="submit" className="btn-save">บันทึก</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TemplateManager;
