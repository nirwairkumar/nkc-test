// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

type AuthContextType = { session: Session | null; user: User | null; loading: boolean; isAdmin: boolean };
const AuthContext = createContext<AuthContextType>({ session: null, user: null, loading: true, isAdmin: false });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdminStatus = async (email: string | undefined) => {
            if (!email) {
                setIsAdmin(false);
                return;
            }
            try {
                const { data } = await supabase
                    .from('admins')
                    .select('email')
                    .eq('email', email)
                    .single();
                setIsAdmin(!!data);
            } catch (error) {
                console.error('Error checking admin status:', error);
                setIsAdmin(false);
            }
        };

        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session ?? null);
            setUser(data.session?.user ?? null);
            checkAdminStatus(data.session?.user?.email);
            setLoading(false);
        });

        const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession ?? null);
            setUser(newSession?.user ?? null);
            checkAdminStatus(newSession?.user?.email);
        });

        return () => sub.subscription.unsubscribe();
    }, []);

    return <AuthContext.Provider value={{ session, user, loading, isAdmin }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
