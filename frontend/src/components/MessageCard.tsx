import React, { useState } from 'react';
import { ScheduledMessage } from '../types';
import { format } from 'date-fns';

const getBaseUrl = () => {
    const api = import.meta.env.VITE_API_URL || '';
    if (api.startsWith('http')) return api.replace(/\/api\/?$/, '');
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
};

const SERVER_URL = getBaseUrl();

const getImgUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${SERVER_URL}${cleanUrl}`;
};

interface MessageCardProps {
    message: ScheduledMessage;
    onEdit: (message: ScheduledMessage) => void;
    onCancel: (id: string) => void;
}

const MessageCard: React.FC<MessageCardProps> = ({ message, onEdit, onCancel }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
        } catch {
            return dateString;
        }
    };

    const handleToggle = () => {
        setIsExpanded(!isExpanded);
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending':
                return { icon: '⏳', text: 'รอส่ง', class: 'pending' };
            case 'sent':
                return { icon: '✅', text: 'ส่งแล้ว', class: 'sent' };
            case 'failed':
                return { icon: '❌', text: 'ล้มเหลว', class: 'failed' };
            case 'cancelled':
                return { icon: '🚫', text: 'ยกเลิก', class: 'cancelled' };
            default:
                return { icon: '❓', text: status, class: '' };
        }
    };

    const statusInfo = getStatusInfo(message.status);
    const hasImages = Array.isArray(message.imageUrls) && message.imageUrls.length > 0;
    const targetIds = Array.isArray(message.targetIds) ? message.targetIds : [];

    return (
        <div className={`message-card-compact status-${message.status} ${isExpanded ? 'expanded' : 'collapsed'}`}>
            {/* Header Section */}
            <div className="message-compact-header" onClick={handleToggle}>
                <div className="header-main-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        <div className={`status-badge-compact ${statusInfo.class}`}>
                            <span>{statusInfo.icon}</span>
                            <span>{statusInfo.text}</span>
                        </div>
                        <div className="time-compact">
                            🕐 {formatDate(message.scheduledTime)}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="meta-compact">
                            <span>
                                {message.targetType === 'user' ? '👤' : message.targetType === 'group' ? '👥' : '🚪'}
                                {' '}{message.targetType}
                            </span>
                            <span>🎯 {targetIds.length}</span>
                            {hasImages && <span>📷 {message.imageUrls!.length}</span>}
                        </div>
                        <button
                            className={`toggle-compact ${isExpanded ? 'expanded' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggle();
                            }}
                        >
                            {isExpanded ? '▲' : '▼'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Message Preview */}
            <div className="message-preview-line" onClick={handleToggle}>
                {message.content}
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="expanded-content">
                    {/* Full Message */}
                    <div className="detail-row">
                        <div className="detail-label">📝 ข้อความเต็ม</div>
                        <div className="detail-value">{message.content}</div>
                    </div>

                    {/* Images */}
                    {hasImages && (
                        <div className="detail-row">
                            <div className="detail-label">🖼️ รูปภาพ ({message.imageUrls!.length} รูป)</div>
                            <div className="images-compact">
                                {message.imageUrls!.map((url, idx) => (
                                    <div
                                        key={idx}
                                        className="img-thumb"
                                        style={{ cursor: 'default' }}
                                    >
                                        <img src={getImgUrl(url)} alt={`รูปที่ ${idx + 1}`} />
                                        <span>{idx + 1}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Targets */}
                    <div className="detail-row">
                        <div className="detail-label">🎯 เป้าหมาย ({targetIds.length} targets)</div>
                        <div className="targets-compact">
                            {targetIds.map((id, idx) => (
                                <span key={idx} className="target-chip">{id}</span>
                            ))}
                        </div>
                    </div>

                    {/* Error */}
                    {message.logs && message.logs.length > 0 && (
                        <div className="detail-row error-row">
                            <div className="detail-label">⚠️ ข้อผิดพลาด</div>
                            <div className="error-text">{message.logs[0].error}</div>
                        </div>
                    )}

                    {/* Actions */}
                    {message.status === 'pending' && (
                        <div className="actions-compact">
                            <button
                                className="btn-compact btn-edit"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(message);
                                }}
                            >
                                ✏️ แก้ไข
                            </button>
                            <button
                                className="btn-compact btn-cancel"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCancel(message.id);
                                }}
                            >
                                🗑️ ยกเลิก
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MessageCard;
