// ==========================================
// USER & TEAM TYPES
// ==========================================

export interface UserProfile {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
    role: 'student' | 'teacher'; // Restricting to known roles
    teamId: string | null;       // null if not assigned to a team
}

export interface TeamMember {
    uid: string;
    email: string;
}

export interface Team {
    id: string;
    name: string;
    members: TeamMember[]; // Array of member objects for easy mapping
}

// ==========================================
// CHECKPOINT (MASTER TASK) TYPES
// ==========================================

export interface Resource {
    label: string;
    url: string;
}

export interface Checkpoint {
    id: string;
    title: string;
    subtitle: string;
    desc: string;
    color: string;
    mypMin?: number | string; // Optional, as not all tasks have MYP levels
    mypMax?: number | string; 
    tasks: string[];          // The granular sub-tasks (e.g., "Build chassis frame")
    resources: Resource[];    // Link and label pairs
    orderIndex: number;       // To maintain sorting
}

// ==========================================
// PROGRESS & ASSIGNMENT TYPES
// ==========================================

export type TaskStatus = 'Not Started' | 'In Progress' | 'Blocked' | 'Completed'; // Enforcing strict status values

export interface TaskProgress {
    teamId: string;
    taskId: string;
    dueDate: string | null;   // Stored as a date string (YYYY-MM-DD)
    status: TaskStatus;
    
    // We use TypeScript 'Records' (dictionaries) here for scalability.
    // This allows dynamic sub-tasks and roles without hardcoding the keys.
    taskAssignments: Record<string, string[]>; // e.g., { "Build chassis frame": ["user1_uid", "user2_uid"] }
    taskCompletions: Record<string, boolean>;  // e.g., { "Build chassis frame": true }
    roles: Record<string, string>;             // e.g., { "leadBuilder": "user_uid" }
    
    lastUpdated?: any; // You can type this as Firebase Firestore Timestamp later if needed
}