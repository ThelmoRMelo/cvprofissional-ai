import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Resume, Plan, PaymentStatus, ResumeTemplate } from '@/types/resume';
import { saveResumeClientRpc } from '@/lib/resumeCloud';

interface ResumeState {
  resumes: Resume[];
  currentResume: Resume | null;
  
  // Actions
  createResume: (plan: Plan) => Resume;
  updateResume: (id: string, data: Partial<Resume>) => void;
  setCurrentResume: (resume: Resume | null) => void;
  getResumeById: (id: string) => Resume | undefined;
  updatePaymentStatus: (id: string, status: PaymentStatus, receiptUrl?: string) => void;
  toggleDownloadEnabled: (id: string) => void;
  replaceResumes: (resumes: Resume[]) => void;
  applyRemoteUpdate: (id: string, data: Partial<Resume>) => void;
  setAccessToken: (id: string, accessToken: string) => void;
  syncResumeNow: (id: string) => Promise<string | undefined>;
}

const generateId = () => globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
  const random = Math.random() * 16 | 0;
  return (char === 'x' ? random : (random & 0x3 | 0x8)).toString(16);
});
const syncTimers = new Map<string, ReturnType<typeof setTimeout>>();
const syncInFlight = new Map<string, Promise<string | undefined>>();
const syncAgain = new Set<string>();

const queueCloudSync = (resumeId: string) => {
  const existing = syncTimers.get(resumeId);
  if (existing) clearTimeout(existing);
  syncTimers.set(resumeId, setTimeout(() => {
    syncTimers.delete(resumeId);
    void syncResumeToCloud(resumeId);
  }, 600));
};

const syncResumeToCloud = async (resumeId: string): Promise<string | undefined> => {
  const running = syncInFlight.get(resumeId);
  if (running) { syncAgain.add(resumeId); return running; }
  const operation = (async () => {
    let accessToken: string | undefined;
    try {
      do {
        syncAgain.delete(resumeId);
        const resume = useResumeStore.getState().resumes.find((item) => item.id === resumeId);
        if (!resume) break;
        const savedVersion = new Date(resume.updatedAt).getTime();
        accessToken = await saveResumeClientRpc(resume);
        useResumeStore.getState().setAccessToken(resumeId, accessToken);
        const latest = useResumeStore.getState().resumes.find((item) => item.id === resumeId);
        if (latest && new Date(latest.updatedAt).getTime() > savedVersion) syncAgain.add(resumeId);
      } while (syncAgain.has(resumeId));
    } catch (error) {
      console.warn('Currículo mantido localmente; falha ao sincronizar com a nuvem:', error);
    }
    return accessToken;
  })();
  syncInFlight.set(resumeId, operation);
  try {
    return await operation;
  } finally {
    syncInFlight.delete(resumeId);
    if (syncAgain.delete(resumeId)) queueCloudSync(resumeId);
  }
};

const createEmptyResume = (plan: Plan): Resume => ({
  id: generateId(),
  clientName: '',
  plan,
  template: 'modern',
  paymentStatus: 'pending',
  downloadEnabled: false,
  personalData: {
    fullName: '',
    email: '',
    phone: '',
    address: '',
    linkedin: '',
    objective: '',
  },
  experiences: [],
  education: [],
  skills: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => ({
      resumes: [],
      currentResume: null,

      createResume: (plan: Plan) => {
        const newResume = createEmptyResume(plan);
        set((state) => ({
          resumes: [...state.resumes, newResume],
          currentResume: newResume,
        }));
        queueCloudSync(newResume.id);
        return newResume;
      },

      updateResume: (id: string, data: Partial<Resume>) => {
        const existingResume = get().resumes.find((resume) => resume.id === id);
        const updatedResume = existingResume ? { ...existingResume, ...data, updatedAt: new Date() } : null;
        set((state) => ({
          resumes: state.resumes.map((r) =>
            r.id === id ? { ...r, ...data, updatedAt: new Date() } : r
          ),
          currentResume:
            state.currentResume?.id === id
              ? { ...state.currentResume, ...data, updatedAt: new Date() }
              : state.currentResume,
        }));
        if (updatedResume) queueCloudSync(updatedResume.id);
      },

      setCurrentResume: (resume) => set({ currentResume: resume }),

      getResumeById: (id: string) => get().resumes.find((r) => r.id === id),

      updatePaymentStatus: (id: string, status: PaymentStatus, receiptUrl?: string) => {
        set((state) => ({
          resumes: state.resumes.map((r) =>
            r.id === id
              ? { ...r, paymentStatus: status, receiptUrl: receiptUrl || r.receiptUrl, updatedAt: new Date() }
              : r
          ),
          currentResume:
            state.currentResume?.id === id
              ? { ...state.currentResume, paymentStatus: status, receiptUrl: receiptUrl || state.currentResume.receiptUrl, updatedAt: new Date() }
              : state.currentResume,
        }));
      },

      toggleDownloadEnabled: (id: string) => {
        const resume = get().resumes.find((r) => r.id === id);
        if (resume && resume.paymentStatus === 'confirmed') {
          set((state) => ({
            resumes: state.resumes.map((r) =>
              r.id === id ? { ...r, downloadEnabled: !r.downloadEnabled, updatedAt: new Date() } : r
            ),
          }));
        }
      },

      replaceResumes: (cloudResumes) => set((state) => {
        const byId = new Map(state.resumes.map((resume) => [resume.id, resume]));
        cloudResumes.forEach((resume) => byId.set(resume.id, resume));
        return { resumes: [...byId.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) };
      }),

      applyRemoteUpdate: (id, data) => set((state) => ({
        resumes: state.resumes.map((resume) => resume.id === id ? { ...resume, ...data } : resume),
        currentResume: state.currentResume?.id === id ? { ...state.currentResume, ...data } : state.currentResume,
      })),

      setAccessToken: (id, accessToken) => set((state) => ({
        resumes: state.resumes.map((resume) => resume.id === id ? { ...resume, accessToken } : resume),
        currentResume: state.currentResume?.id === id ? { ...state.currentResume, accessToken } : state.currentResume,
      })),

      syncResumeNow: (id) => syncResumeToCloud(id),
    }),
    {
      name: 'resume-storage',
    }
  )
);
