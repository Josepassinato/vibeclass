import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface UseAuthReturn {
  user: { id: string; email?: string; fullName?: string; imageUrl?: string } | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; needsConfirmation?: boolean }>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        Sentry.setUser({ id: s.user.id, email: s.user.email });
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        Sentry.setUser({ id: s.user.id, email: s.user.email });
      } else {
        Sentry.setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    Sentry.setUser(null);
    await supabase.auth.signOut();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    // Supabase returns a user with identities=[] when email confirmation is required
    // but the user already exists (or email confirmation is pending)
    const needsConfirmation = !error && data?.user && !data.session;
    return { error: error as Error | null, needsConfirmation };
  }, []);

  const profile: Profile | null = user
    ? {
        id: user.id,
        user_id: user.id,
        full_name: user.user_metadata?.full_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      }
    : null;

  return {
    user: user
      ? {
          id: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name,
          imageUrl: user.user_metadata?.avatar_url,
        }
      : null,
    profile,
    session,
    isLoading,
    isSignedIn: !!session,
    signOut,
    signIn,
    signUp,
  };
}
