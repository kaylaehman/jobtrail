import { useMemo, useRef, useState } from 'react';

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  // Suggestions are filtered as the user types. Already-selected tags are excluded automatically.
  suggestions?: string[];
  placeholder?: string;
}

export function TagInput({ value, onChange, suggestions = [], placeholder }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = draft.trim().toLowerCase();
    const taken = new Set(value.map((t) => t.toLowerCase()));
    return suggestions
      .filter((s) => !taken.has(s.toLowerCase()))
      .filter((s) => (q === '' ? true : s.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [draft, suggestions, value]);

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
    setDraft('');
    setActiveIndex(0);
  };

  const removeTag = (idx: number) => {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      // If a suggestion is highlighted, take it; otherwise fall back to the raw typed text.
      if (open && filtered[activeIndex]) {
        addTag(filtered[activeIndex]);
      } else {
        addTag(draft);
      }
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      // Backspace on empty input removes the last chip — matches Gmail/Slack chip-input behavior.
      removeTag(value.length - 1);
    } else if (e.key === 'ArrowDown' && filtered.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp' && filtered.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <div
        className="input flex flex-wrap items-center gap-1 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, idx) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded bg-brand-blue/10 text-brand-blue px-1.5 py-0.5 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              className="hover:text-rejected"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(idx);
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="flex-1 min-w-[8ch] border-0 outline-none bg-transparent text-sm py-0.5"
          placeholder={value.length === 0 ? (placeholder ?? 'Add tags…') : ''}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay so onMouseDown on a suggestion fires first.
            setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={handleKey}
        />
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-700 bg-slate-800 shadow-lg">
          {filtered.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                className={
                  'block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-700 ' +
                  (i === activeIndex ? 'bg-slate-700' : '')
                }
                // onMouseDown beats onBlur — keeps the click registering before the input blurs.
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(s);
                  inputRef.current?.focus();
                }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
