import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import axios from 'axios';
import {
    FileText, PencilLine, Image as ImageIcon, Clock, Save, Trash2,
    ClipboardList, Inbox, Calendar, Hourglass, Send,
    CheckCircle2, XCircle, Ban, AlertTriangle, Loader2, Headset, Eye, X,
    Wifi, BatteryFull, Signal
} from 'lucide-react';
import './PublicScheduler.css';

const getBaseUrl = () => {
    // Priority 1: Explicitly set API URL from env
    const api = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
    if (api.startsWith('http')) return api.replace(/\/api\/?$/, '').replace(/\/$/, '');

    // Priority 2: Current origin (if backend and frontend are on same domain)
    if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        if (origin.includes(':5173')) return origin.replace(':5173', ':3000');
        return origin;
    }
    return '';
};

const API = import.meta.env.VITE_API_URL || (getBaseUrl() + '/api');
const SERVER_URL = getBaseUrl();
const CONTACT_LINK = 'https://line.me/R/ti/p/@your_id';

/** Resolve relative image URLs to absolute using SERVER_URL */
const getImgUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${SERVER_URL}${cleanUrl}`;
};

interface Template {
    id: string;
    name: string;
    description?: string;
    startDate?: string | null;
    endDate?: string | null;
}
interface Message { id: string; content: string; imageUrl?: string | null; imageUrls?: string[]; scheduledTime: string; status: string; createdAt: string; logs?: any[]; }

export default function PublicScheduler() {
    const { publicCode } = useParams<{ publicCode: string }>();
    const [template, setTemplate] = useState<Template | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [text, setText] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    const [toast, setToast] = useState<{ msg: string, type: 'ok' | 'err' | 'warn' } | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [imageFirst, setImageFirst] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [collapsedDays, setCollapsedDays] = useState<string[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [confirmData, setConfirmData] = useState<{ id: string, title: string, text: string } | null>(null);
    const [timeLeft, setTimeLeft] = useState<string | null>(null);

    const fileRef = useRef<HTMLInputElement>(null);
    const timeRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        loadTemplate(true);
        loadMessages();
        const iv = setInterval(() => {
            loadTemplate(false);
            loadMessages();
        }, 8000); // 8 seconds for regular status updates
        return () => clearInterval(iv);
    }, [publicCode]);

    // Fast timer for realtime feel (1 second)
    useEffect(() => {
        if (!template) return;
        const timerIv = setInterval(() => {
            const now = new Date();
            if (template.endDate) {
                const end = new Date(template.endDate);
                const diff = end.getTime() - now.getTime();
                if (diff <= 0) {
                    setError('เว็ปไซต์นี้หมดอายุการใช้งานแล้ว\n(สิ้นสุดเมื่อ: ' + end.toLocaleString('th-TH') + ')');
                    clearInterval(timerIv);
                } else {
                    // Update countdown if needed
                    const hours = Math.floor(diff / 3600000);
                    const minutes = Math.floor((diff % 3600000) / 60000);
                    const seconds = Math.floor((diff % 60000) / 1000);
                    setTimeLeft(`${hours > 0 ? hours + 'ชม. ' : ''}${minutes}น. ${seconds}วิ`);
                }
            }
        }, 1000);
        return () => clearInterval(timerIv);
    }, [template]);

    // Snowfall Effect
    useEffect(() => {
        if (loading || error) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        const flakeCount = 50; // Reduced from 100 to 50 (50% less)
        const flakes: { x: number; y: number; r: number; d: number; s: number; color: string }[] = [];
        const goldShades = ['rgba(243, 207, 138, 0.8)', 'rgba(201, 168, 76, 0.9)', 'rgba(255, 235, 180, 0.7)', 'rgba(180, 140, 50, 0.9)'];
        for (let i = 0; i < flakeCount; i++) {
            flakes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * 2.5 + 1,
                d: Math.random() * flakeCount,
                s: (Math.random() * 1.5 + 1) * 0.7, // Slowed down by 30%
                color: goldShades[Math.floor(Math.random() * goldShades.length)]
            });
        }
        let animId: number;
        let angle = 0;
        const moveFlakes = () => {
            angle += 0.01;
            for (let i = 0; i < flakeCount; i++) {
                const f = flakes[i];
                f.y += f.s;
                f.x += Math.sin(angle + f.d) * 0.5;
                if (f.y > height) { flakes[i] = { x: Math.random() * width, y: -10, r: f.r, d: f.d, s: f.s, color: f.color }; }
                if (f.x > width + 5) flakes[i].x = -5;
                if (f.x < -5) flakes[i].x = width + 5;
            }
        };
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
            animId = requestAnimationFrame(drawFlakes);
        };
        drawFlakes();
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

    const loadTemplate = async (init = false) => {
        try {
            if (init) setLoading(true);
            const r = await axios.get(`${API}/public-template/template/${publicCode}`, { timeout: 10000 });
            setTemplate(r.data);
            if (error) setError('');
        }
        catch (e: any) {
            console.error('TplErr:', e);
            setError(e.response?.data?.error || 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณารอสักครู่');
        }
        finally { if (init) setLoading(false); }
    };

    const loadMessages = async () => {
        try {
            const r = await axios.get(`${API}/public-template/template/${publicCode}/messages`, { timeout: 8000 });
            setMessages(r.data);
        } catch (e) { console.warn('MsgErr:', e); }
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmData({
            id,
            title: 'ยกเลิกรายการ?',
            text: 'คุณต้องการยกเลิกการส่งข้อความรายการนี้ใช่หรือไม่? เมื่อยกเลิกแล้วจะไม่สามารถกู้คืนได้'
        });
    };

    const handleConfirmDelete = async () => {
        if (!confirmData) return;
        const { id } = confirmData;
        try {
            await axios.delete(`${API}/public-template/schedule/${publicCode}/${id}`);
            showToast('ยกเลิกรายการเรียบร้อย', 'ok');
            setConfirmData(null);
            loadMessages();
        } catch (e: any) {
            showToast(e.response?.data?.error || 'ยกเลิกไม่สำเร็จ', 'err');
            setConfirmData(null);
        }
    };

    const [processing, setProcessing] = useState(false);

    const compressImage = (file: File): Promise<File> => {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.warn('Compression timeout for:', file.name);
                resolve(file);
            }, 5000);

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target?.result as string;
                img.onerror = () => {
                    clearTimeout(timeout);
                    console.error('Image load error:', file.name);
                    resolve(file);
                };
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 1200;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        clearTimeout(timeout);
                        return resolve(file);
                    }
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        clearTimeout(timeout);
                        if (blob) {
                            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            resolve(file);
                        }
                    }, 'image/jpeg', 0.8);
                };
            };
            reader.onerror = () => {
                clearTimeout(timeout);
                resolve(file);
            };
        });
    };

    const addFiles = async (incoming: File[]) => {
        const slots = 3 - files.length; if (slots <= 0) return;
        const valid = incoming.slice(0, slots).filter(f => f.type.startsWith('image/')); if (!valid.length) return;
        setProcessing(true);
        try {
            const compressed = await Promise.all(valid.map(f => compressImage(f)));
            setFiles(p => [...p, ...compressed]);
            setPreviews(p => [...p, ...compressed.map(f => URL.createObjectURL(f))]);
        } catch (e) {
            console.error(e);
            setFiles(p => [...p, ...valid]);
            setPreviews(p => [...p, ...valid.map(f => URL.createObjectURL(f))]);
        } finally {
            setProcessing(false);
        }
    };

    const removeFile = (i: number) => {
        URL.revokeObjectURL(previews[i]);
        setFiles(p => p.filter((_, x) => x !== i));
        setPreviews(p => p.filter((_, x) => x !== i));
    };


    const clearForm = () => {
        setText(''); setScheduledTime('');
        previews.forEach(u => URL.revokeObjectURL(u));
        setFiles([]); setPreviews([]);
        setImageFirst(false);
    };

    const showToast = (msg: string, type: 'ok' | 'err' | 'warn' = 'warn') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (processing) return showToast('กรุณารอรูปภาพประมวลผลเสร็จสิ้น', 'warn');
        if (!text.trim()) return showToast('กรุณาใส่ข้อความ', 'warn');
        if (!scheduledTime) return showToast('กรุณาเลือกเวลาส่ง', 'warn');
        try {
            setSending(true);
            const urls: string[] = [];
            console.log('📤 Starting upload for', files.length, 'files...');

            for (const file of files) {
                const fd = new FormData();
                fd.append('image', file);
                const r = await axios.post(`${API}/public-template/upload`, fd, {
                    timeout: 15000,
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (r.data.url) {
                    console.log('✅ Uploaded:', r.data.url);
                    urls.push(r.data.url);
                }
            }

            console.log('📅 Creating schedule task...');
            await axios.post(`${API}/public-template/schedule/${publicCode}`, {
                content: text,
                imageUrl: urls[0] || null,
                imageUrls: urls,
                scheduledTime: new Date(scheduledTime).toISOString(),
                imageFirst: imageFirst
            }, { timeout: 15000 });

            console.log('🚀 Schedule created successfully!');
            clearForm();
            loadMessages();
            showToast('ตั้งเวลาส่งข้อความเรียบร้อยแล้ว!', 'ok');
        } catch (e: any) {
            console.error('❌ Submit Error:', e);
            showToast(e.response?.data?.error || e.message || 'เกิดข้อผิดพลาด', 'err');
        } finally {
            setSending(false);
        }
    };

    const minDT = () => {
        const d = new Date(); d.setMinutes(d.getMinutes() + 1);
        const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0'), hh = String(d.getHours()).padStart(2, '0'), min = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${dd}T${hh}:${min}`;
    };

    const showTimePicker = () => {
        if (timeRef.current) {
            if ('showPicker' in HTMLInputElement.prototype) { timeRef.current.showPicker(); }
            else { timeRef.current.click(); }
        }
    };

    const statusMap: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
        pending: { icon: <Hourglass size={14} />, label: 'รอส่ง', cls: 'st-pending' },
        sending: { icon: <Send size={14} />, label: 'กำลังส่ง', cls: 'st-sending' },
        sent: { icon: <CheckCircle2 size={14} />, label: 'ส่งแล้ว', cls: 'st-sent' },
        failed: { icon: <XCircle size={14} />, label: 'ล้มเหลว', cls: 'st-failed' },
        cancelled: { icon: <Ban size={14} />, label: 'ยกเลิก', cls: 'st-cancelled' },
    };

    const fmtTime = (s: string) => { try { return format(new Date(s), 'dd/MM/yyyy HH:mm'); } catch { return s; } };
    const fmtSize = (b: number) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

    const groups = useMemo(() => {
        const gm: Record<string, Message[]> = {};
        messages.forEach(m => {
            const d = new Date(m.scheduledTime), now = new Date(), tmr = new Date(now);
            tmr.setDate(tmr.getDate() + 1);
            let label = format(d, 'd MMM yyyy');
            if (d.toDateString() === now.toDateString()) label = `วันนี้ (${format(d, 'd MMM')})`;
            else if (d.toDateString() === tmr.toDateString()) label = `พรุ่งนี้ (${format(d, 'd MMM')})`;
            (gm[label] ??= []).push(m);
        });
        return Object.entries(gm) as [string, Message[]][];
    }, [messages]);

    const getImages = (m: Message): string[] => m.imageUrls?.length ? m.imageUrls : m.imageUrl ? [m.imageUrl] : [];

    const toggleDay = (label: string) => {
        setCollapsedDays(prev => prev.includes(label) ? prev.filter(d => d !== label) : [...prev, label]);
    };

    // Live Preview Component
    const PreviewBox = () => (
        <div className="line-chat">
            <div className="line-msg-row">
                <div className="line-avatar">
                    <img src="/logo.jpg" alt="" />
                </div>
                <div className="line-content">
                    <div className="line-bot-name">{template?.name || 'AutoBot'}</div>
                    <div className="line-bubbles">
                        {imageFirst ? (
                            <>
                                {previews.map((url, i) => (
                                    <div key={`img-${i}`} className="line-bubble-img"><img src={getImgUrl(url)} alt="" /></div>
                                ))}
                                {text && <div className="line-bubble-text">{text}</div>}
                            </>
                        ) : (
                            <>
                                {text && <div className="line-bubble-text">{text}</div>}
                                {previews.map((url, i) => (
                                    <div key={`img-${i}`} className="line-bubble-img"><img src={getImgUrl(url)} alt="" /></div>
                                ))}
                            </>
                        )}
                        {!text && !previews.length && <div className="line-bubble-empty">กำลังพิมพ์...</div>}
                    </div>
                </div>
            </div>
        </div>
    );

    if (loading) return <div className="g"><div className="g-center"><Loader2 className="g-spin-icon" /></div></div>;
    if (error) {
        const isInactive = error === 'Template is not active';
        return (
            <div className="g">
                <div className="g-center">
                    <div className="g-error-icon"><AlertTriangle size={48} /></div>
                    <h2>{isInactive ? 'เว็ปไซต์นี้ถูกปิดใช้งาน' : 'ไม่พบเว็ปไซต์นี้'}</h2>
                    <p style={{ color: '#a89060', maxWidth: '400px', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                        {isInactive ? `ขออภัย เว็ปไซต์นี้ไม่สามารถใช้งานได้ในขณะนี้ กรุณาติดต่อผู้ดูแลระบบ` : error}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="g">
            <div className="g-bg-anim"><canvas ref={canvasRef} className="g-canvas-bg" /></div>
            {toast && (
                <div className={`g-toast ${toast.type}`}>
                    {toast.type === 'ok' && <CheckCircle2 size={18} />}
                    {toast.type === 'err' && <XCircle size={18} />}
                    {toast.type === 'warn' && <AlertTriangle size={18} />}
                    <span>{toast.msg}</span>
                </div>
            )}
            <header className="g-nav">
                <div className="g-nav-l">
                    <div className="g-logo-wrap"><img src="/logo.jpg" alt="GoldSync" /></div>
                    <div>
                        <div className="g-brand">GoldSync AutoBot <span>AUTOBOT</span></div>
                        <div className="g-tpl"><FileText size={14} className="g-icon-inline" /> เทมเพลต: <b>{template?.name || '—'}</b></div>
                    </div>
                </div>
                <div className="g-nav-r">
                    <div className="g-status">
                        <small>{timeLeft ? `จองได้อีก: ${timeLeft}` : 'สถานะระบบ'}</small>
                        <span className={timeLeft ? 'live' : ''}>
                            <div className="g-dot" />
                            {timeLeft ? 'กำลังเปิดรับจอง' : 'พร้อมใช้งาน'}
                        </span>
                    </div>
                    <button className="g-dl-btn" onClick={() => window.open(CONTACT_LINK, '_blank')}><Headset size={16} className="g-icon-inline" /> ติดต่อแอดมิน</button>
                </div>
            </header>

            <main className="g-body">
                <section className="g-panel">
                    <div className="g-panel-head">
                        <div className="g-panel-title"><PencilLine size={18} /><span>สร้างรายการใหม่</span></div>
                        <button className="g-btn-ref" onClick={() => { loadTemplate(true); loadMessages(); }}>รีเฟรช</button>
                    </div>

                    <div className="g-scroll-box">
                        <form onSubmit={submit} className="g-form">
                            <div className="g-fg g-fg-grow">
                                <label>ข้อความ <span className="g-counter">({text.length} ตัวอักษร)</span></label>
                                <textarea value={text} onChange={e => setText(e.target.value)} placeholder="พิมพ์ข้อความที่ต้องการส่ง..." className="g-ta" />
                            </div>
                            <div className="g-fg">
                                <label>รูปภาพ <span className="g-counter">({files.length}/3)</span></label>
                                <div className="g-img-area">
                                    <div className="g-gallery">
                                        {previews.map((url, i) => (
                                            <div key={i} className="g-gallery-item">
                                                <img src={url} alt="" />
                                                <div className="g-gallery-overlay">
                                                    <span className="g-gallery-name">{files[i]?.name?.slice(0, 20) || `รูป ${i + 1}`}</span>
                                                    <span className="g-gallery-size">{files[i] ? fmtSize(files[i].size) : ''}</span>
                                                </div>
                                                <button type="button" className="g-gallery-del" onClick={() => removeFile(i)}><XCircle size={14} /></button>
                                                <div className="g-gallery-num">{i + 1}</div>
                                            </div>
                                        ))}
                                        {files.length > 0 && files.length < 3 && (
                                            <div
                                                className={`g-dropzone mini ${dragOver ? 'over' : ''}`}
                                                onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)); }}
                                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                                onDragLeave={() => setDragOver(false)}
                                                onClick={() => fileRef.current?.click()}
                                            >
                                                <div className="g-drop-content">
                                                    <div className="g-drop-icon"><ImageIcon size={20} /></div>
                                                    <div className="g-drop-text">เพิ่มรูป ({3 - files.length})</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {files.length === 0 && (
                                        <div className={`g-dropzone ${dragOver ? 'over' : ''}`} onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)); }} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onClick={() => fileRef.current?.click()}>
                                            <input ref={fileRef} type="file" multiple accept="image/*" onChange={e => e.target.files && addFiles(Array.from(e.target.files))} hidden />
                                            <div className="g-drop-content">
                                                <div className="g-drop-icon"><ImageIcon size={32} /></div>
                                                <div className="g-drop-text">ลากไฟล์มาวาง หรือ <b>คลิกเลือก</b></div>
                                                <div className="g-drop-sub">รองรับ JPG, PNG (สูงสุด 3 รูป)</div>
                                            </div>
                                        </div>
                                    )}
                                    {files.length > 0 && <input ref={fileRef} type="file" multiple accept="image/*" onChange={e => e.target.files && addFiles(Array.from(e.target.files))} hidden />}
                                </div>
                            </div>
                            {files.length > 0 && (
                                <div className="g-fg">
                                    <label><ImageIcon size={14} /> ลำดับการส่ง</label>
                                    <div className="g-order-selector">
                                        <button type="button" className={`g-order-option ${!imageFirst ? 'active' : ''}`} onClick={() => setImageFirst(false)}>ส่งข้อความก่อน</button>
                                        <button type="button" className={`g-order-option ${imageFirst ? 'active' : ''}`} onClick={() => setImageFirst(true)}>ส่งรูปภาพก่อน</button>
                                    </div>
                                </div>
                            )}
                            <div className="g-fg">
                                <label><Clock size={16} /> เวลาส่ง</label>
                                <div className="g-custom-time" onClick={showTimePicker}>
                                    <input ref={timeRef} type="datetime-local" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} min={minDT()} className="g-native-picker" />
                                    <div className="g-time-display">
                                        {scheduledTime ? (
                                            <div className="g-time-val">
                                                <span className="g-t-date">{format(new Date(scheduledTime), 'dd/MM/yyyy')}</span>
                                                <span className="g-t-sep">—</span>
                                                <span className="g-t-hour">{format(new Date(scheduledTime), 'HH:mm')} น.</span>
                                            </div>
                                        ) : <div className="g-time-placeholder">เลือกเวลา -- : --</div>}
                                    </div>
                                </div>
                            </div>
                            <div className="g-actions">
                                <button type="submit" disabled={sending} className={`g-btn-save ${sending ? 'loading' : ''}`}>
                                    {sending ? <><Loader2 size={18} className="g-spin" /> <span>กำลังบันทึก...</span></> : <><Save size={18} /> <span>บันทึกข้อความการจอง</span></>}
                                </button>
                                <button type="button" className="g-btn-preview" onClick={() => setShowPreview(true)}>
                                    <Eye size={18} /> ตัวอย่าง
                                </button>
                                <button type="button" onClick={clearForm} disabled={sending} className="g-btn-clear"><Trash2 size={16} /> เคลียร์</button>
                            </div>
                        </form>
                    </div>
                </section>

                <section className="g-panel">
                    <div className="g-panel-head"><div className="g-panel-title"><ClipboardList size={18} /><span>รายการรวมทั้งหมด ({messages.length})</span></div></div>
                    <div className="g-list">
                        {messages.length === 0 ? (
                            <div className="g-empty"><div className="g-empty-icon"><Inbox size={48} /></div><p>ยังไม่มีข้อความ</p></div>
                        ) : groups.map(([label, msgs]) => {
                            const isCollapsed = collapsedDays.includes(label);
                            return (
                                <div key={label} className={`g-dg ${isCollapsed ? 'collapsed' : ''}`}>
                                    <div className="g-dg-bar" onClick={() => toggleDay(label)}>
                                        <div className="g-dg-label"><Calendar size={14} /> {label}</div>
                                        <span className="g-dg-n">{msgs.length} รายการ</span>
                                    </div>
                                    {!isCollapsed && msgs.map(m => {
                                        const st = statusMap[m.status] || statusMap.pending;
                                        const imgs = getImages(m);
                                        const open = expanded === m.id;
                                        return (
                                            <div key={m.id} className={`g-msg ${st.cls} ${open ? 'open' : ''}`} onClick={() => setExpanded(open ? null : m.id)}>
                                                <div className="g-msg-r1">
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <span className={`g-st ${st.cls}`}>{st.icon} {st.label}</span>
                                                        {m.status === 'pending' && (
                                                            <button className="g-item-del" onClick={e => handleDelete(m.id, e)} title="ยกเลิกรายการ">
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <span className="g-msg-time"><Clock size={12} /> {fmtTime(m.scheduledTime)}</span>
                                                </div>
                                                <div className="g-msg-text">{m.content}</div>
                                                {open && (
                                                    <div className="g-msg-detail" onClick={e => e.stopPropagation()}>
                                                        <div className="g-det-text">{m.content}</div>
                                                        {imgs.length > 0 && (
                                                            <div className="g-det-imgs">
                                                                {imgs.map((url, i) => <img key={i} src={getImgUrl(url)} alt="" className="g-det-img-small" />)}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </section>
            </main>

            {/* PREVIEW MODAL */}
            {confirmData && (
                <div className="g-confirm-overlay" onClick={() => setConfirmData(null)}>
                    <div className="g-confirm-modal" onClick={e => e.stopPropagation()}>
                        <div className="g-confirm-icon"><Trash2 size={32} /></div>
                        <h3>{confirmData.title}</h3>
                        <p>{confirmData.text}</p>
                        <div className="g-confirm-btns">
                            <button className="g-btn-cancel" onClick={() => setConfirmData(null)}>ยกเลิก</button>
                            <button className="g-btn-danger" onClick={handleConfirmDelete}>ยืนยันการลบ</button>
                        </div>
                    </div>
                </div>
            )}

            {showPreview && (
                <div className="g-modal-overlay" onClick={() => setShowPreview(false)}>
                    <div className="g-modal-content phone-shell" onClick={e => e.stopPropagation()}>
                        <div className="g-modal-head">
                            <div className="g-phone-time">{format(new Date(), 'HH:mm')}</div>
                            <div className="g-phone-icons">
                                <Signal size={12} strokeWidth={2.5} />
                                <Wifi size={12} strokeWidth={2.5} />
                                <BatteryFull size={14} strokeWidth={2.5} style={{ marginLeft: '4px' }} />
                            </div>
                        </div>
                        <div className="g-modal-body">
                            <div className="g-chat-header">
                                <div className="g-modal-title">LINE Preview</div>
                                <button className="g-modal-close" onClick={() => setShowPreview(false)}><X size={16} /></button>
                            </div>
                            <PreviewBox />
                            <div className="g-phone-home-bar" />
                        </div>
                    </div>
                </div>
            )}

            <div className="g-corner-deco" />
        </div>
    );
}
