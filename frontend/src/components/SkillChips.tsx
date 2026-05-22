import type { ExtractedSkills } from '../api/types';

// §8.3 categorized skill chips. Editable via the parent's onChange callback.
const CATEGORY_LABELS: Array<{ key: keyof ExtractedSkills['skills']; label: string; icon: string }> = [
  { key: 'languages', label: 'Languages', icon: '💬' },
  { key: 'frameworks', label: 'Frameworks', icon: '🧩' },
  { key: 'databases', label: 'Databases', icon: '🗄️' },
  { key: 'cloud', label: 'Cloud / DevOps', icon: '☁️' },
  { key: 'tools', label: 'Tools', icon: '🛠️' },
];

export function SkillChips({
  skills,
  onChange,
}: {
  skills: ExtractedSkills;
  onChange?: (next: ExtractedSkills) => void;
}) {
  const removeSkill = (cat: keyof ExtractedSkills['skills'], skill: string) => {
    if (!onChange) return;
    const next: ExtractedSkills = {
      ...skills,
      skills: { ...skills.skills, [cat]: skills.skills[cat].filter((s) => s !== skill) },
    };
    next.tags = Object.values(next.skills).flat();
    onChange(next);
  };

  const addSkill = (cat: keyof ExtractedSkills['skills']) => {
    if (!onChange) return;
    const value = prompt(`Add a skill to ${cat}`);
    if (!value) return;
    const next: ExtractedSkills = {
      ...skills,
      skills: { ...skills.skills, [cat]: [...skills.skills[cat], value.trim()] },
    };
    next.tags = Object.values(next.skills).flat();
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-200">
        📋 <strong>Job Requirements Analysis</strong>{' '}
        <span className="text-slate-400">(auto-extracted from description)</span>
      </div>
      {CATEGORY_LABELS.map(({ key, label, icon }) => (
        <div key={key} className="flex flex-wrap items-center gap-2">
          <div className="w-44 text-xs uppercase tracking-wide text-slate-400">
            {icon} {label}
          </div>
          {skills.skills[key].length === 0 && (
            <span className="text-xs italic text-slate-500">none detected</span>
          )}
          {skills.skills[key].map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-full bg-slate-700 text-slate-100 px-2 py-0.5 text-xs"
            >
              #{skill}
              {onChange && (
                <button
                  type="button"
                  className="text-slate-400 hover:text-rejected"
                  onClick={() => removeSkill(key, skill)}
                  aria-label={`Remove ${skill}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {onChange && (
            <button type="button" className="btn !py-0.5 !px-2 text-xs" onClick={() => addSkill(key)}>
              ➕ Add
            </button>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-400">
        {skills.experienceLevel && <span>💼 Experience: {skills.experienceLevel}</span>}
        {skills.workArrangement && <span>🏢 Work: {skills.workArrangement}</span>}
      </div>
    </div>
  );
}
