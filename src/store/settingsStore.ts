import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Plan } from '@/types/resume';
import { DEFAULT_SITE_SETTINGS, type PlanPaymentConfig, type SiteSettings } from '@/types/settings';

interface SettingsState {
  settings: SiteSettings;
  updateSettings: (data: Partial<SiteSettings>) => void;
  updatePlanConfig: (plan: Plan, config: Partial<PlanPaymentConfig>) => void;
  setAdminPin: (newPin: string) => void;
}

export const useSettingsStore = create<SettingsState>()(persist((set) => ({
  settings: DEFAULT_SITE_SETTINGS,
  updateSettings: (data) => set((state) => ({ settings: { ...state.settings, ...data, plans: { ...state.settings.plans, ...data.plans } } })),
  updatePlanConfig: (plan, config) => set((state) => ({ settings: { ...state.settings, plans: { ...state.settings.plans, [plan]: { ...state.settings.plans[plan], ...config } } } })),
  setAdminPin: (newPin) => set((state) => ({ settings: { ...state.settings, adminPin: newPin } })),
}), { name: 'site-settings-storage' }));
