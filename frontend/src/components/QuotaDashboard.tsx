import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    BarChart3, RefreshCw, AlertTriangle, CheckCircle2,
    XCircle, Bot, Loader2, Info, MessageSquare, Zap
} from 'lucide-react';
import './QuotaDashboard.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface BotQuota {
    botId: string;
    botName: string;
    quotaType: 'limited' | 'none';
    quotaLimit: number | null;
    totalUsage: number;
    remaining: number | null;
    percentUsed: number;
}

interface LineBot {
    id: string;
    name: string;
    basicId?: string | null;
    pictureUrl?: string | null;
    isActive: boolean;
}

export default function QuotaDashboard() {
    const [bots, setBots] = useState<LineBot[]>([]);
    const [quotas, setQuotas] = useState<Record<string, BotQuota & { loading?: boolean; error?: string }>>({});
    const [loadingBots, setLoadingBots] = useState(true);

    const fetchBots = async () => {
        try {
            setLoadingBots(true);
            const res = await axios.get(`${API_BASE_URL}/bots`);
            setBots(res.data);
        } catch {
            // ignore
        } finally {
            setLoadingBots(false);
        }
    };

    const fetchQuota = useCallback(async (bot: LineBot) => {
        setQuotas(prev => ({ ...prev, [bot.id]: { ...prev[bot.id], loading: true, error: undefined } as any }));
        try {
            const res = await axios.get(`${API_BASE_URL}/bots/${bot.id}/quota`);
            setQuotas(prev => ({ ...prev, [bot.id]: { ...res.data, loading: false } }));
        } catch (e: any) {
            const errMsg = e.response?.data?.error || e.message || 'เกิดข้อผิดพลาด';
            setQuotas(prev => ({ ...prev, [bot.id]: { botId: bot.id, botName: bot.name, loading: false, error: errMsg } as any }));
        }
    }, []);

    const fetchAllQuotas = useCallback((botList: LineBot[]) => {
        botList.forEach(b => fetchQuota(b));
    }, [fetchQuota]);

    useEffect(() => {
        fetchBots().then(() => {
            // bots are set after fetchBots, use the response directly
        });
    }, []);

    useEffect(() => {
        if (bots.length > 0) {
            fetchAllQuotas(bots);
        }
    }, [bots, fetchAllQuotas]);

    const getBarColor = (pct: number) => {
        if (pct >= 90) return '#ef4444';
        if (pct >= 70) return '#f59e0b';
        return '#22c55e';
    };

    const getStatusIcon = (pct: number) => {
        if (pct >= 90) return <XCircle size={16} color="#ef4444" />;
        if (pct >= 70) return <AlertTriangle size={16} color="#f59e0b" />;
        return <CheckCircle2 size={16} color="#22c55e" />;
    };

    return (
        <div className="quota-dashboard">
            <div className="quota-header">
                <div className="quota-title-row">
                    <BarChart3 size={22} className="quota-icon" />
                    <div>
                        <h2 className="quota-title">โควตาข้อความ LINE</h2>
                        <p className="quota-subtitle">ตรวจสอบโควตาข้อความที่ใช้ไปในเดือนนี้</p>
                    </div>
                </div>
                <button
                    className="quota-refresh-btn"
                    onClick={() => fetchAllQuotas(bots)}
                    title="รีเฟรชข้อมูล"
                >
                    <RefreshCw size={16} />
                    รีเฟรช
                </button>
            </div>

            <div className="quota-info-bar">
                <Info size={14} />
                <span>โควตานับรวมข้อความ + รูปภาพแต่ละรูป ข้อความ 1 รายการที่มีรูป 3 รูป = 4 messages</span>
            </div>

            {loadingBots ? (
                <div className="quota-loading">
                    <Loader2 size={28} className="spin" />
                    <p>กำลังโหลดข้อมูลบอท...</p>
                </div>
            ) : bots.length === 0 ? (
                <div className="quota-empty">
                    <Bot size={48} opacity={0.3} />
                    <p>ยังไม่มีบอทที่ลงทะเบียน</p>
                    <span>ไปที่แท็บ "จัดการบอท" เพื่อเพิ่มบอทก่อนครับ</span>
                </div>
            ) : (
                <div className="quota-grid">
                    {bots.map(bot => {
                        const q = quotas[bot.id];
                        return (
                            <div key={bot.id} className="quota-card">
                                {/* Bot Header */}
                                <div className="quota-card-header">
                                    <div className="quota-bot-info">
                                        {bot.pictureUrl ? (
                                            <img src={bot.pictureUrl} alt={bot.name} className="quota-bot-avatar" />
                                        ) : (
                                            <div className="quota-bot-avatar-placeholder">
                                                <Bot size={18} />
                                            </div>
                                        )}
                                        <div>
                                            <div className="quota-bot-name">{bot.name}</div>
                                            {bot.basicId && <div className="quota-bot-id">@{bot.basicId}</div>}
                                        </div>
                                    </div>
                                    <button
                                        className="quota-mini-refresh"
                                        onClick={() => fetchQuota(bot)}
                                        title="รีเฟรช"
                                    >
                                        <RefreshCw size={13} />
                                    </button>
                                </div>

                                {/* Content */}
                                {!q || q.loading ? (
                                    <div className="quota-card-loading">
                                        <Loader2 size={20} className="spin" />
                                        <span>กำลังดึงข้อมูล...</span>
                                    </div>
                                ) : q.error ? (
                                    <div className="quota-card-error">
                                        <XCircle size={18} color="#ef4444" />
                                        <span>{q.error}</span>
                                    </div>
                                ) : q.quotaType === 'none' ? (
                                    <div className="quota-card-unlimited">
                                        <Zap size={20} color="#a78bfa" />
                                        <span>ไม่จำกัดโควตา</span>
                                        <div className="quota-stat-row">
                                            <MessageSquare size={14} />
                                            <span>ส่งไปแล้วเดือนนี้: <b>{q.totalUsage.toLocaleString()}</b> ข้อความ</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="quota-card-body">
                                        {/* Progress Bar */}
                                        <div className="quota-progress-wrap">
                                            <div className="quota-progress-label">
                                                <span className="quota-used-label">
                                                    {getStatusIcon(q.percentUsed)}
                                                    <b>{q.totalUsage.toLocaleString()}</b> / {q.quotaLimit?.toLocaleString()} ข้อความ
                                                </span>
                                                <span
                                                    className="quota-pct"
                                                    style={{ color: getBarColor(q.percentUsed) }}
                                                >
                                                    {q.percentUsed}%
                                                </span>
                                            </div>
                                            <div className="quota-bar-bg">
                                                <div
                                                    className="quota-bar-fill"
                                                    style={{
                                                        width: `${Math.min(q.percentUsed, 100)}%`,
                                                        background: getBarColor(q.percentUsed)
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="quota-stats">
                                            <div className="quota-stat-box">
                                                <span className="quota-stat-label">ส่งไปแล้ว</span>
                                                <span className="quota-stat-val used">{q.totalUsage.toLocaleString()}</span>
                                            </div>
                                            <div className="quota-stat-box">
                                                <span className="quota-stat-label">เหลือ</span>
                                                <span
                                                    className="quota-stat-val"
                                                    style={{ color: getBarColor(q.percentUsed) }}
                                                >
                                                    {(q.remaining ?? 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="quota-stat-box">
                                                <span className="quota-stat-label">โควตา/เดือน</span>
                                                <span className="quota-stat-val total">{q.quotaLimit?.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* Warnings */}
                                        {q.percentUsed >= 90 && (
                                            <div className="quota-warning danger">
                                                <AlertTriangle size={14} />
                                                <span>โควตาใกล้หมดแล้ว! อัปเกรดแพลนได้ที่ manager.line.biz</span>
                                            </div>
                                        )}
                                        {q.percentUsed >= 70 && q.percentUsed < 90 && (
                                            <div className="quota-warning caution">
                                                <AlertTriangle size={14} />
                                                <span>ใช้ไปแล้วมากกว่า 70% ของโควตาเดือนนี้</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="quota-footer">
                <span>โควตาจะรีเซ็ตทุกต้นเดือน • ข้อมูลอ้างอิงจาก LINE Messaging API</span>
                <a href="https://manager.line.biz" target="_blank" rel="noopener noreferrer">
                    อัปเกรดแผน →
                </a>
            </div>
        </div>
    );
}
