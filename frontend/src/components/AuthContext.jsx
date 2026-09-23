import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null);
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    // Load initial session from localStorage (Supabase persists it)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session || null);
      setLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load profile whenever session changes
  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    // Profile is stored in localStorage alongside session for speed,
    // but falls back to fetching from Supabase if missing.
    const cached = sessionStorage.getItem('hs_profile');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.id === session.user.id) {
          setProfile(parsed);
          return;
        }
      } catch {
        // ignore
      }
    }

    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          sessionStorage.setItem('hs_profile', JSON.stringify(data));
        }
      });
  }, [session]);

  function signOut() {
    sessionStorage.removeItem('hs_profile');
    supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  /**
   * After backend signup returns a session, manually set it in Supabase client.
   */
  async function setSessionFromBackend(sessionData, profileData) {
    await supabase.auth.setSession({
      access_token:  sessionData.access_token,
      refresh_token: sessionData.refresh_token,
    });
    setSession(sessionData);
    setProfile(profileData);
    sessionStorage.setItem('hs_profile', JSON.stringify(profileData));
  }

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      loading,
      signOut,
      setSessionFromBackend,
      user: session?.user || null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
