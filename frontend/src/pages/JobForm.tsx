import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCreateJob,
  useExtractSkills,
  useJob,
  useUpdateJob,
} from '../api/hooks';
import { SkillChips } from '../components/SkillChips';
import { STATUS_LABEL } from '../lib/format';
import type { ExtractedSkills, JobApplication, JobStatus } from '../api/types';

type FormState = Partial<JobApplication>;

export function JobForm({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const editing = mode === 'edit' && id;
  const { data: job } = useJob(editing ? id : undefined);
  const createJob = useCreateJob();
  const updateJob = useUpdateJob(id ?? '');
  const extract = useExtractSkills();

  const [form, setForm] = useState<FormState>({
    company: '',
    position: '',
    status: 'saved',
    remote: false,
    tags: [],
  });
  const [tagsInput, setTagsInput] = useState('');
  const [skills, setSkills] = useState<ExtractedSkills | null>(null);
  const [extractDebounce, setExtractDebounce] = useState<number | null>(null);

  useEffect(() => {
    if (mode === 'edit' && job) {
      setForm(job);
      setTagsInput(job.tags.join(', '));
      setSkills(job.extractedSkills);
    }
  }, [mode, job]);

  // When the user pastes/edits a description, debounce-call the local NLP extractor (§8.3 preview).
  useEffect(() => {
    if (!form.description) {
      setSkills(null);
      return;
    }
    if (extractDebounce) window.clearTimeout(extractDebounce);
    const handle = window.setTimeout(async () => {
      const result = await extract.mutateAsync(form.description!);
      setSkills(result);
    }, 500);
    setExtractDebounce(handle);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: FormState = {
      ...form,
      tags: tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      extractedSkills: skills ?? undefined,
    };
    if (mode === 'edit' && id) {
      await updateJob.mutateAsync(payload);
      navigate(`/jobs/${id}`);
    } else {
      const created = await createJob.mutateAsync(payload);
      navigate(`/jobs/${created.id}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">{mode === 'edit' ? 'Edit job' : 'Add job'}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm">
          Company *
          <input
            className="input mt-1"
            value={form.company ?? ''}
            required
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
        </label>
        <label className="text-sm">
          Position *
          <input
            className="input mt-1"
            value={form.position ?? ''}
            required
            onChange={(e) => setForm({ ...form, position: e.target.value })}
          />
        </label>
        <label className="text-sm">
          Status
          <select
            className="input mt-1"
            value={form.status ?? 'saved'}
            onChange={(e) => setForm({ ...form, status: e.target.value as JobStatus })}
          >
            {(Object.keys(STATUS_LABEL) as JobStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Location
          <input
            className="input mt-1"
            value={form.location ?? ''}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </label>
        <label className="text-sm">
          Job URL
          <input
            className="input mt-1"
            value={form.jobUrl ?? ''}
            onChange={(e) => setForm({ ...form, jobUrl: e.target.value })}
          />
        </label>
        <label className="text-sm">
          Salary min
          <input
            className="input mt-1"
            type="number"
            value={form.salaryMin ?? ''}
            onChange={(e) =>
              setForm({ ...form, salaryMin: e.target.value ? parseInt(e.target.value, 10) : null })
            }
          />
        </label>
        <label className="text-sm">
          Salary max
          <input
            className="input mt-1"
            type="number"
            value={form.salaryMax ?? ''}
            onChange={(e) =>
              setForm({ ...form, salaryMax: e.target.value ? parseInt(e.target.value, 10) : null })
            }
          />
        </label>
        <label className="text-sm">
          Currency
          <input
            className="input mt-1"
            value={form.salaryCurrency ?? ''}
            onChange={(e) => setForm({ ...form, salaryCurrency: e.target.value })}
          />
        </label>
        <label className="text-sm">
          Applied at
          <input
            className="input mt-1"
            type="date"
            value={form.appliedAt ? form.appliedAt.slice(0, 10) : ''}
            onChange={(e) =>
              setForm({ ...form, appliedAt: e.target.value ? new Date(e.target.value).toISOString() : null })
            }
          />
        </label>
        <label className="text-sm">
          Deadline
          <input
            className="input mt-1"
            type="date"
            value={form.deadline ? form.deadline.slice(0, 10) : ''}
            onChange={(e) =>
              setForm({ ...form, deadline: e.target.value ? new Date(e.target.value).toISOString() : null })
            }
          />
        </label>
        <label className="text-sm sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.remote ?? false}
            onChange={(e) => setForm({ ...form, remote: e.target.checked })}
          />
          Remote
        </label>
        <label className="text-sm sm:col-span-2">
          Tags (comma-separated)
          <input className="input mt-1" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
        </label>
        <label className="text-sm sm:col-span-2">
          Description / requirements
          <textarea
            className="input mt-1 min-h-[10rem]"
            value={form.description ?? ''}
            placeholder="Paste the job description here — skills will be extracted automatically."
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
      </div>

      {skills && (
        <div className="card p-4">
          <SkillChips skills={skills} onChange={setSkills} />
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary">
          {mode === 'edit' ? 'Save changes' : 'Create job'}
        </button>
        <button type="button" className="btn" onClick={() => navigate(-1)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
