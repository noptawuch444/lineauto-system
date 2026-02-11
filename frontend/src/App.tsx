import { Routes, Route } from 'react-router-dom';
import './App.css';
import TemplateManagement from './components/TemplateManagement';
import PublicScheduler from './components/PublicScheduler';

function App() {
    return (
        <Routes>
            {/* Public Route - Template-based Scheduling */}
            <Route path="/schedule/:publicCode" element={<PublicScheduler />} />

            {/* Admin Routes - No Authentication Required */}
            <Route path="/*" element={<AdminApp />} />
        </Routes>
    );
}

import { Database } from 'lucide-react';

function AdminApp() {
    return (
        <div className="app">
            <div className="container">
                <nav className="top-nav">
                    <div className="nav-brand-wrap">
                        <div className="nav-logo-box">
                            <img src="/logo-pro.jpg" onError={e => e.currentTarget.src = 'https://ui-avatars.com/api/?name=LG&background=1a1710&color=d4a337&size=40&bold=true&font-size=0.4'} alt="" />
                        </div>
                        <div className="nav-brand-info">
                            <div className="nav-brand-name">Lotto Gold PRO <span>ADMIN</span></div>
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
