import { Resume, ResumeTemplate } from '@/types/resume';

interface ResumePreviewProps {
  resume: Resume;
  template: ResumeTemplate;
}

export function ResumePreview({ resume, template }: ResumePreviewProps) {
  const { personalData, experiences, education, skills } = resume;

  return (
    <div className="resume-preview p-8 text-sm text-gray-800 scale-90 origin-top">
      {/* Header */}
      <div className={`mb-6 pb-4 border-b-2 ${template === 'modern' ? 'border-accent' : template === 'classic' ? 'border-gray-800' : 'border-gray-300'}`}>
        <h1 className={`text-2xl font-bold ${template === 'modern' ? 'text-primary' : 'text-gray-900'}`}>
          {personalData.fullName || 'Seu Nome'}
        </h1>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-600">
          {personalData.email && <span>{personalData.email}</span>}
          {personalData.phone && <span>{personalData.phone}</span>}
          {personalData.address && <span>{personalData.address}</span>}
        </div>
        {personalData.linkedin && (
          <div className="mt-1 text-xs text-accent">{personalData.linkedin}</div>
        )}
      </div>

      {/* Objective */}
      {personalData.objective && (
        <div className="mb-4">
          <h2 className={`text-sm font-bold mb-1 uppercase tracking-wide ${template === 'modern' ? 'text-accent' : 'text-gray-800'}`}>
            Objetivo
          </h2>
          <p className="text-xs text-gray-600">{personalData.objective}</p>
        </div>
      )}

      {/* Experience */}
      {experiences.length > 0 && (
        <div className="mb-4">
          <h2 className={`text-sm font-bold mb-2 uppercase tracking-wide ${template === 'modern' ? 'text-accent' : 'text-gray-800'}`}>
            Experiência Profissional
          </h2>
          <div className="space-y-3">
            {experiences.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{exp.position}</h3>
                    <p className="text-gray-600">{exp.company}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {exp.startDate} - {exp.current ? 'Atual' : exp.endDate}
                  </span>
                </div>
                {exp.description && (
                  <p className="text-xs text-gray-600 mt-1">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div className="mb-4">
          <h2 className={`text-sm font-bold mb-2 uppercase tracking-wide ${template === 'modern' ? 'text-accent' : 'text-gray-800'}`}>
            Formação Acadêmica
          </h2>
          <div className="space-y-2">
            {education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{edu.degree} em {edu.field}</h3>
                  <p className="text-gray-600">{edu.institution}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {edu.startDate} - {edu.current ? 'Atual' : edu.endDate}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="mb-4">
          <h2 className={`text-sm font-bold mb-2 uppercase tracking-wide ${template === 'modern' ? 'text-accent' : 'text-gray-800'}`}>
            Habilidades
          </h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill.id}
                className={`px-2 py-1 text-xs rounded ${
                  template === 'modern'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!personalData.fullName && experiences.length === 0 && education.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>Preencha seus dados para visualizar o currículo</p>
        </div>
      )}
    </div>
  );
}
