'use client';

import {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {SupabaseClient, Session, User} from '@supabase/supabase-js';
import {usePathname, useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase';

interface SupabaseContextType {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider = ({children}: {children: React.ReactNode}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({data: {session}}) => {
        setSession(session);
        setUser(session?.user || null);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    const {data: authListener} = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user || null);
      setLoading(false);

      // Optional: Redirect based on auth state
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // console.log("User signed in or token refreshed");
        // router.push("/dashboard"); // Example redirect
      } else if (event === 'SIGNED_OUT') {
        // console.log("User signed out");
        router.push('/'); // Example redirect
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname]);

  return (
    <SupabaseContext.Provider value={{supabase, session, user, loading}}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};