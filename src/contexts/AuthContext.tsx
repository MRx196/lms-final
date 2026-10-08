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
  role: 'student' | 'admin' | string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
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

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id).then((p) => {
          if (mounted) setProfile(p);
        });
      }
      setLoading(false);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id).then((p) => {
          if (mounted) setProfile(p);
          // Phase 18: record login events for privilege-sensitive roles in the audit trail.
          if (p && (p.role === 'admin' || p.role === 'super_admin')) {
            void recordAuditEvent({
              action: 'login',
              entityType: 'auth_session',
              entityId: u.id,
              severity: 'warning',
              meta: { event: event, email: p.email ?? u.email ?? null, role: p.role },
            }).catch(() => undefined);
          }
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
      setInitialized(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      throw error;
    }
  }, []);

  // Resilient demo login: sign in, and if the account is missing, auto-provision
  // it (auth user + profiles row with the requested role) so evaluators get a
  // one-click entry into both the admin and student experiences.
  const signInWithDemo = useCallback(async (email: string, password: string, role: 'admin' | 'student') => {
    const fullName = role === 'admin' ? 'Demo Administrator' : 'Demo Student';

    const provisionProfile = async (userId: string) => {
      try {
        await supabase.from('profiles').upsert(
          {
            user_id: userId,
            email,
            full_name: fullName,
            username: email.split('@')[0],
            role,
            status: 'active',
          },
          { onConflict: 'user_id' },
        );
      } catch {
        // profiles table may be absent or RLS-restricted; the auth session is still valid.
      }
    };

    let { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const signUpRes = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (signUpRes.error) {
        toast.error(signUpRes.error.message);
        throw signUpRes.error;
      }
      const uid = signUpRes.data.user?.id;
      if (uid) await provisionProfile(uid);

      if (!signUpRes.data.session) {
        // Email confirmation required: retry the password sign-in.
        const retry = await supabase.auth.signInWithPassword({ email, password });
        if (retry.error) {
          toast.error(retry.error.message);
          throw retry.error;
        }
        if (retry.data.user) await provisionProfile(retry.data.user.id);
        data = retry.data;
      } else {
        data = signUpRes.data;
      }
    } else if (data.user) {
      await provisionProfile(data.user.id);
    }

    if (data.user) {
      const p = await fetchProfile(data.user.id);
      setProfile(p);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      toast.error(error.message);
      throw error;
    }
    // Attempt to create profile record
    if (data.user) {
      try {
        await supabase.from('profiles').insert({
          user_id: data.user.id,
          email,
          full_name: fullName,
          username: email.split('@')[0],
          role: 'student' as any,
          status: 'active' as any,
        });
      } catch {
        // Profile table might not exist yet; that's ok
      }
    }
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