import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (!data.session) setLoading(false); });
    supabase.rpc('admin_exists').then(({ data, error }) => { if (!error) setAdminExists(Boolean(data)); });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(false); setLoading(false); return; }
    setLoading(true);
    setTimeout(async () => {
      const userId = session.user.id;
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
  }, [session]);

  return { session, isAdmin, loading, adminExists };
}
