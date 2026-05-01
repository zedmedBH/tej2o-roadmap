import { useState, useEffect } from 'react';
import { getMasterTasks, getTeamProgress } from '../services/db';
import type { Checkpoint, TaskProgress } from '../types';
import { TimelineItem } from './TimelineItem';

interface TimelineProps {
    activeTeamId: string | null;
    onTaskClick: (task: Checkpoint) => void;
}

export function Timeline({ activeTeamId, onTaskClick }: TimelineProps) {
    const [tasks, setTasks] = useState<Checkpoint[]>([]);
    const [teamProgress, setTeamProgress] = useState<Record<string, TaskProgress>>({});
    const [loading, setLoading] = useState(true);

    // 1. Fetch the master tasks once when the component mounts
    useEffect(() => {
        async function fetchTasks() {
            try {
                const fetchedTasks = await getMasterTasks();
                setTasks(fetchedTasks);
            } catch (error) {
                console.error("Error fetching tasks:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchTasks();
    }, []);

    // 2. Fetch the team's progress whenever the activeTeamId changes
    useEffect(() => {
        async function fetchProgress() {
            if (activeTeamId) {
                try {
                    const progressData = await getTeamProgress(activeTeamId);
                    setTeamProgress(progressData);
                } catch (error) {
                    console.error("Error fetching team progress:", error);
                }
            } else {
                // If no team is selected, clear the progress
                setTeamProgress({});
            }
        }
        fetchProgress();
    }, [activeTeamId]);

    if (loading) {
        return <p style={{ textAlign: 'center', marginTop: '40px' }}>Loading tasks...</p>;
    }

    if (tasks.length === 0) {
        return <p style={{ textAlign: 'center', marginTop: '40px' }}>No checkpoints found. Teachers can create them in the Admin Panel.</p>;
    }

    return (
        <main className="timeline-container">
            <div className="timeline-line"></div>
            {tasks.map((task, index) => (
                <TimelineItem 
                    key={task.id} 
                    task={task} 
                    index={index} 
                    progress={teamProgress[task.id]} 
                    onClick={() => onTaskClick(task)} 
                />
            ))}
        </main>
    );
}