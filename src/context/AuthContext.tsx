import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, initSupabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import type { ApiUser } from '@/lib/api';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: string;
  eventPasses?: number;
  autoUpload?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<{ needsConfirmation: boolean }>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signUpWithEmail: async () => ({ needsConfirmation: false }),
  loginWithEmail: async () => {},
  loginWithGoogle: async () => {},
  forgotPassword: async () => '',
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function mapUser(u: ApiUser): User {
  return {
    uid: u.id,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
    role: u.role,
    eventPasses: u.eventPasses,
    autoUpload: u.autoUpload,
  };
}

function mapSupabaseUser(u: SupabaseUser): User {
  const meta = u.user_metadata ?? {};
  return {
    uid: u.id,
    email: u.email ?? null,
    displayName: meta.full_name || meta.name || meta.display_name || (u.email ? u.email.split('@')[0] ?? null : null),
    photoURL: meta.avatar_url || meta.picture || null,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initSupabase();
      if (cancelled) return;
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        const base = mapSupabaseUser(data.session.user);
        setUser(base);
        try {
          const profile = await api.me();
          if (!cancelled) setUser(mapUser(profile));
        } catch {
          // backend profile unavailable; keep the Supabase-derived user
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const base = mapSupabaseUser(session.user);
        setUser(base);
        try {
          const profile = await api.me();
          setUser(mapUser(profile));
        } catch {
          // keep Supabase-derived user
        }
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw new Error(error.message);
    return { needsConfirmation: !data.session };
  };

  const loginWithEmail = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const loginWithGoogle = async () => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw new Error(error.message);
  };

  const forgotPassword = async (email: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
    return 'Password reset link sent. Check your email.';
  };

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      signUpWithEmail, loginWithEmail, loginWithGoogle,
      forgotPassword, logout,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};