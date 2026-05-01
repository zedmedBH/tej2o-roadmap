// src/services/db.ts
import { db } from './firebase-config';
import { 
    collection, doc, getDoc, getDocs, setDoc, addDoc, 
    query, where, updateDoc, arrayUnion, arrayRemove, deleteDoc
} from "firebase/firestore";
// Import the Firebase User type for our auth sync function
import type { User } from "firebase/auth";
// Import our custom types
import type { Checkpoint, Team, TeamMember, TaskProgress, UserProfile } from '../types';

// --- TASKS (Checkpoints) ---

export async function getMasterTasks(): Promise<Checkpoint[]> {
    const q = query(collection(db, "masterTasks")); 
    const snapshot = await getDocs(q);
    const tasks: Checkpoint[] = [];
    
    snapshot.forEach(doc => {
        // We use "as Checkpoint" to tell TypeScript this raw data matches our interface
        tasks.push({ id: doc.id, ...doc.data() } as Checkpoint);
    });
    
    return tasks.sort((a, b) => a.orderIndex - b.orderIndex);
}

// Seed the DB if empty (run this once)
export async function seedMasterTasks(checkpointsData: Partial<Checkpoint>[]): Promise<void> {
    const snapshot = await getDocs(collection(db, "masterTasks"));
    if (snapshot.empty) {
        console.log("Seeding Database...");
        checkpointsData.forEach(async (task, index) => {
            await addDoc(collection(db, "masterTasks"), { ...task, orderIndex: index });
        });
    }
}

// --- TEAMS & USERS ---

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
}

// Create/Update basic user record on login
export async function syncUser(user: User): Promise<Partial<UserProfile>> {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    
    if (!snap.exists()) {
        const newUser: Partial<UserProfile> = {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            role: 'student', // default
            teamId: null
        };
        await setDoc(userRef, newUser);
        return newUser;
    }
    return snap.data() as Partial<UserProfile>;
}

// Admin: Create Team
export async function createTeam(teamName: string): Promise<string> {
    const docRef = await addDoc(collection(db, "teams"), {
        name: teamName,
        members: [] 
    });
    return docRef.id;
}

// Admin: Get All Teams
export async function getAllTeams(): Promise<Team[]> {
    const snap = await getDocs(collection(db, "teams"));
    const teams: Team[] = [];
    snap.forEach(doc => teams.push({ id: doc.id, ...doc.data() } as Team));
    return teams;
}

// Admin: Add Student to Team by Email
export async function addStudentToTeam(teamId: string, studentEmail: string): Promise<void> {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", studentEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        throw new Error("Student must log in at least once before being added.");
    }

    let uid = "";
    querySnapshot.forEach(doc => { uid = doc.id; });

    await updateDoc(doc(db, "users", uid), { teamId: teamId });

    await updateDoc(doc(db, "teams", teamId), {
        members: arrayUnion({ email: studentEmail, uid: uid })
    });
}

// Get Team Members 
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const teamRef = doc(db, "teams", teamId);
    const snap = await getDoc(teamRef);
    return snap.exists() ? (snap.data().members as TeamMember[]) : [];
}

// --- PROGRESS TRACKING ---

// Save Progress 
export async function saveTaskProgress(teamId: string, taskId: string, data: Partial<TaskProgress>): Promise<void> {
    const docId = `${teamId}_${taskId}`;
    await setDoc(doc(db, "teamProgress", docId), {
        teamId,
        taskId,
        ...data,
        lastUpdated: new Date()
    }, { merge: true });
}

// Get Team's Progress
export async function getTeamProgress(teamId: string): Promise<Record<string, TaskProgress>> {
    const q = query(collection(db, "teamProgress"), where("teamId", "==", teamId));
    const snapshot = await getDocs(q);
    const progress: Record<string, TaskProgress> = {};
    
    snapshot.forEach(doc => {
        const data = doc.data() as TaskProgress;
        progress[data.taskId] = data;
    });
    return progress;
}

export async function removeStudentFromTeam(teamId: string, memberObject: TeamMember): Promise<void> {
    const teamRef = doc(db, "teams", teamId);
    await updateDoc(teamRef, {
        members: arrayRemove(memberObject)
    });

    const userRef = doc(db, "users", memberObject.uid);
    await updateDoc(userRef, {
        teamId: null
    });
}

export async function deleteTeam(teamId: string): Promise<void> {
    const members = await getTeamMembers(teamId);

    const unassignPromises = members.map(m => {
        const userRef = doc(db, "users", m.uid);
        return updateDoc(userRef, { teamId: null });
    });
    await Promise.all(unassignPromises);

    await deleteDoc(doc(db, "teams", teamId));
}

// Admin: Checkpoint Management
export async function addMasterTask(taskData: Partial<Checkpoint>): Promise<string> {
    const tasks = await getMasterTasks();
    const newIndex = tasks.length > 0 ? Math.max(...tasks.map(t => t.orderIndex || 0)) + 1 : 0;
    
    const docRef = await addDoc(collection(db, "masterTasks"), { 
        ...taskData, 
        orderIndex: newIndex 
    });
    return docRef.id;
}

export async function updateMasterTask(taskId: string, taskData: Partial<Checkpoint>): Promise<void> {
    const taskRef = doc(db, "masterTasks", taskId);
    await updateDoc(taskRef, taskData);
}

export async function deleteMasterTask(taskId: string): Promise<void> {
    await deleteDoc(doc(db, "masterTasks", taskId));
}

export async function updateCheckpointOrder(tasksArray: Checkpoint[]): Promise<void> {
    const updatePromises = tasksArray.map((task, index) => {
        const taskRef = doc(db, "masterTasks", task.id);
        return updateDoc(taskRef, { orderIndex: index });
    });
    
    await Promise.all(updatePromises);
}