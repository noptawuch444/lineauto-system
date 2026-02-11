import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { User, LineGroup } from '../types';
import './AdminDashboard.css';

const AdminDashboard: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [groups, setGroups] = useState<LineGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersData, groupsData] = await Promise.all([
                adminApi.getUsers(),
                adminApi.getGroups()
            ]);
            setUsers(usersData);
            setGroups(groupsData);
        } catch (error) {
            console.error('Failed to fetch admin data', error);
            alert('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAssignModal = (user: User) => {
        setSelectedUser(user);
        // Pre-select currently assigned groups
        const assignedIds = user.assignedGroups?.map(g => g.id) || [];
        setSelectedGroupIds(assignedIds);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
        setSelectedGroupIds([]);
    };

    const toggleGroupSelection = (groupId: string) => {
        setSelectedGroupIds(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const handleSaveAssignment = async () => {
        if (!selectedUser) return;

        try {
            setSaving(true);
            await adminApi.assignGroups(selectedUser.id, selectedGroupIds);

            // Refresh local state or fetch again
            await fetchData();

            handleCloseModal();
            alert('บันทึกข้อมูลเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Failed to assign groups', error);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-spinner">Loading Admin Dashboard...</div>;

    return (
        <div className="admin-dashboard">
            <h2 className="admin-title">จัดการผู้ใช้งาน (User Management)</h2>

            <div className="users-grid">
                {users.map(user => (
                    <div key={user.id} className="user-card">
                        <div className="user-header">
                            <div className="user-avatar">
                                {user.pictureUrl ? (
                                    <img src={user.pictureUrl} alt={user.displayName} />
                                ) : (
                                    <span>{user.displayName.charAt(0)}</span>
                                )}
                            </div>
                            <div className="user-info">
                                <h3>{user.displayName}</h3>
                                <div className="user-meta">
                                    <span className={`role-badge ${user.role}`}>{user.role.toUpperCase()}</span>
                                    <span className={`status-badge ${user.status}`}>{user.status}</span>
                                </div>
                            </div>
                        </div>

                        <div className="user-groups">
                            <h4>กลุ่มที่ดูแล ({user.assignedGroups?.length || 0})</h4>
                            <div className="group-tags">
                                {user.assignedGroups && user.assignedGroups.length > 0 ? (
                                    user.assignedGroups.map(group => (
                                        <span key={group.id} className="group-tag">
                                            {group.groupName || 'Unknown Group'}
                                        </span>
                                    ))
                                ) : (
                                    <span className="no-groups">- ยังไม่ได้กำหนดกลุ่ม -</span>
                                )}
                            </div>
                        </div>

                        <button className="btn-assign" onClick={() => handleOpenAssignModal(user)}>
                            จัดการกลุ่ม
                        </button>
                    </div>
                ))}
            </div>

            {/* Assignment Modal */}
            {isModalOpen && selectedUser && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-card admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>กำหนดกลุ่มให้: {selectedUser.displayName}</h3>
                            <button className="close-btn" onClick={handleCloseModal}>×</button>
                        </div>

                        <div className="modal-body">
                            <p className="modal-description">เลือกกลุ่มที่ต้องการให้ผู้ใช้นี้สามารถส่งข้อความได้</p>

                            <div className="groups-selection-list">
                                {groups.map(group => (
                                    <div
                                        key={group.id}
                                        className={`group-item ${selectedGroupIds.includes(group.id) ? 'selected' : ''}`}
                                        onClick={() => toggleGroupSelection(group.id)}
                                    >
                                        <div className="group-checkbox">
                                            {selectedGroupIds.includes(group.id) && '✓'}
                                        </div>
                                        <div className="group-info">
                                            <strong>{group.groupName || 'Unknown Group'}</strong>
                                            <small>{group.groupId}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={handleCloseModal}>ยกเลิก</button>
                            <button
                                className="btn-save"
                                onClick={handleSaveAssignment}
                                disabled={saving}
                            >
                                {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
