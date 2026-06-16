# Email → Activity Log (Bookmarklet path)

Status: **spec, not built** — reference for a future build session.

## Goal

When the user is reading an email about an application (recruiter outreach,
interview invite, rejection note, offer letter, follow-up), one click should
turn the email's text into a `JobNote` on the right `JobApplication` — with
zero copy-paste, no new infrastructure, and no email-receiving server to
maintain.

Out of scope (intentionally — those are bigger fish):
- Automatic status updates ("Interview" subject → set status to `interview`)
- Auto-classifying the application without user picking it
- Real email forwarding via MX records / webhook (see "Why bookmarklet" below)

## Why bookmarklet, not real email forwarding

We considered three architectures earlier. Recap:

| Path | Reception layer | Effort | Cost | Why we picked C |
|---|---|---|---|---|
| A. Postmark / Mailgun webhook | Inbound MX → HTTP POST | 1–2 days | $0–$10/mo | Domain + MX records to maintain; auth/security to enforce on the webhook; matching ambiguity has to be solved automatically |
| B. Gmail IMAP polling | Cron polls Gmail | 1–2 days | $0 | OAuth flow / app password; polling delay; still has matching ambiguity |
| C. Bookmarklet | User clicks → modal posts to existing API | half a day | $0 | No infra; matching is solved by user picking from a dropdown; auth piggybacks on existing session |

JobTrail is single-user. The "magic" of paths A and B (zero-click capture) is
not worth the operational cost when the user is already logged in, already
viewing the email, and is the only person on the system. The bookmarklet
trades one click for eliminating an entire backend subsystem.

## User flow

1. User opens a recruiter email in Gmail (or any webmail).
2. User selects the relevant text (optional — the bookmarklet defaults to
   pulling the subject + visible body if nothing is selected).
3. User clicks the **"Save to JobTrail"** bookmarklet in their bookmarks bar.
4. A small modal opens — rendered by the JobTrail frontend, NOT in the email
   page — pre-filled with:
   - Subject line (editable, becomes the note title prefix)
   - Selected/extracted body text (editable, becomes the note body)
   - Sender email (read-only, stored as metadata for future search)
   - **Application picker dropdown** — searchable, shows all open
     applications, sorted by most-recently-updated. User picks one.
5. User clicks Save → the modal POSTs to the existing notes endpoint, the
   modal closes, the bookmarklet shows a tiny "Saved ✓" tooltip on the
   email page.
