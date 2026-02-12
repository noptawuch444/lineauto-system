import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Bot, Plus, Trash2, Edit3, Save, X,
    CheckCircle2, XCircle, Loader2, Key, Info, ShieldCheck, RefreshCw
} from 'lucide-react';
import './BotManagement.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface LineBot {
    id: string;
    name: string;
    basicId?: string | null;
    pictureUrl?: string | null;
    channelAccessToken: string;
    channelSecret?: string | null;
    isActive: boolean;
    createdAt: string;
}

export default function BotManagement() {
    const [bots, setBots] = useState<LineBot[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [token, setToken] = useState('');
    const [secret, setSecret] = useState('');
    const [basicId, setBasicId] = useState('');
    const [pictureUrl, setPictureUrl] = useState('');

    useEffect(() => {
        fetchBots();
    }, []);

    const fetchBots = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE_URL}/bots`);
            setBots(res.data);
        } catch (error) {
            console.error('Failed to fetch bots', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyToken = async () => {
        if (!token) return alert('กรุณาใส่ Channel Access Token ก่อน');

        try {
            setVerifying(true);
            const res = await axios.post(`${API_BASE_URL}/bots/verify`, { channelAccessToken: token });
            const data = res.data;

            setName(data.name);
            setBasicId(data.basicId);
            setPictureUrl(data.pictureUrl);

            alert('ดึงข้อมูลบอทสำเร็จ!');
        } catch (error: any) {
            alert(error.response?.data?.error || 'ตรวจสอบ Token ไม่สำเร็จ');
        } finally {
            setVerifying(false);
        }
    };

    const handleSave = async () => {
        if (!name || !token) return;

        try {
            const payload = {
                name,
                channelAccessToken: token,
                channelSecret: secret,
                basicId,
                pictureUrl
            };

            if (editingId) {
                await axios.put(`${API_BASE_URL}/bots/${editingId}`, payload);
            } else {
                await axios.post(`${API_BASE_URL}/bots`, payload);
            }
            resetForm();
            fetchBots();
        } catch (error) {
            console.error('Failed to save bot', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('ยืนยันการลบบอทตัวนี้? (บอทที่ผูกกับเทมเพลตอยู่จะลบไม่ได้)')) return;
        try {
            await axios.delete(`${API_BASE_URL}/bots/${id}`);
            fetchBots();
        } catch (error: any) {
            alert(error.response?.data?.error || 'ลบไม่สำเร็จ');
        }
    };

    const startEdit = (bot: LineBot) => {
        setEditingId(bot.id);
        setName(bot.name);
        setToken(bot.channelAccessToken);
        setSecret(bot.channelSecret || '');
        setBasicId(bot.basicId || '');
        setPictureUrl(bot.pictureUrl || '');
        setIsAdding(true);
    };

    const resetForm = () => {
        setIsAdding(false);
        setEditingId(null);
        setName('');
        setToken('');
        setSecret('');
        setBasicId('');
        setPictureUrl('');
    };

    if (loading && bots.length === 0) {
        return (
            <div className="bm-loading">
                <Loader2 className="bm-spin" />
                <span>กำลังโหลดข้อมูลบอท...</span>
            </div>
        );
    }

    return (
        <div className="bm-container">
            <div className="bm-header">
                <div className="bm-title">
                    <Bot className="bm-icon-gold" />
                    <h1>จัดการบอทหลายตัว (Multi-Bot)</h1>
                </div>
                {!isAdding && (
                    <button className="bm-add-btn" onClick={() => setIsAdding(true)}>
                        <Plus size={18} /> เพิ่มบอทตัวใหม่
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bm-form-card">
                    <div className="bm-card-head">
                        <h3>{editingId ? 'แก้ไขข้อมูลบอท' : 'เพิ่มบอทคนใหม่เข้าระบบ'}</h3>
                        <button className="bm-close-btn" onClick={resetForm}><X size={20} /></button>
                    </div>
                    <div className="bm-form-grid">
                        <div className="bm-input-group">
                            <label>Channel Access Token <Key size={14} /></label>
                            <div className="bm-input-action-row">
                                <textarea
                                    value={token}
                                    onChange={e => setToken(e.target.value)}
                                    placeholder="วาง Token จาก LINE Developers ที่นี่..."
                                    rows={3}
                                />
                                <button
                                    className="bm-verify-btn"
                                    onClick={handleVerifyToken}
                                    disabled={verifying}
                                >
                                    {verifying ? <Loader2 className="bm-spin" size={16} /> : <RefreshCw size={16} />}
                                    ดึงข้อมูลอัตโนมัติ
                                </button>
                            </div>
                        </div>

                        <div className="bm-form-row-2">
                            <div className="bm-input-group">
                                <label>ชื่อบอท (จะขึ้นเองเมื่อกดดึงข้อมูล)</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="ชื่อที่แสดงใน LINE"
                                />
                            </div>
                            <div className="bm-input-group">
                                <label>LINE ID (Basic ID)</label>
                                <input
                                    type="text"
                                    value={basicId}
                                    readOnly
                                    placeholder="@id..."
                                    className="bm-input-readonly"
                                />
                            </div>
                        </div>

                        <div className="bm-input-group">
                            <label>Channel Secret (ใช้สำหรับ Webhook - ไม่บังคับ)</label>
                            <input
                                type="text"
                                value={secret}
                                onChange={e => setSecret(e.target.value)}
                                placeholder="Channel Secret จากหน้า Basic Settings"
                            />
                        </div>

                        {pictureUrl && (
                            <div className="bm-profile-preview">
                                <img src={pictureUrl} alt="Bot Profile" />
                                <span>ภาพโปรไฟล์บอทที่พบ</span>
                            </div>
                        )}
                    </div>
                    <div className="bm-form-actions">
                        <button className="bm-cancel-btn" onClick={resetForm}>ยกเลิก</button>
                        <button className="bm-save-btn" onClick={handleSave}>
                            <Save size={18} /> {editingId ? 'อัปเดตข้อมูล' : 'บันทึกบอทใหม่'}
                        </button>
                    </div>
                </div>
            )}

            <div className="bm-grid">
                {bots.map(bot => (
                    <div key={bot.id} className="bm-bot-card">
                        <div className="bm-bot-status">
                            {bot.isActive ? <CheckCircle2 className="bm-st-active" size={16} /> : <XCircle className="bm-st-inactive" size={16} />}
                            {bot.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </div>
                        <div className="bm-bot-info">
                            <div className="bm-bot-avatar-box">
                                {bot.pictureUrl ? (
                                    <img src={bot.pictureUrl} alt={bot.name} />
                                ) : (
                                    <Bot className="bm-bot-avatar-icon" />
                                )}
                            </div>
                            <div className="bm-bot-details">
                                <h3>{bot.name}</h3>
                                <p className="bm-bot-id">{bot.basicId || 'ไม่มี ID'}</p>
                                <p className="bm-bot-date">สร้างเมื่อ: {new Date(bot.createdAt).toLocaleDateString('th-TH')}</p>
                            </div>
                        </div>
                        <div className="bm-token-preview">
                            <ShieldCheck size={14} />
                            <span>Token: {bot.channelAccessToken.substring(0, 15)}...{bot.channelAccessToken.slice(-10)}</span>
                        </div>
                        <div className="bm-card-actions">
                            <button className="bm-edit-btn" onClick={() => startEdit(bot)}>
                                <Edit3 size={16} /> แก้ไข
                            </button>
                            <button className="bm-del-btn" onClick={() => handleDelete(bot.id)}>
                                <Trash2 size={16} /> ลบ
                            </button>
                        </div>
                    </div>
                ))}

                {bots.length === 0 && !isAdding && (
                    <div className="bm-empty">
                        <Info size={48} />
                        <p>ยังไม่มีบอทในระบบ กดปุ่ม "เพิ่มบอทตัวใหม่" ด้านบนเพื่อเริ่มใช้งาน</p>
                    </div>
                )}
            </div>
        </div>
    );
}
