import { Routes, Route } from 'react-router-dom';
import { Database, LogOut } from 'lucide-react';
import './App.css';
import TemplateManagement from './components/TemplateManagement';
import PublicScheduler from './components/PublicScheduler';
import LoginPage from './components/LoginPage';
import { useAuth } from './contexts/AuthContext';

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
                    <div className="admin-content">
                        <TemplateManagement />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
