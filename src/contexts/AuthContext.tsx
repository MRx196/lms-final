import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { recordAuditEvent } from '@/services/auditService';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { ROUTES } from '@/constants/navigation';

export interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'student' | 'instructor' | 'admin' | 'super_admin' | string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<UserProfile>;
  signInWithDemo: (email: string, password: string, role: 'admin' | 'student') => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as unknown as UserProfile | null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const p = await fetchProfile(user.id);
    setProfile(p);
  }, [user]);

  useEffect(() => {
    let mounted = true;
    let profileRequest = 0;

    const syncSession = async (u: User | null, event?: string) => {
      const request = ++profileRequest;
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
        setInitialized(true);
        return;
      }

      setLoading(true);
      const p = await fetchProfile(u.id);
      if (!mounted || request !== profileRequest) return;
      setProfile(p);
      setLoading(false);
      setInitialized(true);

      if (event === 'SIGNED_IN' && p && (p.role === 'admin' || p.role === 'super_admin')) {
        void recordAuditEvent({
          action: 'login',
          entityType: 'auth_session',
          entityId: u.id,
          severity: 'warning',
          meta: { event, email: p.email ?? u.email ?? null, role: p.role },
        }).catch(() => undefined);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      void syncSession(session?.user ?? null);
    }).catch(() => {
      void syncSession(null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      queueMicrotask(() => {
        if (mounted) void syncSession(session?.user ?? null, event);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<UserProfile> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      throw error;
    }
    const p = data.user ? await fetchProfile(data.user.id) : null;
    if (!data.user || !p || p.status !== 'active') {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      throw new Error('This account is not active or does not have a valid profile.');
    }
    setUser(data.user);
    setProfile(p);
    return p;
  }, []);

  const signInWithDemo = useCallback(async (email: string, password: string, role: 'admin' | 'student') => {
    if (!import.meta.env.DEV) {
      throw new Error('Demo sign-in is available only in development.');
    }

    const p = await signIn(email, password);
    const hasRequestedRole = role === 'admin'
      ? p.role === 'admin' || p.role === 'super_admin'
      : p.role === 'student';
    if (!hasRequestedRole) {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      throw new Error('The demo account does not have the requested role.');
    };
  }, [signIn]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      toast.error(error.message);
      throw error;
    }
    // The database trigger creates the profile and assigns the student role.
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      throw error;
    }
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, initialized, signIn, signInWithDemo, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}