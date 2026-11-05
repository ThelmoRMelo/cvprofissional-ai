import { useMemo } from 'react';
import { Resume, ResumeTemplate } from '@/types/resume';
import { useTemplateStore } from '@/store/templateStore';

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const sanitizeTemplateHtml = (html: string) => {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  parsed.querySelectorAll('script, iframe, object, embed, form').forEach((element) => element.remove());
  parsed.body.querySelectorAll('*').forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith('on') || name === 'srcdoc') {
        element.removeAttribute(attribute.name);
      } else if (['href', 'src', 'xlink:href', 'action'].includes(name) && /^javascript:/i.test(value)) {
        element.removeAttribute(attribute.name);
      } else if (name === 'style' && /expression\s*\(|url\s*\(\s*['"]?\s*javascript:/i.test(value)) {
        element.removeAttribute(attribute.name);
      }
    }
  });
  return parsed.body.innerHTML;
};

interface ResumePreviewProps {
  resume: Resume;
  template: ResumeTemplate;
}

export function ResumePreview({ resume, template }: ResumePreviewProps) {
  const { personalData, experiences, education, skills } = resume;
  const templates = useTemplateStore((state) => state.templates);

  const matchedTemplate = useMemo(
    () => templates.find((item) => item.id === template || item.name === template),
    [templates, template],
  );

  const renderedDynamicHtml = useMemo(() => {
    if (!matchedTemplate?.generatedHtml) return null;

    let html = sanitizeTemplateHtml(matchedTemplate.generatedHtml);
    // Older starter models contain static sample copy instead of client placeholders.
    if (!/\{\{(?:nome|email|telefone|endereco|linkedin|objetivo|profissao|experiencias|educacao|habilidades(?:_barras)?|foto)\}\}/i.test(html)) {
      return null;
    }
    const safe = (value?: string, fallback = '') => escapeHtml(value || fallback);
    if (personalData.photoUrl) {
      const safePhotoUrl = safe(personalData.photoUrl);
      html = html.replace(/src=(['"])\{\{foto\}\}\1/gi, `src="${safePhotoUrl}"`);
      html = html.replace(/\{\{foto\}\}/gi, `<img src="${safePhotoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" alt="Foto" />`);
    } else {
      html = html.replace(/<img\b[^>]*src=(['"])\{\{foto\}\}\1[^>]*>/gi, '');
      const initials = personalData.fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toLocaleUpperCase())
        .join('') || 'CV';
      html = html.replace(/\{\{foto\}\}/gi, `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:34px;font-weight:700;color:#718096;">${safe(initials)}</span>`);
    }
    html = html.replace(/\{\{nome\}\}/gi, () => safe(personalData.fullName, 'Seu Nome'));
    html = html.replace(/\{\{email\}\}/gi, () => safe(personalData.email, 'seu.email@exemplo.com'));
    html = html.replace(/\{\{telefone\}\}/gi, () => safe(personalData.phone, '(00) 00000-0000'));
    html = html.replace(/\{\{endereco\}\}/gi, () => safe(personalData.address, 'Cidade - UF'));
    html = html.replace(/\{\{linkedin\}\}/gi, () => safe(personalData.linkedin));
    html = html.replace(/\{\{objetivo\}\}/gi, () => safe(personalData.objective, 'Objetivo profissional...'));
    html = html.replace(/\{\{profissao\}\}/gi, () => safe(experiences.find((experience) => experience.position)?.position, 'Profissional'));

    const experienceHtml = experiences.length > 0
      ? experiences.map((experience) => `
        <div style="margin-bottom: 10px;">
          <strong>${safe(experience.position)}</strong> - <span>${safe(experience.company)}</span>
          <div style="font-size: 11px; color: #6b7280;">${safe(experience.startDate)} - ${safe(experience.current ? 'Atual' : experience.endDate)}</div>
          ${experience.description ? `<p style="margin: 4px 0 0 0; font-size: 12px;">${safe(experience.description)}</p>` : ''}
        </div>
      `).join('')
      : '<p style="color: #9ca3af; font-size: 12px;">Preencha suas experiências profissionais.</p>';
    html = html.replace(/\{\{experiencias\}\}/gi, () => experienceHtml);

    const educationHtml = education.length > 0
      ? education.map((item) => `
        <div style="margin-bottom: 8px;">
          <strong>${safe(item.degree)}${item.field ? ` em ${safe(item.field)}` : ''}</strong> - <span>${safe(item.institution)}</span>
          <div style="font-size: 11px; color: #6b7280;">${safe(item.startDate)} - ${safe(item.current ? 'Atual' : item.endDate)}</div>
        </div>
      `).join('')
      : '<p style="color: #9ca3af; font-size: 12px;">Preencha sua formação acadêmica.</p>';
    html = html.replace(/\{\{educacao\}\}/gi, () => educationHtml);

    const skillsHtml = skills.length > 0
      ? `<div style="display: flex; flex-wrap: wrap; gap: 6px;">${skills.map((skill) => `<span style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${safe(skill.name)}</span>`).join('')}</div>`
      : '<p style="color: #9ca3af; font-size: 12px;">Preencha suas habilidades.</p>';
    const skillsWithBarsHtml = skills.length > 0
      ? skills.map((skill) => {
        const levelWidth = { beginner: 45, intermediate: 65, advanced: 82, expert: 96 }[skill.level];
        return `<div style="margin:0 0 10px;"><div style="font-size:10px;font-weight:700;margin-bottom:4px;">${safe(skill.name)}</div><div style="height:10px;background:#fff;border-radius:8px;overflow:hidden;"><div style="height:100%;width:${levelWidth}%;background:#c5bdc2;border-radius:8px;"></div></div></div>`;
      }).join('')
      : '<p style="color:rgba(255,255,255,.75);font-size:10px;">Adicione suas habilidades.</p>';
    html = html.replace(/\{\{habilidades\}\}/gi, () => skillsHtml);
    html = html.replace(/\{\{habilidades_barras\}\}/gi, () => skillsWithBarsHtml);

    return html;
  }, [matchedTemplate, personalData, experiences, education, skills]);

  if (renderedDynamicHtml) {
    return (
      <div className="resume-preview overflow-hidden rounded-xl bg-white shadow-lg scale-90 origin-top">
        <div dangerouslySetInnerHTML={{ __html: renderedDynamicHtml }} />
      </div>
    );
  }

  return (
    <div className="resume-preview p-8 text-sm text-gray-800 scale-90 origin-top">
      {/* Header */}
      <div className={`mb-6 pb-4 border-b-2 ${template === 'modern' ? 'border-accent' : template === 'classic' ? 'border-gray-800' : 'border-gray-300'}`}>
        {personalData.photoUrl && (
          <img src={personalData.photoUrl} alt="Foto do cliente" className="mb-3 h-24 w-24 rounded-full object-cover" />
        )}
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
              <div key={exp.id} className="resume-entry">
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
              <div key={edu.id} className="resume-entry flex justify-between items-start">
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
