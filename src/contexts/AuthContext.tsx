import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, provider } from '../services/firebase-config';
import { syncUser } from '../services/db';
import { type UserProfile } from '../types'; // The types we just defined!

// 1. Define what data and functions our context will provide to the app
interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
}

// 2. Create the actual context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Create the Provider component that wraps our app
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // This mirrors your existing onAuthStateChanged logic
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Sync user to DB and get their specific app role/teamInfo
                    const dbUserData = await syncUser(firebaseUser);
                    
                    // Construct our typed UserProfile object
                    const fullProfile: UserProfile = {
                        uid: firebaseUser.uid,
                        displayName: firebaseUser.displayName,
                        email: firebaseUser.email,
                        photoURL: firebaseUser.photoURL,
                        role: dbUserData.role || 'student', // Default to student if missing
                        teamId: dbUserData.teamId || null   // Default to null if missing
                    };
                    
                    setUser(fullProfile);
                } catch (error) {
                    console.error("Error syncing user data:", error);
                    setUser(null);
                }
            } else {
                // User is signed out
                setUser(null);
            }
            
            // We've finished checking the auth state
            setLoading(false);
        });

        // Cleanup the listener when the app unmounts
        return () => unsubscribe();
    }, []);

    // Provide the Google Login trigger
    const login = async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error: any) {
            alert(error.message);
        }
    };

    // Provide the Logout trigger
    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error: any) {
            alert(error.message);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {/* If Firebase is still verifying the login token, we hide the app to prevent flickering */}
            {!loading && children}
        </AuthContext.Provider>
    );
}

// 4. Create a custom hook so components can easily access the context
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}