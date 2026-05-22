import { Injectable } from '@nestjs/common';
import nlp from 'compromise';
import { SKILL_CATEGORIES, SkillCategory } from './data/categories';

export interface ExtractedSkills {
  skills: Record<SkillCategory, string[]>;
  experienceLevel: string | null;
  workArrangement: string | null;
  tags: string[];
}

@Injectable()
export class SkillsService {
  /**
   * Local NLP skills extraction (FR-4).
   *
   * Pipeline:
   *   1. Normalize the job description (lowercase, collapse whitespace).
   *   2. For every (category, skill) pair in SKILL_CATEGORIES, ask
   *      `findSkillInContext` whether the skill is genuinely mentioned.
   *   3. Detect experience level + work arrangement with regex helpers.
   *   4. Flatten the matched skills into a single `tags` list for chip UI.
   */
  extract(description: string): ExtractedSkills {
    const text = this.normalize(description);
    const skills = Object.fromEntries(
      (Object.keys(SKILL_CATEGORIES) as SkillCategory[]).map((category) => [
        category,
        SKILL_CATEGORIES[category].filter((skill) =>
          this.findSkillInContext(text, skill.toLowerCase()),
        ),
      ]),
    ) as Record<SkillCategory, string[]>;

    return {
      skills,
      experienceLevel: this.extractExperienceLevel(text),
      workArrangement: this.extractWorkArrangement(text),
      tags: Object.values(skills).flat(),
    };
  }

  private normalize(text: string): string {
    // compromise gives us proper sentence/term boundaries; for the MVP we just
    // lowercase + collapse whitespace, which is enough for `findSkillInContext`.
    const doc = nlp(text);
    return doc.text().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Decide whether `skill` is genuinely mentioned in `text`.
   *
   * ⚠️ TODO(user): implement this matcher.
   *
   * Both arguments are already lowercased. Return true iff the skill is
   * mentioned as a discrete token — not as a substring of an unrelated word.
   *
   * Trade-offs to consider:
   *   - `text.includes(skill)` is fast but produces false positives:
   *     "react" matches "reacted", "go" matches "google", "c++" needs escaping.
   *   - Word-boundary regex (`\b`) is closer but `\b` doesn't fire on `.` or `+`,
   *     so "node.js" and "c++" need special handling.
   *   - Some skills are inherently noisy as substrings ("go", "r", "c"). Decide
   *     whether to treat short or symbol-bearing skills with stricter rules.
   *
   * The spec (REQUIREMENTS.md §10.2) names this exact function. Keep it pure
   * and synchronous — it is called once per (skill, description) pair.
   *
   * Examples the tests will check:
   *   findSkillInContext("we use react and node.js daily", "react")  → true
   *   findSkillInContext("she reacted to the news", "react")          → false
   *   findSkillInContext("strong c++ background", "c++")              → true
   *   findSkillInContext("must know go and rust", "go")               → true
   *   findSkillInContext("google for answers", "go")                  → false
   */
  findSkillInContext(text: string, skill: string): boolean {
    // TODO(user): replace this stub with the real matcher.
    // The stub uses naive substring matching so the rest of the pipeline runs;
    // it intentionally fails the false-positive tests until you implement it.
    return text.includes(skill);
  }

  private extractExperienceLevel(text: string): string | null {
    const yearsMatch = text.match(/(\d+)\s*\+?\s*years?/);
    if (yearsMatch) {
      const years = parseInt(yearsMatch[1], 10);
      if (years >= 8) return `Staff/Principal (${years}+ years)`;
      if (years >= 5) return `Senior (${years}+ years)`;
      if (years >= 2) return `Mid-level (${years}+ years)`;
      return `Junior (${years}+ years)`;
    }
    if (/\bstaff\b|\bprincipal\b/.test(text)) return 'Staff/Principal';
    if (/\bsenior\b/.test(text)) return 'Senior';
    if (/\bjunior\b|\bentry[- ]level\b|\bintern\b/.test(text)) return 'Junior';
    return null;
  }

  private extractWorkArrangement(text: string): string | null {
    const remote = /\bremote\b/.test(text);
    const hybrid = /\bhybrid\b/.test(text);
    const onsite = /\bon[- ]?site\b|\bin[- ]?office\b/.test(text);
    const parts: string[] = [];
    if (remote) parts.push('Remote');
    if (hybrid) parts.push('Hybrid');
    if (onsite) parts.push('On-site');
    return parts.length ? parts.join(' / ') : null;
  }
}
