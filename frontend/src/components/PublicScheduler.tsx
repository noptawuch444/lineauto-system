import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import axios from 'axios';
import {
    FileText, PencilLine, Image as ImageIcon, Clock, Save, Trash2,
    ClipboardList, RefreshCw, Inbox, Calendar, Hourglass, Send,
    CheckCircle2, XCircle, Ban, Camera, ChevronUp, ChevronDown,
    FileEdit, AlertTriangle, Loader2, Headset
} from 'lucide-react';
import './PublicScheduler.css';

const API = import.meta.env.VITE_API_URL || '/api';
const CONTACT_LINK = 'https://line.me/R/ti/p/@your_id'; // ปรับเปลี่ยนลิงก์ติดต่อตรงนี้

interface Template { id: string; name: string; description?: string; }
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
    const fileRef = useRef<HTMLInputElement>(null);
    const timeRef = useRef<HTMLInputElement>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        loadTemplate(true);
        loadMessages();
        const iv = setInterval(() => {
            loadTemplate(false);
            loadMessages();
        }, 5000);
        return () => clearInterval(iv);
    }, [publicCode]);

    // Snowfall Effect - Runs when loading finishes to catch the canvas ref
    useEffect(() => {
        if (loading || error) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const flakeCount = 100; // Reduced count
        const flakes: { x: number; y: number; r: number; d: number; s: number; color: string }[] = [];

        const goldShades = [
            'rgba(243, 207, 138, 0.8)', // Light Gold
            'rgba(201, 168, 76, 0.9)',  // Deep Gold
            'rgba(255, 235, 180, 0.7)', // Brighter Gold
            'rgba(180, 140, 50, 0.9)'   // Darker Gold
        ];

        for (let i = 0; i < flakeCount; i++) {
            flakes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * 2.5 + 1,
                d: Math.random() * flakeCount,
                s: Math.random() * 1.5 + 1,
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

    const loadTemplate = async (init = false) => {
        try {
            if (init) setLoading(true);
            const r = await axios.get(`${API}/public-template/template/${publicCode}`);
            setTemplate(r.data);
            if (error) setError(''); // Clear error if it's back online
        }
        catch (e: any) {
            setError(e.response?.data?.error || 'ไม่พบเทมเพลตนี้');
        }
        finally { if (init) setLoading(false); }
    };

    const loadMessages = async () => {
        try { const r = await axios.get(`${API}/public-template/template/${publicCode}/messages`); setMessages(r.data); } catch { /* */ }
    };

    const addFiles = (incoming: File[]) => {
        const slots = 3 - files.length; if (slots <= 0) return;
        const valid = incoming.slice(0, slots).filter(f => f.type.startsWith('image/')); if (!valid.length) return;
        setFiles(p => [...p, ...valid]);
        setPreviews(p => [...p, ...valid.map(f => URL.createObjectURL(f))]);
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
        if (!text.trim()) return showToast('กรุณาใส่ข้อความ', 'warn');
        if (!scheduledTime) return showToast('กรุณาเลือกเวลาส่ง', 'warn');
        try {
            setSending(true);
            const urls: string[] = [];
            for (const file of files) {
                const fd = new FormData(); fd.append('image', file);
                const r = await axios.post(`${API}/public-template/upload`, fd);
                if (r.data.url) urls.push(r.data.url);
            }
            await axios.post(`${API}/public-template/schedule/${publicCode}`, {
                content: text, imageUrl: urls[0] || null, imageUrls: urls,
                scheduledTime: new Date(scheduledTime).toISOString(),
                imageFirst: imageFirst
            });
            clearForm(); loadMessages();
            showToast('ตั้งเวลาส่งข้อความเรียบร้อยแล้ว!', 'ok');
        } catch (e: any) { showToast(e.message || 'เกิดข้อผิดพลาด', 'err'); }
        finally { setSending(false); }
    };

    const minDT = () => {
        const d = new Date(); d.setMinutes(d.getMinutes() + 1);
        const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0'), hh = String(d.getHours()).padStart(2, '0'), min = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${dd}T${hh}:${min}`;
    };

    const showTimePicker = () => {
        if (timeRef.current) {
            // Use showPicker if available (Chrome 99+), otherwise fallback to click
            if ('showPicker' in HTMLInputElement.prototype) {
                timeRef.current.showPicker();
            } else {
                timeRef.current.click();
            }
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

    // Memoized grouping logic
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
        setCollapsedDays(prev =>
            prev.includes(label) ? prev.filter(d => d !== label) : [...prev, label]
        );
    };

    // ──── RENDER ────
    if (loading) return <div className="g"><div className="g-center"><Loader2 className="g-spin-icon" /></div></div>;
    if (error) {
        const isInactive = error === 'Template is not active';
        return (
            <div className="g">
                <div className="g-center">
                    <div className="g-error-icon"><AlertTriangle size={48} /></div>
                    <h2>{isInactive ? 'บอทไลน์นี้ถูกปิดใช้งาน' : 'ไม่พบเทมเพลต'}</h2>
                    <p style={{ color: '#a89060', maxWidth: '400px', lineHeight: '1.6' }}>
                        {isInactive
                            ? `ขออภัย บอทไลน์ "${template?.name || 'นี้'}" ไม่สามารถใช้งานได้ในขณะนี้ กรุณาติดต่อผู้ดูแลระบบ`
                            : error}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="g">
            {/* Animated Background Layers */}
            <div className="g-bg-anim">
                <canvas ref={canvasRef} className="g-canvas-bg" />
            </div>

            {toast && (
                <div className={`g-toast ${toast.type}`}>
                    {toast.type === 'ok' && <CheckCircle2 size={18} />}
                    {toast.type === 'err' && <XCircle size={18} />}
                    {toast.type === 'warn' && <AlertTriangle size={18} />}
                    <span>{toast.msg}</span>
                </div>
            )}

            {/* ═══ TOPBAR ═══ */}
            <header className="g-nav">
                <div className="g-nav-l">
                    <div className="g-logo-wrap">
                        <img src="/logo.jpg" alt="GoldSync" />
                    </div>
                    <div>
                        <div className="g-brand">GoldSync AutoBot <span>AUTOBOT</span></div>
                        <div className="g-tpl"><FileText size={14} className="g-icon-inline" /> เทมเพลต: <b>{template?.name || '—'}</b></div>
                    </div>
                </div>
                <div className="g-nav-r">
                    <div className="g-status">
                        <small>สถานะระบบ</small>
                        <span><div className="g-dot" /> พร้อมใช้งาน</span>
                    </div>
                    <button className="g-dl-btn" onClick={() => window.open(CONTACT_LINK, '_blank')}>
                        <Headset size={16} className="g-icon-inline" /> ติดต่อแอดมิน
                    </button>
                </div>
            </header>

            {/* ═══ BODY ═══ */}
            <main className="g-body">
                {/* LEFT: COMPOSE */}
                <section className="g-panel">
                    <div className="g-panel-head">
                        <div className="g-panel-title">
                            <PencilLine size={18} />
                            <span>สร้างรายการใหม่</span>
                        </div>
                    </div>
                    <form onSubmit={submit} className="g-form">
                        <div className="g-fg g-fg-grow">
                            <label>ข้อความ <span className="g-counter">({text.length} ตัวอักษร)</span></label>
                            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="พิมพ์ข้อความที่ต้องการส่ง..." className="g-ta" />
                        </div>

                        {/* ═══ PREMIUM IMAGE UPLOAD ═══ */}
                        <div className="g-fg">
                            <label>
                                รูปภาพ <span className="g-counter">({files.length}/3)</span>
                            </label>

                            {/* Drop area + Gallery */}
                            <div className="g-img-area">
                                {/* Gallery Grid */}
                                {previews.length > 0 && (
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
                                    </div>
                                )}

                                {/* Drop Zone */}
                                {files.length < 3 && (
                                    <div
                                        className={`g-dropzone ${dragOver ? 'over' : ''}`}
                                        onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)); }}
                                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                        onDragLeave={() => setDragOver(false)}
                                        onClick={() => fileRef.current?.click()}
                                    >
                                        <input ref={fileRef} type="file" multiple accept="image/*" onChange={e => e.target.files && addFiles(Array.from(e.target.files))} hidden />
                                        <div className="g-drop-content">
                                            <div className="g-drop-icon"><ImageIcon size={32} /></div>
                                            <div className="g-drop-text">
                                                ลากไฟล์มาวาง หรือ <b>คลิกเลือก</b>
                                            </div>
                                            <div className="g-drop-sub">รองรับ JPG, PNG (เหลือ {3 - files.length} รูป)</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Order Preference */}
                        {files.length > 0 && (
                            <div className="g-fg">
                                <label><ImageIcon size={14} /> เลือกรูปแบบการลำดับข้อความ</label>
                                <div className="g-order-selector">
                                    <button
                                        type="button"
                                        className={`g-order-option ${!imageFirst ? 'active' : ''}`}
                                        onClick={() => setImageFirst(false)}
                                    >
                                        <div className="g-order-preview">
                                            <div className="g-p-txt">ข้อความ</div>
                                            <div className="g-p-arr">➔</div>
                                            <div className="g-p-img">รูปภาพ</div>
                                        </div>
                                        <span>ส่งข้อความก่อนรูป</span>
                                    </button>

                                    <button
                                        type="button"
                                        className={`g-order-option ${imageFirst ? 'active' : ''}`}
                                        onClick={() => setImageFirst(true)}
                                    >
                                        <div className="g-order-preview">
                                            <div className="g-p-img">รูปภาพ</div>
                                            <div className="g-p-arr">➔</div>
                                            <div className="g-p-txt">ข้อความ</div>
                                        </div>
                                        <span>ส่งรูปภาพก่อนข้อความ</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="g-fg">
                            <label><Clock size={16} /> เวลาส่ง (วัน/เดือน/ปี 24ชม.)</label>
                            <div className="g-custom-time" onClick={showTimePicker}>
                                <input
                                    ref={timeRef}
                                    type="datetime-local"
                                    value={scheduledTime}
                                    onChange={e => setScheduledTime(e.target.value)}
                                    min={minDT()}
                                    className="g-native-picker"
                                />
                                <div className="g-time-display">
                                    {scheduledTime ? (
                                        <div className="g-time-val">
                                            <span className="g-t-date">{format(new Date(scheduledTime), 'dd/MM/yyyy')}</span>
                                            <span className="g-t-sep">—</span>
                                            <span className="g-t-hour">{format(new Date(scheduledTime), 'HH:mm')} น.</span>
                                        </div>
                                    ) : (
                                        <div className="g-time-placeholder">วัน/เดือน/ปี  -- : --</div>
                                    )}
                                    <div className="g-time-edit-hint">คลิกเพื่อเลือกเวลา</div>
                                </div>
                            </div>
                        </div>

                        <div className="g-actions">
                            <button type="submit" disabled={sending} className="g-btn-save">
                                {sending ? <><Loader2 size={18} className="g-spin" /> กำลังบันทึก...</> : <><Save size={18} /> บันทึก</>}
                            </button>
                            <button type="button" onClick={clearForm} disabled={sending} className="g-btn-clear">
                                <Trash2 size={16} /> เคลียร์
                            </button>
                        </div>
                    </form>
                </section>

                {/* RIGHT: HISTORY */}
                <section className="g-panel">
                    <div className="g-panel-head">
                        <div className="g-panel-title">
                            <ClipboardList size={18} />
                            <span>รายการส่งข้อความ ({messages.length})</span>
                        </div>
                        <button className="g-btn-ref" onClick={() => loadMessages()}><RefreshCw size={14} /> รีเฟรช</button>
                    </div>
                    <div className="g-list">
                        {messages.length === 0 ? (
                            <div className="g-empty">
                                <div className="g-empty-icon"><Inbox size={48} /></div>
                                <p>ยังไม่มีข้อความ</p>
                                <small>สร้างข้อความใหม่ได้ทางซ้าย</small>
                            </div>
                        ) : groups.map(([label, msgs]) => {
                            const isCollapsed = collapsedDays.includes(label);
                            return (
                                <div key={label} className={`g-dg ${isCollapsed ? 'collapsed' : ''}`}>
                                    <div className="g-dg-bar" onClick={() => toggleDay(label)} style={{ cursor: 'pointer' }}>
                                        <div className="g-dg-label">
                                            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                            <Calendar size={14} /> {label}
                                        </div>
                                        <span className="g-dg-n">{msgs.length} รายการ</span>
                                    </div>
                                    {!isCollapsed && msgs.map(m => {
                                        const st = statusMap[m.status] || statusMap.pending;
                                        const imgs = getImages(m);
                                        const open = expanded === m.id;
                                        return (
                                            <div key={m.id} className={`g-msg ${st.cls} ${open ? 'open' : ''}`} onClick={() => setExpanded(open ? null : m.id)}>
                                                <div className="g-msg-r1">
                                                    <span className={`g-st ${st.cls}`}>{st.icon} {st.label}</span>
                                                    <span className="g-msg-time"><Clock size={12} /> {fmtTime(m.scheduledTime)}</span>
                                                    <div className="g-msg-meta">
                                                        {imgs.length > 0 && <span className="g-meta-t"><Camera size={12} /> {imgs.length}</span>}
                                                        <span className="g-chev">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                                                    </div>
                                                </div>
                                                <div className="g-msg-text">{m.content}</div>
                                                {open && (
                                                    <div className="g-msg-detail" onClick={e => e.stopPropagation()}>
                                                        <div className="g-det-sec">
                                                            <div className="g-det-label"><FileEdit size={14} /> ข้อความเต็ม</div>
                                                            <div className="g-det-text">{m.content}</div>
                                                        </div>
                                                        {imgs.length > 0 && (
                                                            <div className="g-det-sec">
                                                                <div className="g-det-label"><ImageIcon size={14} /> รูปภาพ ({imgs.length})</div>
                                                                <div className="g-det-imgs">
                                                                    {imgs.map((url, i) => (
                                                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="g-det-img">
                                                                            <img src={url} alt="" />
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {m.status === 'failed' && m.logs?.length && (
                                                            <div className="g-det-sec">
                                                                <div className="g-det-label g-det-err"><AlertTriangle size={14} /> Error</div>
                                                                <div className="g-det-log">
                                                                    {m.logs.map((l, i) => <div key={i}>{typeof l === 'string' ? l : JSON.stringify(l)}</div>)}
                                                                </div>
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

            {/* Corner decoration */}
            <div className="g-corner-deco" />
        </div>
    );
}
