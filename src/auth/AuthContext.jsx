import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { api, setUnauthorizedHandler } from '../lib/api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  // status: loading | anon | ready | error
  const [state, setState] = useState({ status: 'loading', profile: null, email: null, message: null });
  const userIdRef = useRef(null);

  const loadProfile = useCallback(async (session) => {
    try {
      const { data } = await api('/api/me');
      setState({ status: 'ready', profile: data, email: session.user.email, message: null });
    } catch (e) {
      if (e.status === 401 || e.status === 403) {          // no profile / disabled / expired
        userIdRef.current = null;
        await supabase.auth.signOut();
        setState({ status: 'anon', profile: null, email: null, message: e.message });
      } else {
        setState({ status: 'error', profile: null, email: null, message: e.message });
      }
    }
  }, []);

  useEffect(() => {
    const handle = (session) => {
      if (!session) { userIdRef.current = null; setState((s) => ({ status: 'anon', profile: null, email: null, message: s.message })); return; }
      if (userIdRef.current === session.user.id) return;    // token refresh: nothing to reload
      userIdRef.current = session.user.id;
      setState((s) => ({ ...s, status: 'loading', message: null }));
      loadProfile(session);
    };
    supabase.auth.getSession().then(({ data }) => handle(data.session));
    // Deferred: calling supabase methods synchronously inside this callback can deadlock the client.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => { setTimeout(() => handle(session), 0); });
    setUnauthorizedHandler(() => { supabase.auth.signOut(); });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const login = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    // Deliberately vague: do not reveal whether the email exists.
    if (error) throw new Error(error.status === 429 ? 'Too many attempts. Please wait a few minutes and try again.' : 'Incorrect email or password.');
  }, []);
  const logout = useCallback(async () => { await supabase.auth.signOut(); }, []);
  const retry = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    userIdRef.current = null;
    if (data.session) { setState((s) => ({ ...s, status: 'loading' })); userIdRef.current = data.session.user.id; loadProfile(data.session); }
  }, [loadProfile]);

  return <Ctx.Provider value={{ ...state, login, logout, retry, isOwner: state.profile?.role === 'owner' }}>{children}</Ctx.Provider>;
}
