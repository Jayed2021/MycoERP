import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, fullName: string, role: string, department: string) => Promise<string | null>;
  signInDemo: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setUser(data ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (session?.user) {
          await fetchProfile(session.user.id);
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
          setIsDemo(profile?.role === 'demo');
        } else {
          setUser(null);
          setIsDemo(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  }

  async function signInDemo(): Promise<string | null> {
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/demo-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.email) {
        return data?.error ?? 'Demo sign-in failed. Please try again.';
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) return error.message;
      setIsDemo(true);
      return null;
    } catch {
      return 'Network error. Please try again.';
    }
  }

  async function signUp(email: string, password: string, fullName: string, role: string, department: string): Promise<string | null> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;
    if (!data.user) return 'Signup failed';

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: fullName,
      role,
      department: department || null,
    });
    if (profileError) return profileError.message;
    await fetchProfile(data.user.id);
    return null;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setIsDemo(false);
  }

  return (
    <AuthContext.Provider value={{ user, loading, isDemo, signIn, signUp, signInDemo, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
