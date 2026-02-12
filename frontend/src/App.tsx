import { Routes, Route } from 'react-router-dom';
import { Database, LogOut, Bot } from 'lucide-react';
import './App.css';
import TemplateManagement from './components/TemplateManagement';
import PublicScheduler from './components/PublicScheduler';
import LoginPage from './components/LoginPage';
import BotManagement from './components/BotManagement';
import { useAuth } from './contexts/AuthContext';
import { useState } from 'react';

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="app-loading-screen">
                <div className="loader"></div>
                <p>GoldSync AutoBot Loading...</p>
            </div>
        );
    }

    return (
        <Routes>
            {/* Public Route - Template-based Scheduling */}
            <Route path="/schedule/:publicCode" element={<PublicScheduler />} />

            {/* Admin Routes - Protected */}
            <Route
                path="/*"
                element={user ? <AdminApp /> : <LoginPage />}
            />
        </Routes>
    );
}

function AdminApp() {
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'templates' | 'bots'>('templates');

    return (
        <div className="app">
            <div className="container">
                <nav className="top-nav">
                    <div className="nav-brand-wrap">
                        <div className="nav-logo-box">
                            <img src="/logo.jpg" alt="GoldSync Logo" />
                        </div>
                        <div className="nav-brand-info">
                            <div className="nav-brand-name">GoldSync AutoBot <span>ADMIN</span></div>
                            <div className="nav-brand-sub"><Database size={12} /> ระบบจัดการหลังบ้าน</div>
                        </div>
                    </div>

                    <div className="nav-spacer" />

                    <div className="nav-status-wrap">
                        <div className="nav-status">
                            <small>สถานะเซิร์ฟเวอร์</small>
                            <span><div className="nav-dot" /> ออนไลน์</span>
                        </div>
                        <div className="user-profile-badge">
                            <div className="avatar">A</div>
                            <span>แอดมิน</span>
                            <button className="nav-logout-btn" onClick={logout} title="ออกจากระบบ">
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </nav>

                <div className="main-content-area">
                    <div className="admin-tabs">
                        <button
                            className={`admin-tab ${activeTab === 'templates' ? 'active' : ''}`}
                            onClick={() => setActiveTab('templates')}
                        >
                            <Database size={16} /> เทมเพลต & การจอง
                        </button>
                        <button
                            className={`admin-tab ${activeTab === 'bots' ? 'active' : ''}`}
                            onClick={() => setActiveTab('bots')}
                        >
                            <Bot size={16} /> จัดการบอท
                        </button>
                    </div>
                    <div className="admin-content">
                        {activeTab === 'templates' ? <TemplateManagement /> : <BotManagement />}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
