import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Resume, Plan, PaymentStatus, ResumeTemplate } from '@/types/resume';

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
}

const generateId = () => Math.random().toString(36).substr(2, 9);

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
        return newResume;
      },

      updateResume: (id: string, data: Partial<Resume>) => {
        set((state) => ({
          resumes: state.resumes.map((r) =>
            r.id === id ? { ...r, ...data, updatedAt: new Date() } : r
          ),
          currentResume:
            state.currentResume?.id === id
              ? { ...state.currentResume, ...data, updatedAt: new Date() }
              : state.currentResume,
        }));
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
    }),
    {
      name: 'resume-storage',
    }
  )
);
