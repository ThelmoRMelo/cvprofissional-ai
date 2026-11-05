import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsStore } from '@/store/settingsStore';
import { useTemplateStore } from '@/store/templateStore';

const ADMIN_CACHE_KEY = 'cv-admin-verified-user';

export function useAdminAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminExists, setAdminExists] = useState(true);
  // Re-verify only when the signed-in USER changes. Token refreshes / SIGNED_IN events
  // fired when the app regains focus (e.g. returning from the mobile file picker) must
  // not trigger a loading state, otherwise the whole panel unmounts and open dialogs are lost.
  const verifiedUserId = useRef<string | null>(null);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (!data.session) setLoading(false); });
    supabase.rpc('admin_exists').then(({ data, error }) => { if (!error) setAdminExists(Boolean(data)); });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) { verifiedUserId.current = null; setIsAdmin(false); setLoading(false); return; }
    if (verifiedUserId.current === userId) return;
    verifiedUserId.current = userId;
    setLoading(true);
    setTimeout(async () => {
      const { data, error } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
      if (error) {
        // Offline / network failure: trust the last verified result for this user.
        setIsAdmin(localStorage.getItem(ADMIN_CACHE_KEY) === userId);
        setLoading(false);
        return;
      }
      if (data) localStorage.setItem(ADMIN_CACHE_KEY, userId); else localStorage.removeItem(ADMIN_CACHE_KEY);
      setIsAdmin(Boolean(data));
      setLoading(false);
      if (data) {
        await useTemplateStore.getState().loadFromCloud(true);
        await useSettingsStore.getState().loadFromCloud();
      }
    }, 0);
  }, [userId]);

  return { session, isAdmin, loading, adminExists };
}
