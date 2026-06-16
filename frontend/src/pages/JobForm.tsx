import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  useCreateJob,
  useExtractSkills,
  useJob,
  useUpdateJob,
} from '../api/hooks';
import { BackButton } from '../components/BackButton';
import { SkillChips } from '../components/SkillChips';
import { TagInput } from '../components/TagInput';
import { COMMON_CURRENCIES, JOB_TYPE_LABEL, STATUS_LABEL, dateInputToISO } from '../lib/format';
import { useAppSettings } from '../lib/settings-context';
import type { ExtractedSkills, JobApplication, JobStatus, JobType } from '../api/types';

type FormState = Partial<JobApplication>;

export function JobForm({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [skills, setSkills] = useState<ExtractedSkills | null>(null);
  const [extractDebounce, setExtractDebounce] = useState<number | null>(null);
  const { settings, recordTags } = useAppSettings();

  useEffect(() => {
    if (mode === 'edit' && job) {
      setForm(job);
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
    const tags = (form.tags ?? []).map((t) => t.trim()).filter(Boolean);
    const payload: FormState = { ...form, tags, extractedSkills: skills ?? undefined };
    // Fire-and-forget — recording tags should never block navigation.
    void recordTags(tags);
    if (mode === 'edit' && id) {
      await updateJob.mutateAsync(payload);
      // Pop the /edit URL off history (the form is a transient state — Back from the detail page
      // should land on wherever the user came from before opening the form, not on a stale form
      // they just submitted). For direct-loaded /edit (bookmark, refresh), there's no -1 to pop,
      // so fall back to a replace nav.
      if (location.key !== 'default') {
        navigate(-1);
      } else {
        navigate(`/jobs/${id}`, { replace: true });
      }
    } else {
      const created = await createJob.mutateAsync(payload);
      // Create: replace /jobs/new with the new detail URL so Back skips the now-empty form.
      navigate(`/jobs/${created.id}`, { replace: true });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
      <BackButton fallback="/" />
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
        <div className="text-sm">
          <label className="block">
            Location
            <input
              className="input mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
              value={form.remote ? '' : (form.location ?? '')}
              disabled={form.remote ?? false}
              placeholder={form.remote ? 'Remote — no location' : ''}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </label>
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={form.remote ?? false}
              onChange={(e) =>
                setForm({
                  ...form,
                  remote: e.target.checked,
                  // Clear location when going remote so the persisted value matches what the user sees.
                  location: e.target.checked ? null : form.location,
                })
              }
            />
            Remote
          </label>
        </div>
        <label className="text-sm">
          Job posting URL
          <input
            className="input mt-1"
            placeholder="https://… (the listing)"
            value={form.jobUrl ?? ''}
            onChange={(e) => setForm({ ...form, jobUrl: e.target.value })}
          />
        </label>
        <label className="text-sm">
          Application portal URL
          <input
            className="input mt-1"
            type="url"
            placeholder="https://careers.company.com/me/applications"
            value={form.applicationPortalUrl ?? ''}
            onChange={(e) =>
              setForm({ ...form, applicationPortalUrl: e.target.value || null })
            }
          />
        </label>
        <label className="text-sm">
          Job type
          <select
            className="input mt-1"
            value={form.jobType ?? ''}
            onChange={(e) =>
              setForm({ ...form, jobType: (e.target.value || null) as JobType | null })
            }
          >
            <option value="">— unspecified —</option>
            {(Object.keys(JOB_TYPE_LABEL) as JobType[]).map((t) => (
              <option key={t} value={t}>{JOB_TYPE_LABEL[t]}</option>
            ))}
          </select>
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
          <select
            className="input mt-1"
            value={form.salaryCurrency ?? ''}
            onChange={(e) =>
              setForm({ ...form, salaryCurrency: e.target.value || null })
            }
          >
            <option value="">— unspecified —</option>
            {COMMON_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Applied at
          <input
            className="input mt-1"
            type="date"
            value={form.appliedAt ? form.appliedAt.slice(0, 10) : ''}
            onChange={(e) =>
              setForm({ ...form, appliedAt: e.target.value ? dateInputToISO(e.target.value) : null })
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
              setForm({ ...form, deadline: e.target.value ? dateInputToISO(e.target.value) : null })
            }
          />
        </label>
        <div className="text-sm sm:col-span-2">
          <div className="mb-1">Tags</div>
          <TagInput
            value={form.tags ?? []}
            onChange={(next) => setForm({ ...form, tags: next })}
            suggestions={settings?.recentTags ?? []}
            placeholder="Type to add — Enter to confirm, ↓ to pick a suggestion"
          />
        </div>
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
