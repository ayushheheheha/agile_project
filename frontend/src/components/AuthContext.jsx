import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null);
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    // Load initial session from localStorage / Supabase
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session || null);
      if (data?.session?.access_token) {
        localStorage.setItem('hs_access_token', data.session.access_token);
      }
      setLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.access_token) {
        localStorage.setItem('hs_access_token', newSession.access_token);
      } else if (!newSession) {
        localStorage.removeItem('hs_access_token');
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
    localStorage.removeItem('hs_access_token');
    sessionStorage.removeItem('hs_profile');
    supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  /**
   * After backend signup/login returns a session, manually set it in Supabase client and localStorage.
   */
  async function setSessionFromBackend(sessionData, profileData) {
    if (sessionData?.access_token) {
      localStorage.setItem('hs_access_token', sessionData.access_token);
    }
    try {
      await supabase.auth.setSession({
        access_token:  sessionData.access_token,
        refresh_token: sessionData.refresh_token,
      });
    } catch (e) {
      console.warn('[setSessionFromBackend] supabase setSession notice:', e);
    }
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
