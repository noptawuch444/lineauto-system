import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';
const LIFF_URL = 'https://liff.line.me/2009100955-fELJrTiq';

interface User {
    id: string;
    displayName: string;
    lineUserId: string;
    assignedGroups: LineGroup[];
}

interface LineGroup {
    id: string;
    groupId: string;
    groupName: string | null;
}

export default function GroupManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [groups, setGroups] = useState<LineGroup[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchGroups();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/users`);
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchGroups = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/groups`);
            setGroups(response.data);
        } catch (error) {
            console.error('Error fetching groups:', error);
        }
    };

    const handleUserSelect = (userId: string) => {
        setSelectedUserId(userId);
        const user = users.find(u => u.id === userId);
        if (user) {
            setSelectedGroupIds(user.assignedGroups.map(g => g.id));
        }
    };

    const handleGroupToggle = (groupId: string) => {
        setSelectedGroupIds(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const handleSaveAssignment = async () => {
        if (!selectedUserId) return;

        setLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/admin/assign`, {
                userId: selectedUserId,
                groupIds: selectedGroupIds
            });

            fetchUsers();
            alert('บันทึกการกำหนด Group สำเร็จ!');
        } catch (error) {
            console.error('Error assigning groups:', error);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setLoading(false);
        }
    };

    const copyLiffUrl = () => {
        navigator.clipboard.writeText(LIFF_URL);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    return (
        <div className="group-management">
            <h2>📋 จัดการ Users และ Groups</h2>

            {/* LIFF URL Section */}
            <div className="liff-url-section">
                <h3>🔗 LIFF URL สำหรับ Users</h3>
                <p className="liff-description">
                    แชร์ URL นี้ให้กับ users เพื่อให้พวกเขาเข้าสู่ระบบผ่าน LINE
                </p>
                <div className="liff-url-box">
                    <code className="liff-url">{LIFF_URL}</code>
                    <button
                        className="btn-copy-liff"
                        onClick={copyLiffUrl}
                    >
                        {copiedLink ? '✓ คัดลอกแล้ว' : '📋 Copy URL'}
                    </button>
                </div>
                <p className="liff-note">
                    💡 เมื่อ user เปิด URL นี้ พวกเขาจะ login ผ่าน LINE และระบบจะบันทึกข้อมูลอัตโนมัติ
                </p>
            </div>

            <div className="management-grid">
                {/* Users List */}
                <div className="users-panel">
                    <h3>👥 รายชื่อ Users ({users.length})</h3>
                    <p className="panel-description">
                        Users ที่ login ผ่าน LIFF แล้ว
                    </p>
                    <div className="users-list">
                        {users.length === 0 ? (
                            <div className="empty-state">
                                <p>ยังไม่มี user login</p>
                                <p className="empty-hint">แชร์ LIFF URL ด้านบนให้ users เพื่อให้พวกเขา login</p>
                            </div>
                        ) : (
                            users.map(user => (
                                <div
                                    key={user.id}
                                    className={`user-item ${selectedUserId === user.id ? 'selected' : ''}`}
                                    onClick={() => handleUserSelect(user.id)}
                                >
                                    <div className="user-info">
                                        <strong>{user.displayName}</strong>
                                        <span className="user-line-id">
                                            LINE ID: {user.lineUserId.substring(0, 10)}...
                                        </span>
                                        <div className="assigned-count">
                                            {user.assignedGroups.length} groups
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Groups Assignment */}
                <div className="groups-panel">
                    <h3>🏢 กำหนด Groups</h3>
                    {selectedUserId ? (
                        <>
                            <p className="panel-description">
                                เลือก groups ที่ user สามารถส่งข้อความได้
                            </p>
                            <div className="groups-list">
                                {groups.map(group => (
                                    <label key={group.id} className="group-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={selectedGroupIds.includes(group.id)}
                                            onChange={() => handleGroupToggle(group.id)}
                                        />
                                        <span className="group-name">
                                            {group.groupName || group.groupId}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            <button
                                onClick={handleSaveAssignment}
                                disabled={loading}
                                className="btn-save"
                            >
                                {loading ? 'กำลังบันทึก...' : '💾 บันทึกการกำหนด'}
                            </button>
                        </>
                    ) : (
                        <p className="no-selection">กรุณาเลือก User ก่อน</p>
                    )}
                </div>
            </div>
        </div>
    );
}
