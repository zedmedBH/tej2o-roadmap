import React, { useState, useEffect } from 'react';
import type { Team, TeamMember, Checkpoint } from '../types';
import { 
    getAllTeams, createTeam, deleteTeam, getTeamMembers, 
    addStudentToTeam, removeStudentFromTeam, getMasterTasks, 
    addMasterTask, updateMasterTask, deleteMasterTask, updateCheckpointOrder 
} from '../services/db';

interface AdminDashboardProps {
    onClose: () => void;
}

export function AdminDashboard({ onClose }: AdminDashboardProps) {
    // --- TEAM STATE ---
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [newTeamName, setNewTeamName] = useState('');
    const [newStudentEmail, setNewStudentEmail] = useState('');

    // --- CHECKPOINT STATE ---
    const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
    // We use a flat object to manage the form inputs easily
    const [cpForm, setCpForm] = useState({
        id: '', title: '', subtitle: '', color: '', mypMin: '', mypMax: '', desc: '', tasksStr: '', resourcesStr: ''
    });

    // --- INITIAL DATA LOAD ---
    useEffect(() => {
        loadTeams();
        loadCheckpoints();
    }, []);

    // Fetch members whenever the selected team changes
    useEffect(() => {
        if (selectedTeam) {
            getTeamMembers(selectedTeam.id).then(setMembers).catch(console.error);
        } else {
            setMembers([]);
        }
    }, [selectedTeam]);

    // --- TEAM LOGIC ---
    const loadTeams = async () => setTeams(await getAllTeams());

    const handleCreateTeam = async () => {
        if (!newTeamName) return;
        await createTeam(newTeamName);
        setNewTeamName('');
        loadTeams();
    };

    const handleDeleteTeam = async (team: Team) => {
        if (window.confirm(`⚠️ Are you sure you want to delete "${team.name}"?\n\nThis will remove the team and unassign all its members.`)) {
            await deleteTeam(team.id);
            setSelectedTeam(null);
            loadTeams();
        }
    };

    const handleAddStudent = async () => {
        if (!newStudentEmail || !selectedTeam) return;
        try {
            await addStudentToTeam(selectedTeam.id, newStudentEmail);
            setNewStudentEmail('');
            // Trigger a re-fetch of members
            setMembers(await getTeamMembers(selectedTeam.id));
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleRemoveStudent = async (member: TeamMember) => {
        if (selectedTeam && window.confirm(`Remove ${member.email} from this team?`)) {
            await removeStudentFromTeam(selectedTeam.id, member);
            setMembers(await getTeamMembers(selectedTeam.id));
        }
    };

    // --- CHECKPOINT LOGIC ---
    const loadCheckpoints = async () => setCheckpoints(await getMasterTasks());

    const moveTask = async (index: number, direction: number) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= checkpoints.length) return;

        // Create a copy and swap
        const newTasks = [...checkpoints];
        const temp = newTasks[index];
        newTasks[index] = newTasks[targetIndex];
        newTasks[targetIndex] = temp;

        setCheckpoints(newTasks); // Optimistic UI update
        try {
            await updateCheckpointOrder(newTasks);
            loadCheckpoints(); // Verify with DB
        } catch (e: any) {
            alert("Error updating order: " + e.message);
            loadCheckpoints(); // Revert on failure
        }
    };

    const handleEditCp = (task: Checkpoint) => {
        // Parse arrays back to strings for the form inputs
        const tasksStr = task.tasks ? task.tasks.join(', ') : '';
        const resourcesStr = task.resources && task.resources.length > 0 
            ? task.resources.map(r => `${r.label} :: ${r.url}`).join('\n') 
            : '';

        setCpForm({
            id: task.id, title: task.title || '', subtitle: task.subtitle || '', color: task.color || '#333333', 
            mypMin: task.mypMin?.toString() || '', mypMax: task.mypMax?.toString() || '', 
            desc: task.desc || '', tasksStr, resourcesStr
        });
    };

    const handleSaveCp = async () => {
        if (!cpForm.title) return alert("Title is required!");

        // Parse strings back to arrays/objects for the DB
        const tasksArray = cpForm.tasksStr.split(',').map(t => t.trim()).filter(t => t !== "");
        const resourcesArray = cpForm.resourcesStr.split('\n')
            .map(line => line.trim())
            .filter(line => line.includes('::'))
            .map(line => {
                const parts = line.split('::');
                return { label: parts[0].trim(), url: parts[1].trim() };
            });

        const cpData: Partial<Checkpoint> = {
            title: cpForm.title, subtitle: cpForm.subtitle, color: cpForm.color,
            mypMin: cpForm.mypMin || undefined, mypMax: cpForm.mypMax || undefined,
            desc: cpForm.desc, tasks: tasksArray, resources: resourcesArray
        };

        try {
            if (cpForm.id) {
                await updateMasterTask(cpForm.id, cpData);
            } else {
                await addMasterTask(cpData as Checkpoint); // It will generate the orderIndex inside db.js
            }
            // Reset form and reload
            setCpForm({ id: '', title: '', subtitle: '', color: '', mypMin: '', mypMax: '', desc: '', tasksStr: '', resourcesStr: '' });
            loadCheckpoints();
        } catch (e: any) {
            alert("Error saving checkpoint: " + e.message);
        }
    };

    const handleDeleteCp = async (id: string, title: string) => {
        if (window.confirm(`Delete checkpoint "${title}"?`)) {
            await deleteMasterTask(id);
            loadCheckpoints();
        }
    };

    return (
        <div id="admin-dashboard" className="dashboard-panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Teacher Control Panel</h2>
                <button id="close-admin" onClick={onClose}>Close</button>
            </div>
            
            <div className="admin-grid">
                {/* --- TEAM SECTION --- */}
                <div className="admin-section">
                    <h3>Create New Team</h3>
                    <div className="input-group">
                        <input 
                            type="text" 
                            placeholder="Team Name (e.g., Team Alpha)"
                            value={newTeamName}
                            onChange={e => setNewTeamName(e.target.value)}
                        />
                        <button id="create-team-btn" onClick={handleCreateTeam}>Create</button>
                    </div>
                    <h3>Existing Teams</h3>
                    <ul id="admin-team-list" className="interactive-list">
                        {teams.map(team => (
                            <li 
                                key={team.id} 
                                className={selectedTeam?.id === team.id ? 'selected' : ''}
                                onClick={() => setSelectedTeam(team)}
                            >
                                {team.name}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="admin-section" id="team-detail-panel">
                    <h3>Manage Members</h3>
                    {!selectedTeam ? (
                        <p className="hint">Select a team on the left to add students.</p>
                    ) : (
                        <div id="member-management-area">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '20px' }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selectedTeam.name}</span>
                                <button className="btn-danger" onClick={() => handleDeleteTeam(selectedTeam)}>Delete Team</button>
                            </div>
                            <div className="input-group">
                                <input 
                                    type="email" 
                                    placeholder="student@school.edu"
                                    value={newStudentEmail}
                                    onChange={e => setNewStudentEmail(e.target.value)}
                                />
                                <button id="add-student-btn" onClick={handleAddStudent}>Add Student</button>
                            </div>
                            <ul id="team-member-list" className="interactive-list">
                                {members.length === 0 ? <li>No members yet.</li> : members.map(member => (
                                    <li key={member.uid}>
                                        <span>{member.email}</span>
                                        <button className="remove-member-btn" onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveStudent(member);
                                        }}>Remove</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* --- CHECKPOINT SECTION --- */}
                <div className="admin-section" style={{ gridColumn: '1 / -1' }}>
                    <h3>Manage Checkpoints</h3>
                    <ul id="admin-checkpoint-list" className="interactive-list" style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '15px' }}>
                        {checkpoints.map((task, index) => (
                            <li key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <button disabled={index === 0} onClick={() => moveTask(index, -1)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '4px', padding: '2px 6px', cursor: index === 0 ? 'not-allowed' : 'pointer', fontSize: '0.7rem', opacity: index === 0 ? 0.3 : 1 }}>▲</button>
                                        <button disabled={index === checkpoints.length - 1} onClick={() => moveTask(index, 1)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '4px', padding: '2px 6px', cursor: index === checkpoints.length - 1 ? 'not-allowed' : 'pointer', fontSize: '0.7rem', opacity: index === checkpoints.length - 1 ? 0.3 : 1 }}>▼</button>
                                    </div>
                                    <span><strong style={{ color: task.color }}>{task.title}</strong> - {task.subtitle}</span>
                                </div>
                                <div>
                                    <button onClick={() => handleEditCp(task)} style={{ background: '#eef2ff', color: '#4f46e5', border: 'none', padding: '4px 8px', borderRadius: '4px', marginRight: '5px', cursor: 'pointer' }}>Edit</button>
                                    <button onClick={() => handleDeleteCp(task.id, task.title)} style={{ background: '#fab1a0', color: '#d63031', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    
                    <div id="checkpoint-form-area" style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                        <h4>{cpForm.id ? "Edit Checkpoint" : "Create New Checkpoint"}</h4>
                        
                        <div className="form-group" style={{ marginBottom: '10px' }}>
                            <label>Title</label>
                            <input type="text" placeholder="e.g., Checkpoint 1" value={cpForm.title} onChange={e => setCpForm({...cpForm, title: e.target.value})} />
                        </div>
                        <div className="form-group" style={{ marginBottom: '10px' }}>
                            <label>Subtitle (Category)</label>
                            <input type="text" placeholder="e.g., Planning" value={cpForm.subtitle} onChange={e => setCpForm({...cpForm, subtitle: e.target.value})} />
                        </div>
                        <div className="form-group" style={{ marginBottom: '10px' }}>
                            <label>Color (Hex)</label>
                            <input type="text" placeholder="e.g., #00b894" value={cpForm.color} onChange={e => setCpForm({...cpForm, color: e.target.value})} />
                        </div>
                        <div className="form-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>MYP Min Level</label>
                                <input type="number" min="1" max="8" value={cpForm.mypMin} onChange={e => setCpForm({...cpForm, mypMin: e.target.value})} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>MYP Max Level</label>
                                <input type="number" min="1" max="8" value={cpForm.mypMax} onChange={e => setCpForm({...cpForm, mypMax: e.target.value})} />
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: '10px' }}>
                            <label>Description</label>
                            <input type="text" placeholder="Brief description..." value={cpForm.desc} onChange={e => setCpForm({...cpForm, desc: e.target.value})} />
                        </div>
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label>Sub-tasks (Comma separated)</label>
                            <textarea rows={3} placeholder="Task 1, Task 2, Task 3..." style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} value={cpForm.tasksStr} onChange={e => setCpForm({...cpForm, tasksStr: e.target.value})}></textarea>
                        </div>
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label>Resources (One per line, format: Label :: URL)</label>
                            <textarea rows={3} placeholder="VEX Build Guide :: https://education.vex.com/..." style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} value={cpForm.resourcesStr} onChange={e => setCpForm({...cpForm, resourcesStr: e.target.value})}></textarea>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn-primary" onClick={handleSaveCp}>{cpForm.id ? "Update Checkpoint" : "Save Checkpoint"}</button>
                            {cpForm.id && (
                                <button className="btn-danger" onClick={() => setCpForm({ id: '', title: '', subtitle: '', color: '', mypMin: '', mypMax: '', desc: '', tasksStr: '', resourcesStr: '' })}>Cancel</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}