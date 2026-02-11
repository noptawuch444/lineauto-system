import React, { useState, useEffect } from 'react';
import { ScheduledMessage } from '../types';
import { messageApi } from '../services/api';
import MessageCard from './MessageCard';

interface MessageListProps {
    refreshTrigger: number;
}

type TimeRange = 'all' | '00-04' | '04-08' | '08-12' | '12-16' | '16-20' | '20-24';

const MessageList: React.FC<MessageListProps> = ({ refreshTrigger }) => {
    const [messages, setMessages] = useState<ScheduledMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('all');

    const timeRanges = [
        { id: 'all' as TimeRange, label: 'ทั้งหมด', start: 0, end: 24 },
        { id: '00-04' as TimeRange, label: '00:00 – 03:59', start: 0, end: 4 },
        { id: '04-08' as TimeRange, label: '04:00 – 07:59', start: 4, end: 8 },
        { id: '08-12' as TimeRange, label: '08:00 – 11:59', start: 8, end: 12 },
        { id: '12-16' as TimeRange, label: '12:00 – 15:59', start: 12, end: 16 },
        { id: '16-20' as TimeRange, label: '16:00 – 19:59', start: 16, end: 20 },
        { id: '20-24' as TimeRange, label: '20:00 – 23:59', start: 20, end: 24 },
    ];

    const fetchMessages = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await messageApi.getAll();
            setMessages(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, [refreshTrigger]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchMessages();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const handleEdit = () => {
        // TODO: Implement edit functionality
        alert('ฟีเจอร์แก้ไขจะพัฒนาในเวอร์ชันถัดไป');
    };

    const handleCancel = async (id: string) => {
        if (!confirm('คุณต้องการยกเลิกข้อความนี้หรือไม่?')) {
            return;
        }

        try {
            await messageApi.cancel(id);
            fetchMessages();
        } catch (err: any) {
            alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการยกเลิกข้อความ');
        }
    };

    // Filter messages by time range
    const getFilteredMessages = () => {
        if (selectedTimeRange === 'all') {
            return messages;
        }

        const range = timeRanges.find(r => r.id === selectedTimeRange);
        if (!range) return messages;

        return messages.filter(message => {
            const date = new Date(message.scheduledTime);
            const hour = date.getHours();
            return hour >= range.start && hour < range.end;
        });
    };

    const filteredMessages = getFilteredMessages();

    if (loading && messages.length === 0) {
        return (
            <div className="card">
                <div className="card-title">
                    <span>📋 รายการข้อความที่ตั้งเวลา</span>
                </div>
                <div className="loading">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card">
                <div className="card-title">
                    <span>📋 รายการข้อความที่ตั้งเวลา</span>
                </div>
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--error)'
                }}>
                    ❌ {error}
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Time Filter Section */}
            <div className="time-filter-section">
                <div className="time-filter-header-container">
                    <div className="time-filter-title">
                        <span>🕒</span>
                        <span>เวลา</span>
                    </div>
                </div>
                <div className="time-filter-content">
                    <div className="time-filter-tabs">
                        {timeRanges.map(range => {
                            const count = range.id === 'all'
                                ? messages.length
                                : messages.filter(m => {
                                    const hour = new Date(m.scheduledTime).getHours();
                                    return hour >= range.start && hour < range.end;
                                }).length;

                            return (
                                <button
                                    key={range.id}
                                    className={`time-tab ${selectedTimeRange === range.id ? 'active' : ''}`}
                                    onClick={() => setSelectedTimeRange(range.id)}
                                >
                                    <span className="tab-label">{range.label}</span>
                                    <span className="tab-count">{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="live-preview-header">
                    <div className="live-preview-title">
                        <span>📋</span>
                        <span>รายการส่งข้อความ</span>
                    </div>
                    <div className="message-stats">
                        <span className="stat-badge stat-total">
                            ทั้งหมด: {messages.length}
                        </span>
                        <span className="stat-badge stat-pending">
                            รอส่ง: {messages.filter(m => m.status === 'pending').length}
                        </span>
                        <span className="stat-badge stat-sent">
                            ส่งแล้ว: {messages.filter(m => m.status === 'sent').length}
                        </span>
                    </div>
                </div>

                {messages.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📭</div>
                        <p>
                            {selectedTimeRange === 'all'
                                ? 'ยังไม่มีข้อความที่ตั้งเวลา'
                                : `ไม่มีข้อความในช่วงเวลา ${timeRanges.find(r => r.id === selectedTimeRange)?.label}`
                            }
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {selectedTimeRange === 'all' ? 'สร้างข้อความใหม่เพื่อเริ่มต้น' : 'ลองเลือกช่วงเวลาอื่น'}
                        </p>
                    </div>
                ) : (
                    <div className="live-queue-list">
                        {filteredMessages.map((message) => (
                            <MessageCard
                                key={message.id}
                                message={message}
                                onEdit={handleEdit}
                                onCancel={handleCancel}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default MessageList;
