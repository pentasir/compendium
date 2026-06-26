# Build Story

The design log for Compendium: the decisions, and the reasoning behind them. This is the part that matters more than the code. A journal app is easy to build, but the premise is what makes it worth building.

## Where it came from

It started as a personal problem: too many hours lost to doom-scrolling, late nights, and the sense that the days were running on autopilot. The first instinct was a habit-breaking tool, but that category is crowded and slightly defeated. Every screen-time app assumes the problem is willpower. The honest diagnosis was different. The problem is attention and recurrence, not motivation.

That reframing produced the premise the whole product rests on:

> Most of what we think today is a recurrence of yesterday, maybe 90% of it.

If that is true, the useful tool is not one that captures new ideas. It is one that lets you notice the loop, so you can see whether your thinking is actually moving or just circling. That is a more honest, and more uncomfortable, product than a journal. It is closer to a mirror.

The working description became "digital meditation." You sit with it at the end of the day, you reflect, you write one thing, and you close it.

## The decisions

### One entry per day, and you must be present

No backdating, no importing, no bulk entry. The entry key is the date, computed when the app opens, and the timestamp is stamped by the device clock and is never user-supplied. This is not a technical limitation dressed up as a feature. The constraint is the product. A backlog you can fill in later is not a ritual. Being there is the whole act.

### Free-form, no tags

Structured journaling (mood, fields, prompts) turns reflection into data entry. Compendium asks one open question and gets out of the way. Topics are not assigned. They emerge from the words over time. This is also what makes the recurring-thought premise legible: you can only see a loop you did not deliberately label.

### Themes surface locally, without AI

Recurring themes are detected on-device with plain text-frequency analysis (`patterns.js`). No model, no API, no cost, no data leaving the machine. AI was deliberately demoted from the core to an optional layer, because the product has to stand on its own first. "It uses AI" is a weaker design position than "it works completely offline, and AI is a bonus."

### Local-first, and therefore private by architecture

The hard question was sync. Writing on a phone and viewing on a laptop wants a backend, and a backend storing people's private daily thoughts is a serious security and privacy responsibility (authentication, encryption at rest, row-level security, breach risk). The resolution was to not build that. Desktop-first, local-only, IndexedDB. Syncing through iCloud or Drive was rejected for two reasons: silent sync failures (a full account) are unacceptable for something this personal, and the end-of-day ritual is a desk moment rather than a phone moment. Privacy becomes a property of the architecture, not a promise in a policy. Open-sourcing the code then proves it, because anyone can confirm there is no network call.

### The visual: a nocturne

Because it is an end-of-day ritual, the interface is a lamp-lit desk at night: deep warm ink, low-contrast paper-white text, and a single muted ember accent for the "today" marker and the cursor. This is deliberately not the cream-paper-and-serif look that has become an AI-generated default. The dusk palette is both more distinctive and truer to "reflect before sleep." Type is literary: a refined serif for the writing, and a small tracked label for the only piece of UI chrome. Motion is minimal, a slow settle on load and a single breath when an entry saves. Nothing bounces.

### Date of birth, entered properly

The only thing the app asks for up front is a birthdate, which powers the age axis on the timeline. The native date picker was the wrong control: it forces you to scroll back through decades to reach a year you already know by heart. It was replaced with three typed fields (DD, MM, YYYY) that auto-advance as they fill, accept a pasted date in common formats, and validate a real, non-future date. Fastest for a date you know cold, and calmer to look at.

## The views (a four-level descent, from your whole life to one day)

1. **Heatmap (home).** Years stacked, the age you were on the left, a cell per day, intensity from entry length. The shape of your years at a glance.
2. **Thread (month).** Click a month and it opens into a dot-per-day timeline, with dots coloured by the theme you kept returning to.
3. **Preview (hover).** A small card with the first lines, the date, and the age.
4. **Entry (click).** The full day, in a calm read view.

And, later, a constellation of recurring themes, unlocking after enough entries. That is also where the optional AI reflection layer would live.

## Architecture notes

- **No build step, no dependencies.** Vanilla HTML, CSS, and JavaScript keep it auditable and permanent. It will still run in ten years.
- **`db.js` is the only place that touches storage.** Two IndexedDB stores: `entries` (keyed by `YYYY-MM-DD`) and `settings` (the birthdate). It contains no network code, by design.
- **The data shape is forward-built.** Every saved entry already stores `tokens` and `wordCount`, so the heatmap (Phase 2), thread colouring (Phase 4), and constellation are pure UI work against data that already exists.
- **Screens, not pages.** Each view (onboarding, today, archive, reader) is a `<section>` toggled by the `hidden` attribute. `ritual.js` owns the onboarding-to-today boot; `nav.js` owns every transition after that; `heatmap.js` renders the archive; and `util.js` holds the date and age helpers shared between the writing screen and the heatmap. There is no router and no framework.
- **The "present to write" rule is enforced in code,** not convention. See the header comment in `ritual.js`.
- **Offline without the stale-build trap.** The service worker is network-first: when online it always serves the latest file, and the cache is only a fallback for when you are genuinely offline. A `?reset` URL, gated to localhost, wipes the local store during development so onboarding can be tested. It can never fire on the deployed site.

## Phase plan

| Phase | What | State |
|---|---|---|
| 1 | The writing ritual: setup, today-only entry, autosave, read-back | Built |
| 2 | The heatmap home, with a read-only reader for any past day | Built |
| 3 | The thread drilldown (month view) and hover previews | Built |
| 4 | Local theme detection surfaced in the UI, with heatmap highlighting | Built |
| Backup | Markdown export and import (Obsidian-compatible), merge without overwrite | Built |
| 5 | PWA install niceties and the calm pass | Planned |
| Later | Constellation view and the optional AI reflection unlock | Deferred |

## What's deliberately not here

- No sync, no cloud, no account.
- No streaks or gamification. That is the doom-scroll logic this is a reaction against.
- No notifications nagging you to return.
- No AI in the core. If it ever arrives, it is a one-time unlock that reads patterns across time, and the product works fully without it.
