import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Plan } from '@/types/resume';
import { DEFAULT_SITE_SETTINGS, type PlanPaymentConfig, type SiteSettings } from '@/types/settings';
import { fetchSettings, saveSettings } from '@/lib/cloudSync';

interface SettingsState {
  settings: SiteSettings;
  loadFromCloud: () => Promise<void>;
  updateSettings: (data: Partial<SiteSettings>) => void;
  updatePlanConfig: (plan: Plan, config: Partial<PlanPaymentConfig>) => void;
  setAdminPin: (newPin: string) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
const scheduleSave = (settings: SiteSettings) => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { void saveSettings(settings); }, 600);
};

export const useSettingsStore = create<SettingsState>()(persist((set, get) => ({
  settings: DEFAULT_SITE_SETTINGS,
  loadFromCloud: async () => {
    const cloud = await fetchSettings();
    if (cloud) set({ settings: cloud });
  },
  updateSettings: (data) => {
    set((state) => ({ settings: { ...state.settings, ...data, plans: { ...state.settings.plans, ...data.plans } } }));
    scheduleSave(get().settings);
  },
  updatePlanConfig: (plan, config) => {
    set((state) => ({ settings: { ...state.settings, plans: { ...state.settings.plans, [plan]: { ...state.settings.plans[plan], ...config } } } }));
    scheduleSave(get().settings);
  },
  setAdminPin: (newPin) => set((state) => ({ settings: { ...state.settings, adminPin: newPin } })),
}), { name: 'site-settings-storage' }));
