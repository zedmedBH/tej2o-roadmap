import { useState, useEffect } from 'react';
import type { Checkpoint, TaskProgress, TeamMember, TaskStatus } from '../types';
import { getTeamMembers, saveTaskProgress } from '../services/db';
import { useAuth } from '../contexts/AuthContext';

interface TaskModalProps {
    task: Checkpoint;
    teamId: string | null;
    initialProgress?: TaskProgress;
    onClose: () => void;
    onSaveSuccess: () => void; // Trigger a re-render in the parent timeline
}

export function TaskModal({ task, teamId, initialProgress, onClose, onSaveSuccess }: TaskModalProps) {
    const { user } = useAuth();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // --- FORM STATE ---
    const [status, setStatus] = useState(initialProgress?.status || 'Not Started');
    const [dueDate, setDueDate] = useState(initialProgress?.dueDate || '');
    const [completions, setCompletions] = useState<Record<string, boolean>>(initialProgress?.taskCompletions || {});
    const [assignments, setAssignments] = useState<Record<string, string[]>>(initialProgress?.taskAssignments || {});
    const [roles, setRoles] = useState<Record<string, string>>(initialProgress?.roles || {});

    // Read-only mode if there is no team ID, or if the user is a teacher (unless you want teachers to edit)
    const isReadOnly = !teamId || members.length === 0; 
    const isTeacher = user?.role === 'teacher';

    // Fetch team members when the modal opens
    useEffect(() => {
        if (teamId) {
            getTeamMembers(teamId).then(setMembers).catch(console.error);
        }
    }, [teamId]);

    // --- EVENT HANDLERS ---
    const handleCheckboxChange = (taskName: string, checked: boolean) => {
        setCompletions(prev => ({ ...prev, [taskName]: checked }));
    };

    const handleAddAssignee = (taskName: string, uid: string) => {
        if (!uid) return;
        setAssignments(prev => {
            const current = prev[taskName] || [];
            if (current.includes(uid)) return prev; // Prevent duplicates
            return { ...prev, [taskName]: [...current, uid] };
        });
    };

    const handleRemoveAssignee = (taskName: string, uid: string) => {
        setAssignments(prev => {
            const current = prev[taskName] || [];
            return { ...prev, [taskName]: current.filter(id => id !== uid) };
        });
    };

    const handleSave = async () => {
        if (!teamId) return;
        setIsSaving(true);

        const data: Partial<TaskProgress> = {
            status: status as any,
            dueDate,
            taskCompletions: completions,
            taskAssignments: assignments,
            roles,
        };

        try {
            await saveTaskProgress(teamId, task.id, data); //
            onSaveSuccess();
            onClose();
        } catch (error) {
            console.error("Save failed:", error);
            alert("Failed to save progress.");
            setIsSaving(false);
        }
    };

    // --- HELPER RENDERS ---
    const renderRoleSelect = (roleKey: string, label: string) => (
        <div className="role-group" key={roleKey}>
            <label className="role-label">{label}</label>
            <select 
                className="role-select" 
                disabled={isReadOnly || isTeacher}
                value={roles[roleKey] || ""}
                onChange={(e) => setRoles(prev => ({ ...prev, [roleKey]: e.target.value }))}
            >
                <option value="">Unassigned</option>
                {members.map(m => (
                    <option key={m.uid} value={m.uid}>{m.email.split('@')[0]}</option>
                ))}
            </select>
        </div>
    );

    return (
        <div id="modal-overlay" className="active" onClick={(e) => {
            // Close if clicking the background overlay
            if ((e.target as HTMLElement).id === 'modal-overlay') onClose();
        }}>
            <div id="modal-card">
                <button className="close-btn" onClick={onClose}>&times;</button>
                
                <div id="modal-content">
                    <div className="modal-header">
                        <h2 style={{ color: task.color }}>{task.title}</h2>
                        <span className="modal-meta" style={{ display: 'block', marginBottom: '20px', color: '#666' }}>{task.subtitle}</span>
                    </div>
                    <p>{task.desc}</p>

                    {/* Session Roles logic */}
                    {task.title.startsWith("Build") && (
                        <div className="role-container">
                            <span className="role-header">Session Roles</span>
                            <div className="role-grid">
                                {renderRoleSelect('leadBuilder', 'Lead Builder')}
                                {renderRoleSelect('supportBuilder', 'Support Builder')}
                                {renderRoleSelect('leadCutter', 'Lead Cutter')}
                                {renderRoleSelect('supportCutter', 'Support Cutter')}
                            </div>
                        </div>
                    )}

                    <div style={{ margin: '20px 0' }}>
                        <strong>Task List & Assignments:</strong>
                        <ul className="task-list">
                            {task.tasks?.map((taskName, idx) => {
                                const assignedUids = assignments[taskName] || [];
                                
                                return (
                                    <li className="task-row" key={idx}>
                                        <input 
                                            type="checkbox" 
                                            className="task-status-checkbox" 
                                            checked={!!completions[taskName]}
                                            disabled={isReadOnly || isTeacher}
                                            onChange={(e) => handleCheckboxChange(taskName, e.target.checked)}
                                        />
                                        <div className="task-content-wrapper">
                                            <span className="task-name" style={{ textDecoration: completions[taskName] ? 'line-through' : 'none' }}>
                                                {taskName}
                                            </span>
                                            
                                            <div className="assignee-container">
                                                {assignedUids.map(uid => {
                                                    const member = members.find(m => m.uid === uid);
                                                    return (
                                                        <div className="assignee-tag" key={uid}>
                                                            {member ? member.email.split('@')[0] : 'Unknown'}
                                                            {!(isReadOnly || isTeacher) && (
                                                                <span className="assignee-remove" onClick={() => handleRemoveAssignee(taskName, uid)}>&times;</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* The Add Dropdown */}
                                                {!(isReadOnly || isTeacher) && (
                                                    <select 
                                                        className="add-assignee-select"
                                                        value="" // Always force back to default after selection
                                                        onChange={(e) => handleAddAssignee(taskName, e.target.value)}
                                                    >
                                                        <option value="" disabled>Add...</option>
                                                        {members.map(m => (
                                                            <option key={m.uid} value={m.uid}>{m.email.split('@')[0]}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <div className="modal-resources">
                        <strong>Resources:</strong><br/>
                        {task.resources?.length ? task.resources.map((r, i) => (
                            <a key={i} href={r.url} className="btn-resource" target="_blank" rel="noreferrer">{r.label}</a>
                        )) : 'None'}
                    </div>
                </div>
                
                <div id="modal-actions" className="modal-actions">
                    <hr style={{ margin: '20px 0', border: 0, borderTop: '1px solid #eee' }} />
                    <h3>Checkpoint Details</h3>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label>Target Date:</label>
                            <input 
                                type="date" 
                                disabled={isReadOnly || isTeacher}
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Status:</label>
                            <select 
                                disabled={isReadOnly || isTeacher}
                                value={status}
                                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                            >
                                <option value="Not Started">Not Started</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Blocked">Blocked</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>
                    </div>    
                    {!(isReadOnly || isTeacher) && (
                        <button 
                            className="btn-primary" 
                            onClick={handleSave} 
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving..." : "Save Progress"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}