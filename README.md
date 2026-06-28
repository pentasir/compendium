<div align="center">

<img src="docs/icon.png" alt="Compendium icon" width="128" height="128">

# Compendium

![license MIT](https://img.shields.io/badge/license-MIT-c98a4b) ![data stays on your device](https://img.shields.io/badge/data-stays%20on%20your%20device-3fb950) ![network requests zero](https://img.shields.io/badge/network%20requests-zero-3fb950) ![account none](https://img.shields.io/badge/account-none-3fb950) ![runs web and desktop](https://img.shields.io/badge/runs-web%20%2B%20desktop-58a6ff)

</div>

A daily reflection that stays on your device. One entry a day. You have to be here to write it.

Most journaling apps are write-only. You put thoughts in and nothing comes back. Compendium is built on a different premise: most of what we think today is a recurrence of yesterday. So instead of a feed of notes, it keeps a record of *how your thinking moves over time*, and quietly shows you the loops you didn't know you were in.

It is local-first by design. There is no account, no server, and no network call anywhere in the code. Your entries live in your browser's IndexedDB, on your machine, and nowhere else.

## The idea in one line

> A timeline of your recurring thoughts, so you can see whether your thinking is moving or circling.

## A look inside

**First run.** Compendium asks for one thing, the day you were born, so it can place each entry against the age you were when you wrote it. That date never leaves your device.

![The onboarding screen](docs/writing.png)

**The daily ritual.** One free-form entry a day with a single prompt, "What's on your mind today?", a quiet guidance note, and a reminder that no one is reading this but you.

![The writing screen](docs/writing-page.png)

**The archive.** A heatmap of your writing life, year by year, with the age you were down the left, a month axis across the top, and cell intensity by how much you wrote.

![The heatmap archive](docs/heatmap.png?v=2)

**What you keep returning to.** Recurring words surface on their own; click one to see every day you wrote about it, each with the word in context, and read any of them in full. The premise made visible: are you moving, or circling?

![A recurring theme and the days it appears](docs/themes.png)

**The thread.** Clicking a day opens its month as a string of beads; hovering previews the day.

![The month thread](docs/thread.png)

**The reader.** Any past day, read back in full.

![Reading a past entry](docs/reader.png)

## What it does

- **One entry per day.** A single free-form writing surface that asks *"What's on your mind today?"* No tags, no fields, no structure. Just thought.
- **You have to be present.** You can only write today's entry, today. There is no backdating, no importing, no bulk entry, and the timestamp is set by the device rather than by you. The constraint is the point: it is a wind-down ritual, not a backlog to clear.
- **Themes emerge. You don't assign them.** Recurring topics surface on their own from your own words.
- **Your history becomes a map.** A GitHub-style heatmap of your writing life (years stacked, with the age you were on each), drilling down to a day-by-day timeline and, eventually, a constellation of the themes you keep returning to.

## Privacy model

Your thoughts never leave your device. This is not a policy, it is an architecture:

- No backend. No authentication. No analytics.
- The code makes zero network requests. You can verify this yourself, which is part of why it is open source.
- The service worker caches only the app's code for offline use. It never touches your entries.
- A manual Markdown export (one file per day, with frontmatter, readable in Obsidian or any editor) gives you a backup and a way to move your data, entirely under your control.

## Running it

It is a static site with no build step.

```sh
cd compendium
python3 -m http.server 8000
# open http://localhost:8000
```

To install it as an app, open it in a browser and choose "Install" or "Add to Home Screen." It then works fully offline.

## Desktop app

Compendium also builds as a native desktop app with [Tauri](https://tauri.app), which wraps the exact same code in the operating system's own webview (no bundled Chromium, so the installer is only a few megabytes). The web app at the repo root is untouched and still has no build step; the desktop tooling lives in `src-tauri/`, and a generated, gitignored `dist/` holds a clean copy of the app shell for bundling.

On the desktop, each day is stored as a real Markdown file in a folder you choose (your vault), readable in Obsidian or any editor. The web version keeps IndexedDB; the same code picks its storage backend at runtime.

![Compendium running as a native macOS app](docs/desktop.png)

Prerequisites: [Rust](https://rustup.rs) and Node. Then:

```sh
npm install
npm run tauri build
# produces Compendium.app and a .dmg under src-tauri/target/release/bundle/
```

The build is unsigned, so on another Mac the first launch needs a right-click then "Open."

## Status

Built in phases. See [BUILDSTORY.md](BUILDSTORY.md) for the full design log and rationale.

- [x] **Phase 1: the writing ritual.** First-run setup, today-only entry, autosave, read-back.
- [x] **Phase 2: the heatmap home.** A year-by-year grid with the age you were down the left, cell intensity by entry length, and a read-only view of any past day.
- [x] **Phase 3: the thread drilldown.** Clicking a day opens its month as a string of day-beads, with a preview on hover and the full entry on click.
- [x] **Phase 4: local pattern detection.** Recurring themes surfaced from your own words, with no AI; click one to read every day you wrote about it, in context.
- [x] **Markdown backup.** Export every entry as Obsidian-compatible Markdown (a `.zip` of one file per day) and import it back, merging without overwriting. Local-first, so this is also how you move between devices.
- [ ] **Phase 5: polish and deploy.** PWA install niceties and a final calm pass.

Deferred: a constellation theme view, and an optional AI reflection layer (a one-time unlock) that reads patterns across time. The core never depends on it.

## Stack

Vanilla HTML, CSS, and JavaScript. IndexedDB for storage. PWA for offline and install. No framework, no build step, no dependencies. A Tauri (Rust) wrapper builds the same code as a native desktop app; that is the only part with a toolchain, and it does not touch the web build.

## License

[MIT](LICENSE). There are no secrets to protect, and open source is what lets anyone confirm the privacy promise is real.
