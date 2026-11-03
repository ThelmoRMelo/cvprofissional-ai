import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsStore } from '@/store/settingsStore';
import { useTemplateStore } from '@/store/templateStore';

export function useAdminAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminExists, setAdminExists] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    supabase.rpc('admin_exists').then(({ data }) => setAdminExists(Boolean(data)));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(false); setLoading(false); return; }
    setLoading(true);
    setTimeout(async () => {
      const { data } = await supabase.rpc('has_role', { _user_id: session.user.id, _role: 'admin' });
      setIsAdmin(Boolean(data));
      setLoading(false);
      if (data) {
        // Admin sees inactive templates too; push local settings if cloud is empty
        await useTemplateStore.getState().loadFromCloud();
        await useSettingsStore.getState().loadFromCloud();
      }
    }, 0);
  }, [session]);

  return { session, isAdmin, loading, adminExists };
}
