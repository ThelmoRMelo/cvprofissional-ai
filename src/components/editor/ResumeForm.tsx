import { useState } from 'react';
import { Plus, Trash2, User, Briefcase, GraduationCap, Lightbulb } from 'lucide-react';
import { Resume, Experience, Education, Skill } from '@/types/resume';
import { cn } from '@/lib/utils';

interface ResumeFormProps {
  resume: Resume;
  onUpdate: (data: Partial<Resume>) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

type TabType = 'personal' | 'experience' | 'education' | 'skills';

export function ResumeForm({ resume, onUpdate }: ResumeFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>('personal');

  const tabs = [
    { id: 'personal' as const, label: 'Dados Pessoais', icon: User },
    { id: 'experience' as const, label: 'Experiência', icon: Briefcase },
    { id: 'education' as const, label: 'Formação', icon: GraduationCap },
    { id: 'skills' as const, label: 'Habilidades', icon: Lightbulb },
  ];

  const updatePersonalData = (field: string, value: string) => {
    onUpdate({
      personalData: { ...resume.personalData, [field]: value },
      clientName: field === 'fullName' ? value : resume.clientName,
    });
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: generateId(),
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
    };
    onUpdate({ experiences: [...resume.experiences, newExp] });
  };

  const updateExperience = (id: string, field: string, value: string | boolean) => {
    onUpdate({
      experiences: resume.experiences.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    });
  };

  const removeExperience = (id: string) => {
    onUpdate({ experiences: resume.experiences.filter((exp) => exp.id !== id) });
  };

  const addEducation = () => {
    const newEdu: Education = {
      id: generateId(),
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      current: false,
    };
    onUpdate({ education: [...resume.education, newEdu] });
  };

  const updateEducation = (id: string, field: string, value: string | boolean) => {
    onUpdate({
      education: resume.education.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    });
  };

  const removeEducation = (id: string) => {
    onUpdate({ education: resume.education.filter((edu) => edu.id !== id) });
  };

  const addSkill = () => {
    const newSkill: Skill = {
      id: generateId(),
      name: '',
      level: 'intermediate',
    };
    onUpdate({ skills: [...resume.skills, newSkill] });
  };

  const updateSkill = (id: string, field: string, value: string) => {
    onUpdate({
      skills: resume.skills.map((skill) =>
        skill.id === id ? { ...skill, [field]: value } : skill
      ),
    });
  };

