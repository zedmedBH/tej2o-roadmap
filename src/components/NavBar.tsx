import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllTeams } from '../services/db';
import { type Team } from '../types';

interface NavBarProps {
    onOpenAdmin: () => void;
    viewingTeamId: string | null;
    onViewTeamChange: (teamId: string | null) => void;
}

export function NavBar({ onOpenAdmin, viewingTeamId, onViewTeamChange }: NavBarProps) {
    const { user, logout } = useAuth();
    
    // Local state for the mobile hamburger menu
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    // Local state to store the list of teams for the teacher dropdown
    const [teams, setTeams] = useState<Team[]>([]);

    const isTeacher = user?.role === 'teacher';

    // If the user is a teacher, fetch the teams for the dropdown
    useEffect(() => {
        if (isTeacher) {
            const fetchTeams = async () => {
                try {
                    const fetchedTeams = await getAllTeams();
                    setTeams(fetchedTeams);
                } catch (error) {
                    console.error("Failed to load teams:", error);
                }
            };
            fetchTeams();
        }
    }, [isTeacher]);

    // --- BADGE LOGIC ---
    // Replicating your logic from app.js to determine text and color
    let badgeText = "No Team Assigned";
    let badgeColor = "#6c5ce7"; // Default Purple

    if (isTeacher) {
        if (viewingTeamId) {
            const viewedTeam = teams.find(t => t.id === viewingTeamId);
            badgeText = viewedTeam ? `Viewing: ${viewedTeam.name}` : "Viewing Team";
            badgeColor = "#ff9f43"; // Orange for spectator mode
        } else {
            badgeText = "Teacher";
            badgeColor = "#2d3436"; // Dark Grey for default teacher state
        }
    } else if (user?.teamId) {
        badgeText = "Team Active";
        badgeColor = "#6c5ce7"; // Purple for active student
    }

    // --- EVENT HANDLERS ---
    const handleMenuToggle = () => setIsMenuOpen(!isMenuOpen);
    
    const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        onViewTeamChange(selectedId === "" ? null : selectedId);
        setIsMenuOpen(false); // Close mobile menu on selection
    };

    if (!user) return null;

    return (
        <nav className="app-nav">
            <div className="user-info">
                <img id="nav-user-photo" src={user.photoURL || ''} alt="User" />
                <div>
                    <span id="nav-user-name">{user.displayName}</span>
                    <span 
                        id="nav-team-name" 
                        className="badge" 
                        style={{ backgroundColor: badgeColor }}
                    >
                        {badgeText}
                    </span>
                </div>
            </div>

            {/* Mobile Menu Button */}
            <button 
                id="mobile-menu-toggle" 
                className={`mobile-menu-btn ${isMenuOpen ? 'open' : ''}`}
                onClick={handleMenuToggle}
            >
                <span></span>
                <span></span>
                <span></span>
            </button>
            
            <div className={`nav-controls ${isMenuOpen ? 'active' : ''}`} id="nav-controls">
                {/* Conditionally render Teacher Controls */}
                {isTeacher && (
                    <>
                        <select 
                            id="view-team-select" 
                            className="nav-dropdown"
                            value={viewingTeamId || ""}
                            onChange={handleDropdownChange}
                        >
                            <option value="">-- Viewer: My View --</option>
                            {teams.map(team => (
                                <option key={team.id} value={team.id}>
                                    View: {team.name}
                                </option>
                            ))}
                        </select>

                        <button id="admin-btn" onClick={() => {
                            onOpenAdmin();
                            setIsMenuOpen(false);
                        }}>
                            Teacher Admin
                        </button>
                    </>
                )}
                
                <button id="logout-btn" onClick={logout}>Sign Out</button>
            </div>
        </nav>
    );
}