import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types';
import type { Session } from '@supabase/supabase-js';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, phone: string, role: UserRole, address?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }
    setProfile(data as Profile | null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        // Supabase re-validates the session (and fires this event) whenever
        // the tab regains focus. Skip re-fetching the profile for that case
        // so switching tabs doesn't retrigger every dashboard's data fetch.
        if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return;
        (async () => {
          await fetchProfile(session.user.id);
        })();
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string, role: UserRole, address?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone, role },
      },
    });
    if (error) return { error: error.message };
    if (data.user) {
      // Wait briefly for the DB trigger to create the profile row
      await new Promise((r) => setTimeout(r, 500));
      await fetchProfile(data.user.id);

      // Look up an existing municipality/ward to assign the new account to.
      // The system currently only has one of each; this stays correct if
      // more are added later since it doesn't hardcode an id.
      const { data: ward } = await supabase
        .from('wards')
        .select('id, municipality_id')
        .limit(1)
        .maybeSingle();

      if (role === 'household') {
        const { error: hErr } = await supabase.from('households').insert({
          profile_id: data.user.id,
          address_line: address || 'Address not provided',
          waste_type: 'both',
          ward_id: ward?.id ?? null,
        });
        if (hErr) console.error('Failed to create household record:', hErr);
      } else if (role === 'worker') {
        if (!ward) {
          console.error('Cannot create worker record: no municipality/ward exists yet.');
        } else {
          const { error: wErr } = await supabase.from('workers').insert({
            profile_id: data.user.id,
            municipality_id: ward.municipality_id,
            assigned_ward_id: ward.id,
          });
          if (wErr) console.error('Failed to create worker record:', wErr);
        }
      }
      // Supervisors need no extra table — profiles.role is sufficient.
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
