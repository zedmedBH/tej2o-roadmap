import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { NavBar } from './components/NavBar';
import { Timeline } from './components/Timeline';
import { TaskModal } from './components/TaskModal';
import { AdminDashboard } from './components/AdminDashboard';
import { type Checkpoint } from './types';

function App() {
  const { user, login } = useAuth();
  
  // App-level state
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [viewingTeamId, setViewingTeamId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Checkpoint | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // If there is no user, render the Login Overlay
  if (!user) {
    return (
      <div id="login-overlay">
        <div className="login-card">
          <h1>VEX Team Hub</h1>
          <p>Sign in to access your team's roadmap.</p>
          <button id="google-login-btn" onClick={login}>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Determine which team's data the app should actually display (Declared ONLY ONCE)
  const activeAppTeamId = user.role === 'student' ? user.teamId : viewingTeamId;

  return (
    <>
      <NavBar 
        onOpenAdmin={() => setIsAdminOpen(true)}
        viewingTeamId={viewingTeamId}
        onViewTeamChange={setViewingTeamId}
      />

      {/* Conditionally render the Admin Dashboard */}
      {isAdminOpen && (
        <AdminDashboard onClose={() => setIsAdminOpen(false)} />
      )}

      {/* Main App Content */}
      <header className="main-header" style={{ marginTop: '60px' }}>
        <div className="header-content">
          <h1>VEX Build Roadmap</h1>
          <p>Track progress, assign tasks, and manage your deadline.</p>
        </div>
      </header>

      <Timeline 
        key={refreshTrigger}
        activeTeamId={activeAppTeamId} 
        onTaskClick={(task) => setSelectedTask(task)} 
      />
      
      {selectedTask && (
        <TaskModal 
            task={selectedTask}
            teamId={activeAppTeamId}
            onClose={() => setSelectedTask(null)}
            onSaveSuccess={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}
    </>
  );
}

export default App;