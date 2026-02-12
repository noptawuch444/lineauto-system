import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, LogIn, AlertCircle } from 'lucide-react';
import './LoginPage.css';

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simple Master Password Logic
        // In a real app, this should be a backend call
        setTimeout(() => {
            if (password === 'gold123') {
                const adminUser = {
                    id: 'admin-id',
                    lineUserId: 'admin',
                    displayName: 'Admin GoldSync',
                    pictureUrl: '',
                    role: 'admin' as const,
                    status: 'active' as const,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                login(adminUser);
            } else {
                setError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่');
            }
            setLoading(false);
        }, 800);
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="logo-circle" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src="/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <h1>GoldSync AutoBot</h1>
                        <p className="subtitle">ศูนย์จัดการระบบส่งข้อความอัตโนมัติ</p>
                    </div>

                    <div className="login-body">
                        <h2>เข้าสู่ระบบผู้ดูแล</h2>
                        <p className="login-description">
                            กรุณากรอกรหัสผ่านเพื่อเข้าใช้งานหน้าจัดการเทมเพลต
                        </p>

                        <form onSubmit={handleLogin} className="login-form">
                            <div className="input-group-gold">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type="password"
                                    placeholder="รหัสผ่านเข้าหน้า Admin"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {error && (
                                <div className="login-error">
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button type="submit" className="btn-gold-login" disabled={loading}>
                                {loading ? (
                                    <span className="loader-sm"></span>
                                ) : (
                                    <>
                                        เข้าสู่ระบบ <LogIn size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="login-footer">
                            <small>© 2026 GoldSync AutoBot System</small>
                        </div>
                    </div>
                </div>

                <div className="login-bg-decoration">
                    <div className="circle circle-1"></div>
                    <div className="circle circle-2"></div>
                    <div className="circle circle-3"></div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
