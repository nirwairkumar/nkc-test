// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

type AuthContextType = { session: Session | null; user: User | null; loading: boolean };
const AuthContext = createContext<AuthContextType>({ session: null, user: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session ?? null);
            setUser(data.session?.user ?? null);
            setLoading(false);
        });

        const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession ?? null);
            setUser(newSession?.user ?? null);
        });

        return () => sub.subscription.unsubscribe();
    }, []);

    return <AuthContext.Provider value={{ session, user, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
