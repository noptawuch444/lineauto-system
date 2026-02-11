import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Plus, Edit3, Trash2, Power, Copy, ExternalLink,
    Save, X, Layers, Target, Loader2, AlertTriangle,
    CheckCircle2, XCircle, Database, RotateCw
} from 'lucide-react';
import './TemplateManagement.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const FRONTEND_URL = window.location.origin;

interface MessageTemplate {
    id: string;
    name: string;
    description?: string | null;
    category?: string | null;
    targetType: string;
    targetIds: string;
    publicCode: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function TemplateManagement() {
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [lineGroups, setLineGroups] = useState<any[]>([]);
    const [showGroupCatalog, setShowGroupCatalog] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        targetType: 'group',
        targetIds: ''
    });
    const [toast, setToast] = useState<{ msg: string, type: 'ok' | 'err' | 'warn' } | null>(null);

    const showToast = (msg: string, type: 'ok' | 'err' | 'warn' = 'ok') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        fetchTemplates();
        fetchLineGroups();
    }, []);

    const fetchLineGroups = async () => {
        try {
            const r = await axios.get(`${API_BASE_URL}/admin/groups`);
            setLineGroups(r.data);
        } catch (e) {
            console.error('Error fetching line groups:', e);
        }
    };

    // Snowfall Effect for Admin Page
    useEffect(() => {
        if (loading || error) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const flakeCount = 100;
        const flakes: { x: number; y: number; r: number; d: number; s: number; color: string }[] = [];

        const goldShades = [
            'rgba(243, 207, 138, 0.4)', // Faded Gold
            'rgba(201, 168, 76, 0.5)',
            'rgba(255, 235, 180, 0.3)',
            'rgba(180, 140, 50, 0.5)'
        ];

        for (let i = 0; i < flakeCount; i++) {
            flakes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * 2 + 1,
                d: Math.random() * flakeCount,
                s: Math.random() * 1 + 0.5,
                color: goldShades[Math.floor(Math.random() * goldShades.length)]
            });
        }

        const drawFlakes = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < flakeCount; i++) {
                const f = flakes[i];
                ctx.beginPath();
                ctx.fillStyle = f.color;
                ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2, true);
                ctx.fill();
            }
            moveFlakes();
            requestAnimationFrame(drawFlakes);
        };

        let angle = 0;
        const moveFlakes = () => {
            angle += 0.01;
            for (let i = 0; i < flakeCount; i++) {
                const f = flakes[i];
                f.y += f.s;
                f.x += Math.sin(angle + f.d) * 0.5;

                if (f.y > height) {
                    flakes[i] = { x: Math.random() * width, y: -10, r: f.r, d: f.d, s: f.s, color: f.color };
                }
                if (f.x > width + 5) flakes[i].x = -5;
                if (f.x < -5) flakes[i].x = width + 5;
            }
        };

        const animId = requestAnimationFrame(drawFlakes);

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animId);
        };
    }, [loading, error]);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/admin/templates`);
            // Sort by createdAt ASC (oldest first, newest last/on the right)
            const sorted = response.data.sort((a: any, b: any) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            setTemplates(sorted);
            setError('');
        } catch (error: any) {
            console.error('Error fetching templates:', error);
            setError('ไม่สามารถโหลดข้อมูลเทมเพลตได้');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setIsEditing(true);
        setSelectedTemplate(null);
        setFormData({ name: '', description: '', category: '', targetType: 'group', targetIds: '' });
    };

    const handleEdit = (template: MessageTemplate) => {
        setIsEditing(true);
        setSelectedTemplate(template);

        let targetIdsStr = '';
        try {
            const ids = JSON.parse(template.targetIds);
            targetIdsStr = Array.isArray(ids) ? ids.join(', ') : template.targetIds;
        } catch (e) {
            targetIdsStr = template.targetIds;
        }

        setFormData({
            name: template.name,
            description: template.description || '',
            category: template.category || '',
            targetType: template.targetType,
            targetIds: targetIdsStr
        });
    };

    const handleSave = async () => {
        if (!formData.name.trim()) return showToast('กรุณาใส่ชื่อเทมเพลต', 'warn');

        // 🚨 Check for duplicate names (Case-insensitive)
        const isNameDuplicate = templates.some(t =>
            t.name.toLowerCase().trim() === formData.name.toLowerCase().trim() &&
            t.id !== selectedTemplate?.id
        );

        if (isNameDuplicate) {
            showToast(`ชื่อเทมเพลต "${formData.name}" มีผู้อื่นใช้งานแล้ว`, 'warn');
            return;
        }

        try {
            const targetIdsArray = formData.targetIds
                .split(',')
                .map(id => id.trim())
                .filter(id => id.length > 0);

            if (targetIdsArray.length === 0) {
                showToast('กรุณาใส่ Target IDs อย่างน้อย 1 รายการ', 'warn');
                return;
            }

            // 🚨 Check for duplicate Target IDs across other templates
            for (const idToCheck of targetIdsArray) {
                for (const t of templates) {
                    if (t.id === selectedTemplate?.id) continue;

                    let existingIds: string[] = [];
                    try {
                        existingIds = JSON.parse(t.targetIds);
                        if (!Array.isArray(existingIds)) existingIds = [t.targetIds];
                    } catch {
                        existingIds = [t.targetIds];
                    }

                    if (existingIds.includes(idToCheck)) {
                        showToast(`ID "${idToCheck}" ถูกใช้งานแล้วในเทมเพลต "${t.name}"`, 'warn');
                        return;
                    }
                }
            }

            const payload = {
                name: formData.name,
                description: formData.description,
                category: formData.category,
                targetType: formData.targetType,
                targetIds: targetIdsArray
            };

            if (selectedTemplate) {
                await axios.put(`${API_BASE_URL}/admin/templates/${selectedTemplate.id}`, payload);
            } else {
                await axios.post(`${API_BASE_URL}/admin/templates`, payload);
            }

            setIsEditing(false);
            fetchTemplates();
            showToast(selectedTemplate ? 'บันทึกการแก้ไขเรียบร้อย' : 'สร้างเทมเพลตใหม่เรียบร้อย', 'ok');
        } catch (error) {
            console.error('Error saving template:', error);
            showToast('เกิดข้อผิดพลาดในการบันทึก', 'err');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('คุณต้องการลบเทมเพลตนี้หรือไม่?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/admin/templates/${id}`);
            fetchTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
            alert('เกิดข้อผิดพลาดในการลบ');
        }
    };

    const handleToggleStatus = async (id: string) => {
        try {
            await axios.post(`${API_BASE_URL}/admin/templates/${id}/toggle`);
            setTemplates(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const copyPublicLink = (publicCode: string) => {
        const link = `${FRONTEND_URL}/schedule/${publicCode}`;
        navigator.clipboard.writeText(link);
        showToast('คัดลอกลิงก์สำเร็จ!', 'ok');
    };

    const openPublicLink = (publicCode: string) => {
        window.open(`${FRONTEND_URL}/schedule/${publicCode}`, '_blank');
    };

    if (loading) return (
        <div className="adm">
            <div className="adm-center"><Loader2 className="adm-spin" /></div>
        </div>
    );

    return (
        <div className="adm">
            {toast && (
                <div className={`adm-toast ${toast.type}`}>
                    {toast.type === 'ok' && <CheckCircle2 size={18} />}
                    {toast.type === 'err' && <XCircle size={18} />}
                    {toast.type === 'warn' && <AlertTriangle size={18} />}
                    <span>{toast.msg}</span>
                </div>
            )}
            {/* Background Layers */}
            <div className="adm-bg-anim">
                <canvas ref={canvasRef} className="adm-canvas" />
            </div>

            <div className="adm-container">
                <header className="adm-header">
                    <div className="adm-header-l">
                        <Layers size={24} className="adm-header-icon" />
                        <div>
                            <h1>จัดการเทมเพลต</h1>
                            <p>สร้างและตั้งค่าหน้า Public สำหรับแจ้งเตือนกลุ่มต่างๆ</p>
                        </div>
                    </div>
                    <div className="adm-header-actions">
                        <button className="adm-btn-outline" onClick={() => setShowGroupCatalog(true)}>
                            <Database size={18} /> สมุดรายชื่อกลุ่ม
                        </button>
                        {!isEditing && (
                            <button className="adm-btn-primary" onClick={handleCreate}>
                                <Plus size={18} /> สร้างใหม่
                            </button>
                        )}
                    </div>
                </header>

                {/* Group Catalog Overlay */}
                {showGroupCatalog && (
                    <div className="adm-overlay" onClick={() => setShowGroupCatalog(false)}>
                        <div className="adm-modal" onClick={e => e.stopPropagation()}>
                            <div className="adm-modal-head">
                                <h3><Database size={20} /> รายชื่อกลุ่มที่บอทพบ</h3>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <button className="adm-btn-refresh" onClick={fetchLineGroups} title="รีเฟรช">
                                        <RotateCw size={18} />
                                    </button>
                                    <button className="adm-modal-close" onClick={() => setShowGroupCatalog(false)}><X size={20} /></button>
                                </div>
                            </div>
                            <div className="adm-modal-body">
                                <div className="adm-group-list">
                                    {lineGroups.length === 0 ? (
                                        <p className="adm-empty-p">ห้าพบข้อมูลกลุ่ม (กรุณาเชิญบอทเข้ากลุ่มก่อน)</p>
                                    ) : lineGroups.map(g => (
                                        <div key={g.groupId} className="adm-group-item">
                                            <div className="adm-group-icon">
                                                {g.pictureUrl ? <img src={g.pictureUrl} alt="" /> : <span>{g.groupName?.[0] || 'G'}</span>}
                                            </div>
                                            <div className="adm-group-info">
                                                <strong>{g.groupName || 'Unknown Name'}</strong>
                                                <code>{g.groupId}</code>
                                            </div>
                                            <button className="adm-btn-copy-id" onClick={() => {
                                                navigator.clipboard.writeText(g.groupId);
                                                showToast('คัดลอก ID แล้ว', 'ok');
                                            }}>
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {isEditing ? (
                    <div className="adm-panel fade-in">
                        <div className="adm-panel-head">
                            <div className="adm-panel-title">
                                {selectedTemplate ? <Edit3 size={18} /> : <Plus size={18} />}
                                <span>{selectedTemplate ? 'แก้ไขเทมเพลต' : 'สร้างเทมเพลตใหม่'}</span>
                            </div>
                            <button className="adm-btn-ghost" onClick={() => setIsEditing(false)}>
                                <X size={18} /> ปิด
                            </button>
                        </div>

                        <div className="adm-form">
                            <div className="adm-form-row">
                                <div className="adm-fg flex-2">
                                    <label>ชื่อเทมเพลต*</label>
                                    <input
                                        type="text"
                                        className="adm-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="เช่น แจ้งผลหวยฮานอย"
                                    />
                                </div>
                                <div className="adm-fg flex-1">
                                    <label>หมวดหมู่</label>
                                    <select
                                        className="adm-input"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="">ทั่วไป</option>
                                        <option value="lottery">หวย</option>
                                        <option value="promotion">โปรโมชั่น</option>
                                        <option value="news">ข่าวสาร</option>
                                    </select>
                                </div>
                            </div>

                            <div className="adm-fg">
                                <label>คำอธิบาย (สั้นๆ)</label>
                                <input
                                    type="text"
                                    className="adm-input"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="เช่น สำหรับทีมงานแอดมินส่งผลหวยรายวัน"
                                />
                            </div>

                            <div className="adm-form-row">
                                <div className="adm-fg flex-1">
                                    <label>Target Type*</label>
                                    <select
                                        className="adm-input"
                                        value={formData.targetType}
                                        onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                                    >
                                        <option value="group">Group (กลุ่มไลน์)</option>
                                        <option value="user">User (คนเดียว)</option>
                                        <option value="room">Room (ห้องแชท)</option>
                                    </select>
                                </div>
                                <div className="adm-fg flex-2">
                                    <label>Target IDs* (แยกด้วย comma)</label>
                                    <textarea
                                        className="adm-ta"
                                        value={formData.targetIds}
                                        onChange={(e) => setFormData({ ...formData, targetIds: e.target.value })}
                                        placeholder="Cxxxxxxxxxxxx, Cyyyyyyyyyyyy"
                                        rows={2}
                                    />
                                </div>
                            </div>

                            <div className="adm-form-footer">
                                <button className="adm-btn-save" onClick={handleSave}>
                                    <Save size={18} /> บันทึกข้อมูล
                                </button>
                                <button className="adm-btn-clear" onClick={() => setIsEditing(false)}>
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="adm-grid">
                        {templates.length === 0 ? (
                            <div className="adm-empty">
                                <AlertTriangle size={48} />
                                <p>ไม่พบเทมเพลต กรุณาสร้างจากปุ่มด่านบน</p>
                            </div>
                        ) : templates.map(template => {
                            let ids: string[] = [];
                            try { ids = JSON.parse(template.targetIds); if (!Array.isArray(ids)) ids = [template.targetIds]; }
                            catch { ids = [template.targetIds]; }

                            return (
                                <div key={template.id} className={`adm-card ${!template.isActive ? 'adm-inactive' : ''}`}>
                                    <div className="adm-card-head">
                                        <div className="adm-card-info">
                                            <span className={`adm-badge ${template.category || 'default'}`}>
                                                {template.category === 'lottery' ? 'หวย' : template.category === 'news' ? 'ข่าว' : template.category === 'promotion' ? 'โปร' : 'ทั่วไป'}
                                            </span>
                                            <h3>{template.name}</h3>
                                        </div>
                                        <div className="adm-card-toggle" onClick={() => handleToggleStatus(template.id)}>
                                            <div className={`adm-toggle-pill ${template.isActive ? 'on' : ''}`}>
                                                <Power size={12} />
                                            </div>
                                        </div>
                                    </div>

                                    <p className="adm-card-desc">{template.description || 'ไม่มีคำอธิบาย'}</p>

                                    <div className="adm-card-meta">
                                        <div className="adm-meta-item">
                                            <Target size={14} />
                                            <span>{template.targetType}</span>
                                        </div>
                                        <div className="adm-meta-tags">
                                            {ids.slice(0, 2).map((id, i) => <span key={i} className="adm-tag">{id.slice(0, 10)}...</span>)}
                                            {ids.length > 2 && <span className="adm-tag">+{ids.length - 2}</span>}
                                        </div>
                                    </div>

                                    <div className="adm-link-box">
                                        <div className="adm-link-label">
                                            <ExternalLink size={12} /> Public Link
                                        </div>
                                        <div className="adm-link-row">
                                            <code>.../schedule/{template.publicCode}</code>
                                            <div className="adm-link-actions">
                                                <button title="คัดลอกลิงก์" onClick={() => copyPublicLink(template.publicCode)}>
                                                    <Copy size={13} />
                                                </button>
                                                <button title="เปิดหน้าเว็บ" onClick={() => openPublicLink(template.publicCode)}>
                                                    <ExternalLink size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="adm-card-footer">
                                        <button className="adm-btn-edit" onClick={() => handleEdit(template)}>
                                            <Edit3 size={14} /> แก้ไข
                                        </button>
                                        <button className="adm-btn-del" onClick={() => handleDelete(template.id)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