6. Next time the user opens that application in JobTrail, the email content
   appears as a note in the Activity card, timestamped with the moment of
   capture (not the email's send time — the capture is what we control).

## Components

### 1. New backend endpoint

Reuse the existing `POST /jobs/:id/notes` endpoint — it already does what we
need (creates a `JobNote` on a given application). No backend changes
required, no migration, no new auth.

Optional: extend `JobNote` with a `source` enum (`manual` / `email`) and a
`sourceMetadata` JSON column so emails are visually marked in the Activity
log with a small ✉ icon. Migration ~5 lines, frontend rendering ~10 lines.
Defer until users actually want this signal.

### 2. New frontend route + modal

`/capture` — a public-ish route that renders the JobTrail layout chrome + a
single dialog component. Accepts query params:

- `subject` — string, prefilled into the note title input
- `body` — string, prefilled into the note body textarea
- `from` — string, displayed as read-only metadata
- `url` — the email's gmail-thread URL, stored on the note for traceability

The dialog has:
- The four fields above (subject and body editable)
- An application picker — uses the existing `useJobs()` hook to list every
  application, with a debounced search input on top. Renders rows as
  `Position @ Company` (matching the new Dashboard ordering — position
  first), sorted by `updatedAt desc`.
- Save / Cancel buttons. Save calls `useCreateNote(selectedJobId)` and
  closes the window.

Route stays inside the existing auth boundary — if a future auth layer is
added, the bookmarklet opens a new window that the user is already logged
into. No CORS, no token.

### 3. The bookmarklet

A short JS snippet stored in the bookmarks bar. When clicked while viewing
an email, it:

1. Grabs the selected text (`window.getSelection().toString()`) — or, if
   nothing is selected, grabs the visible body text via known selectors
   (Gmail uses `div.a3s.aiL` for the message body, Outlook uses
   `.allowTextSelection`, etc.) with a generic fallback to `document.body.innerText`.
2. Grabs the subject — Gmail's selector is `h2.hP`, with similar known
   patterns for the other clients.
3. Grabs the sender — `span[email]` in Gmail.
4. Opens a popup window at `https://jobtrail.yourdomain.com/capture?...`
   with the above as query params (URL-encoded; cap body at ~8 KB to stay
   under URL length limits — anything beyond that, the user can paste).

Source layout: `frontend/public/bookmarklet/jobtrail.js` (a real file, so
it can be linted and tested) plus a one-line `javascript:` wrapper that
loads and executes it. The Settings page gets a "Install bookmarklet"
card that displays the drag-target link.

### 4. Settings UI

Add a card on the Settings page:

```
┌─ Email → Activity Log ────────────────────────┐
│                                                │
│  Drag this to your bookmarks bar:              │
│                                                │
│      [ ★ Save to JobTrail ]                    │
│                                                │
│  Then click it while viewing any email to      │
│  capture it as a note on one of your apps.     │
│                                                │
│  Currently works in: Gmail, Outlook Web,       │
│  Fastmail, ProtonMail Web. Other clients use   │
│  a generic text-extraction fallback.           │
└────────────────────────────────────────────────┘
```

The link's `href` is the bookmarklet payload (`javascript:(function(){...})()`).

## Implementation order (small commits)

1. `chore(frontend): add /capture route and shell component`
   - New route + a dummy page rendering "Capture coming soon" + the layout chrome
   - Wire into `<Routes>` in App.tsx. ~30 lines.

2. `feat(capture): application picker + form fields`
   - Build the dialog with the four fields and the picker.
   - Wire `useCreateNote` into the Save button.
   - Display "Saved ✓" then `window.close()`.
   - ~150 lines.

3. `feat(bookmarklet): minified JS that extracts and opens /capture`
   - Add `frontend/public/bookmarklet/jobtrail.js` (the readable source).
   - Add a build step that produces `bookmarklet/jobtrail.min.js` (Terser or
     similar — Vite already has Terser baked in).
   - Tested against Gmail manually before merge.
   - ~80 lines of bookmarklet JS.

4. `feat(settings): install-bookmarklet card`
   - Drag-target rendered as an anchor with the `javascript:` href.
   - Copy-button fallback so users on browsers that block `javascript:` hrefs
     in bookmarks (rare but exists) can paste.
   - ~50 lines.

5. (Optional) `feat(notes): source=email metadata`
   - Migration adds `source` enum column on `job_notes`.
   - `/capture` passes `source: 'email'`.
   - Activity log renders ✉ icon for email-sourced notes.
   - ~80 lines + migration.

Total: ~400 lines spread across 4-5 commits. One focused session.

## Edge cases & open questions

**Long emails / huge selections**
URL length limit is ~2 KB in old browsers, ~8 KB in modern ones (Chrome/FF
support 32 KB+ but it's not portable). For longer bodies, the bookmarklet
should fall back to `window.opener.postMessage` after the popup loads — but
that's more code. Cap at 8 KB initially; add the postMessage path only if
real-world emails routinely exceed it.

**Multiple applications at the same company**
The application picker shows `Position @ Company`, which disambiguates when
the user has e.g. two open applications at the same company. The most-
recently-updated one is at the top of the list, which matches user intent
~90% of the time. No automatic guessing.

**Pop-up blockers**
Bookmarklets triggered by user clicks generally bypass pop-up blockers, but
some browsers are aggressive. The Settings card should mention this. If it
becomes a problem, fall back to opening in a new tab via `window.location`
instead of `window.open`.

**Gmail confidential mode / encrypted emails**
The bookmarklet captures DOM text, so encrypted-at-rest emails are captured
as their rendered (decrypted) text — no special handling needed.

**Mobile**
Bookmarklets don't work well on mobile. Out of scope for v1. A native share
target (PWA share API) could be added later for mobile.

## What this doesn't solve

The big-A "email forwarding" experience (zero clicks, auto-match by
company name, auto-update status) — see paths A and B in the table above.
If/when you want that, the work is mostly in the matcher service and the
inbound-email plumbing, NOT in JobTrail's data model. A future version
could co-exist: bookmarklet for the high-trust manual path, webhook for
the bulk-auto-import path. They'd share the same `JobNote` model.

## How to invoke this spec in a future session

Paste this in a fresh session:

> Read `docs/feature-email-to-activity.md` and implement it. Stop after
> step 2 (the picker + dialog) so I can manually test the capture flow
> before we build the bookmarklet itself.

Or, for the whole thing in one go:

> Build the email-to-activity feature exactly as specced in
> `docs/feature-email-to-activity.md`. Commit per the implementation order
> listed there. Don't extend the spec — anything ambiguous, ask me.
