import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { messageApi, templateApi } from '../services/api';
import { CreateMessageRequest, MessageTemplate } from '../types';

interface MessageSchedulerProps {
    onMessageCreated: () => void;
}

const MessageScheduler: React.FC<MessageSchedulerProps> = ({ onMessageCreated }) => {
    const [content, setContent] = useState('');
    const [scheduledTime, setScheduledTime] = useState<Date>(new Date());
    const [targetType, setTargetType] = useState<'user' | 'group' | 'room'>('user');
    const [targetIds, setTargetIds] = useState('');
    const [channelAccessToken, setChannelAccessToken] = useState('');

    // Template State
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [showTemplates, setShowTemplates] = useState(false);

    // Multi-image state
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper to log errors safely
    const logError = (msg: string) => {
        console.error(msg);
        alert(msg);
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const data = await templateApi.getAll();
            setTemplates(data);
        } catch (error) {
            console.error('Failed to load templates', error);
        }
    };

    const handleLoadTemplate = (template: MessageTemplate) => {
        setTargetType(template.targetType);
        setTargetIds(template.targetIds.join(', '));
        setChannelAccessToken(template.channelAccessToken || '');
        setShowTemplates(false);
    };

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newFiles = Array.from(files);

            // Limit total images to 4 (leaving 1 slot for text, total 5 messages max)
            const totalImages = imageFiles.length + newFiles.length;
            if (totalImages > 4) {
                logError('เลือกรูปภาพได้สูงสุด 4 รูป (รวมกับข้อความ 1 ข้อความ = 5 ข้อความสูงสุดของ LINE)');
                return;
            }

            setImageFiles(prev => [...prev, ...newFiles]);

            // Create previews
            newFiles.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagePreviews(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleRemoveImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // setError(null);

        // Validation
        if (!content.trim()) {
            logError('กรุณากรอกข้อความ');
            return;
        }

        if (!targetIds.trim()) {
            logError('กรุณากรอก Target ID');
            return;
        }

        if (scheduledTime <= new Date()) {
            logError('กรุณาเลือกเวลาในอนาคต');
            return;
        }

        setLoading(true);

        try {
            // Upload all images sequentially
            const uploadedUrls: string[] = [];

            if (imageFiles.length > 0) {
                for (const file of imageFiles) {
                    const uploadResult = await messageApi.uploadImage(file);
                    uploadedUrls.push(uploadResult.url);
                }
            }

            // Parse target IDs (comma-separated)
            const targetIdArray = targetIds.split(',').map(id => id.trim()).filter(id => id);

            // Create message
            const messageData: CreateMessageRequest = {
                content: content.trim(),
                scheduledTime,
                targetType,
                targetIds: targetIdArray,
                imageUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
                imageUrl: uploadedUrls.length > 0 ? uploadedUrls[0] : undefined, // Legacy support
                channelAccessToken: channelAccessToken.trim() || undefined
            };

            await messageApi.create(messageData);

            // Reset form
            setContent('');
            setScheduledTime(new Date());
            setTargetIds('');
            setChannelAccessToken('');
            setImageFiles([]);
            setImagePreviews([]);
            if (fileInputRef.current) fileInputRef.current.value = '';

            // Notify parent
            onMessageCreated();
        } catch (err: any) {
            logError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการสร้างข้อความ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card editor-card">
            {/* Blue Header Bar (Replaces Tabs) */}
            <div className="editor-header-bar">
                <div className="header-left">
                    <span className="header-icon">🕒</span>
                    <span>ตั้งเวลาส่งข้อความ (Schedule Message)</span>
                </div>
                <div className="header-right">
                    <div className="template-dropdown-container">
                        <button
                            type="button"
                            className="btn-load-template"
                            onClick={() => setShowTemplates(!showTemplates)}
                        >
                            📑 โหลดเทมเพลต ▼
                        </button>
                        {showTemplates && (
                            <div className="template-dropdown-menu">
                                {templates.length === 0 ? (
                                    <div className="dropdown-item empty">ไม่มีเทมเพลต</div>
                                ) : (
                                    templates.map(t => (
                                        <div
                                            key={t.id}
                                            className="dropdown-item"
                                            onClick={() => handleLoadTemplate(t)}
                                        >
                                            <strong>{t.name}</strong>
                                            <small>{t.targetType.toUpperCase()} ({t.targetIds.length})</small>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="editor-body">
                <form onSubmit={handleSubmit} className="editor-form">

                    {/* Section 1: Content */}
                    <div className="form-section">
                        <div className="section-header">
                            <span className="step-badge">1</span>
                            <span>ข้อมูลข้อความ</span>
                        </div>
                        <div className="input-group-card">
                            <textarea
                                className="form-textarea modern"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="พิมพ์ข้อความที่ต้องการส่ง..."
                                rows={4}
                            />
                        </div>
                    </div>

                    {/* Section 2: Settings Grid */}
                    <div className="form-section">
                        <div className="section-header">
                            <span className="step-badge">2</span>
                            <span>การตั้งค่าการส่ง</span>
                        </div>
                        <div className="settings-grid">
                            <div className="setting-item">
                                <label>⏰ เวลาส่ง</label>
                                <DatePicker
                                    selected={scheduledTime}
                                    onChange={(date) => date && setScheduledTime(date)}
                                    showTimeSelect
                                    timeFormat="HH:mm"
                                    timeIntervals={15}
                                    dateFormat="dd/MM/yyyy HH:mm"
                                    className="modern-input"
                                />
                            </div>
                            <div className="setting-item">
                                <label>👥 ประเภท</label>
                                <select
                                    className="modern-select"
                                    value={targetType}
                                    onChange={(e) => setTargetType(e.target.value as 'user' | 'group' | 'room')}
                                >
                                    <option value="user">👤 User</option>
                                    <option value="group">👥 Group</option>
                                    <option value="room">🚪 Room</option>
                                </select>
                            </div>
                            <div className="setting-item full-width">
                                <label>🎯 Target ID {channelAccessToken && <span className="badge-bot">🤖 ใช้บอทแยก</span>}</label>
                                <input
                                    type="text"
                                    className="modern-input"
                                    value={targetIds}
                                    onChange={(e) => setTargetIds(e.target.value)}
                                    placeholder="ระบุ ID..."
                                />
                                {channelAccessToken && (
                                    <div className="bot-token-indicator">
                                        <small>Using Custom Token: {channelAccessToken.substring(0, 10)}...</small>
                                        <button type="button" onClick={() => setChannelAccessToken('')} className="btn-clear-token">×</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Images */}
                    <div className="form-section">
                        <div className="section-header">
                            <span className="step-badge">3</span>
                            <span>รูปภาพ ({imageFiles.length}/4)</span>
                        </div>
                        <div className="file-upload-modern">
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden-input"
                                accept="image/*"
                                multiple
                                onChange={handleImageChange}
                                id="image-upload"
                            />
                            <label htmlFor="image-upload" className="modern-upload-btn">
                                <span>📷 เลือกรูปภาพ</span>
                            </label>
                        </div>

                        {imagePreviews.length > 0 && (
                            <div className="preview-grid">
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className="mini-preview">
                                        <img src={preview} alt="preview" />
                                        <button onClick={() => handleRemoveImage(index)} className="btn-remove">×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </form>
            </div>

            {/* Footer Action */}
            <div className="editor-footer">
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="btn-submit-large"
                >
                    {loading ? '⏳ กำลังประมวลผล...' : '🚀 สร้างรายการส่งข้อความ (Create Task)'}
                </button>
            </div>
        </div>
    );
};

export default MessageScheduler;
