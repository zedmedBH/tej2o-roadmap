import type { Checkpoint, TaskProgress } from '../types';

interface TimelineItemProps {
    task: Checkpoint;
    index: number;
    progress?: TaskProgress;
    onClick: () => void;
}

export function TimelineItem({ task, index, progress, onClick }: TimelineItemProps) {
    const status = progress?.status || 'Not Started';
    // Remove spaces for the CSS class (e.g., 'In Progress' -> 'InProgress')
    const statusClass = status.replace(/\s+/g, ''); 

    // Determine if we need to show the MYP badge
    let mypBadgeHtml = null;
    if (task.mypMin && task.mypMax) {
        mypBadgeHtml = <div className="myp-badge">MYP {task.mypMin}-{task.mypMax}</div>;
    } else if (task.mypMin || task.mypMax) {
        mypBadgeHtml = <div className="myp-badge">MYP {task.mypMin || task.mypMax}</div>;
    }

    return (
        <div className="timeline-item">
            <div 
                className="timeline-marker" 
                style={{ borderColor: task.color, color: task.color }}
            >
                {index + 1}
            </div>
            
            <div className="timeline-card" onClick={onClick}>
                <div 
                    className="card-header-strip" 
                    style={{ backgroundColor: task.color }}
                ></div>
                
                <div className="card-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span 
                            className="card-subtitle" 
                            style={{ backgroundColor: task.color }}
                        >
                            {task.subtitle}
                        </span>
                        
                        {progress?.status && (
                            <span className={`status-badge status-${statusClass}`}>
                                {status}
                            </span>
                        )}
                    </div>
                    
                    <h3 className="card-title">{task.title}</h3>
                    <p className="card-desc" style={{ marginBottom: '25px' }}>{task.desc}</p> 
                    
                    {progress?.dueDate && (
                        <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#666' }}>
                            📅 Due: {progress.dueDate}
                        </div>
                    )}
                    
                    {mypBadgeHtml}
                </div>
            </div>
        </div>
    );
}