  const removeSkill = (id: string) => {
    onUpdate({ skills: resume.skills.filter((skill) => skill.id !== id) });
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-secondary'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Personal Data Tab */}
      {activeTab === 'personal' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nome Completo *</label>
              <input
                type="text"
                value={resume.personalData.fullName}
                onChange={(e) => updatePersonalData('fullName', e.target.value)}
                className="input-field"
                placeholder="João da Silva"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">E-mail *</label>
              <input
                type="email"
                value={resume.personalData.email}
                onChange={(e) => updatePersonalData('email', e.target.value)}
                className="input-field"
                placeholder="joao@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Telefone</label>
              <input
                type="tel"
                value={resume.personalData.phone}
                onChange={(e) => updatePersonalData('phone', e.target.value)}
                className="input-field"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Endereço</label>
              <input
                type="text"
                value={resume.personalData.address}
                onChange={(e) => updatePersonalData('address', e.target.value)}
                className="input-field"
                placeholder="São Paulo, SP"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">LinkedIn</label>
              <input
                type="url"
                value={resume.personalData.linkedin || ''}
                onChange={(e) => updatePersonalData('linkedin', e.target.value)}
                className="input-field"
                placeholder="linkedin.com/in/joaodasilva"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Objetivo Profissional</label>
              <textarea
                value={resume.personalData.objective || ''}
                onChange={(e) => updatePersonalData('objective', e.target.value)}
                className="input-field min-h-[100px] resize-none"
                placeholder="Descreva seu objetivo profissional..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Experience Tab */}
      {activeTab === 'experience' && (
        <div className="space-y-4 animate-fade-in">
          {resume.experiences.map((exp, index) => (
            <div key={exp.id} className="bg-secondary/50 p-4 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-foreground">Experiência {index + 1}</h4>
                <button
                  onClick={() => removeExperience(exp.id)}
                  className="text-destructive hover:bg-destructive/10 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Cargo</label>
                  <input
                    type="text"
                    value={exp.position}
                    onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                    className="input-field"
                    placeholder="Desenvolvedor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Empresa</label>
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                    className="input-field"
                    placeholder="Empresa XYZ"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Início</label>
                  <input
                    type="text"
                    value={exp.startDate}
                    onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                    className="input-field"
                    placeholder="Jan 2020"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Término</label>
                  <input
                    type="text"
                    value={exp.endDate}
                    onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                    className="input-field"
                    placeholder="Dez 2023"
                    disabled={exp.current}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`current-${exp.id}`}
                  checked={exp.current}
                  onChange={(e) => updateExperience(exp.id, 'current', e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent"
                />
                <label htmlFor={`current-${exp.id}`} className="text-sm text-muted-foreground">
                  Trabalho atual
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
                <textarea
                  value={exp.description}
                  onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                  className="input-field min-h-[80px] resize-none"
                  placeholder="Descreva suas responsabilidades..."
                />
              </div>
            </div>
          ))}
          <button
            onClick={addExperience}
            className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Experiência
          </button>
        </div>
      )}

      {/* Education Tab */}
      {activeTab === 'education' && (
        <div className="space-y-4 animate-fade-in">
          {resume.education.map((edu, index) => (
            <div key={edu.id} className="bg-secondary/50 p-4 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-foreground">Formação {index + 1}</h4>
                <button
                  onClick={() => removeEducation(edu.id)}
                  className="text-destructive hover:bg-destructive/10 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Instituição</label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                    className="input-field"
                    placeholder="Universidade XYZ"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Grau</label>
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                    className="input-field"
                    placeholder="Bacharelado"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Área</label>
                  <input
                    type="text"
                    value={edu.field}
                    onChange={(e) => updateEducation(edu.id, 'field', e.target.value)}
                    className="input-field"
                    placeholder="Ciência da Computação"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Início</label>
                  <input
                    type="text"
                    value={edu.startDate}
                    onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)}
                    className="input-field"
                    placeholder="2018"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Término</label>
                  <input
                    type="text"
                    value={edu.endDate}
                    onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)}
                    className="input-field"
                    placeholder="2022"
                    disabled={edu.current}
                  />
                </div>
                <div className="flex items-center gap-2 self-end pb-3">
                  <input
                    type="checkbox"
                    id={`current-edu-${edu.id}`}
                    checked={edu.current}
                    onChange={(e) => updateEducation(edu.id, 'current', e.target.checked)}
                    className="w-4 h-4 rounded border-border text-accent"
                  />
                  <label htmlFor={`current-edu-${edu.id}`} className="text-sm text-muted-foreground">
                    Em andamento
                  </label>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addEducation}
            className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Formação
          </button>
        </div>
      )}

      {/* Skills Tab */}
      {activeTab === 'skills' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid sm:grid-cols-2 gap-4">
            {resume.skills.map((skill) => (
              <div key={skill.id} className="bg-secondary/50 p-4 rounded-xl flex items-center gap-3">
                <input
                  type="text"
                  value={skill.name}
                  onChange={(e) => updateSkill(skill.id, 'name', e.target.value)}
                  className="input-field flex-1"
                  placeholder="Ex: JavaScript"
                />
                <select
                  value={skill.level}
                  onChange={(e) => updateSkill(skill.id, 'level', e.target.value)}
                  className="input-field w-auto"
                >
                  <option value="beginner">Básico</option>
                  <option value="intermediate">Intermediário</option>
                  <option value="advanced">Avançado</option>
                  <option value="expert">Expert</option>
                </select>
                <button
                  onClick={() => removeSkill(skill.id)}
                  className="text-destructive hover:bg-destructive/10 p-2 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addSkill}
            className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Habilidade
          </button>
        </div>
      )}
    </div>
  );
}
