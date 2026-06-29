/* ============================================================================
   nav.js: moves between screens after boot.

     today  <->  archive (heatmap + themes)
                   |  click a day-cell            |  click a theme
                   v                              v
                 thread (a month, day by day)   theme-view (every day on a theme)
                   \________________  __________/
                                    \/  click a written day
                                  reader (the full entry; back returns to wherever
                                          you came from)
                 archive  ->  settings (your data: export / import)

   ritual.js owns the initial onboarding -> today transition. nav.js owns every
   transition after that, toggling the [hidden] attribute. Today is always for
   writing: a today-cell or today-dot jumps straight to the writing screen.
   ============================================================================ */

(() => {
  const { todayId } = window.CDate;
  const ids = ['onboarding', 'ritual', 'archive', 'thread', 'reader', 'settings', 'theme-view', 'timeline-view'];
  const screens = ids.map((id) => document.getElementById(id));
  let readerOrigin = 'thread';   // where the reader's back button returns to
  let themeOrigin = 'archive';   // where the theme view's back button returns to

  function show(id) {
    screens.forEach((s) => { s.hidden = s.id !== id; });
    window.scrollTo(0, 0);
  }
  const monthOf = (id) => [parseInt(id.slice(0, 4), 10), parseInt(id.slice(5, 7), 10) - 1];

  async function openReaderFor(date, origin) {
    if (date === todayId()) { show('ritual'); return; } // today is for writing
    const entry = await DB.getEntry(date);
    if (!entry || !entry.text || !entry.text.trim()) return;
    readerOrigin = origin;
    const d = new Date(entry.id + 'T00:00:00');
    document.getElementById('reader-weekday').textContent = d.toLocaleDateString(undefined, { weekday: 'long' });
    document.getElementById('reader-date').textContent = d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('reader-age').textContent = entry.age != null ? `Age ${entry.age}` : '';
    document.getElementById('reader-text').textContent = entry.text;
    show('reader');
  }
  window.Nav = { show, openReaderFor };

  // today <-> archive
  document.getElementById('to-archive').addEventListener('click', async () => {
    await Heatmap.render();
    await Themes.render();
    show('archive');
  });
  ['to-today', 'thread-today', 'reader-today', 'settings-today', 'theme-today', 'timeline-today'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => show('ritual'));
  });

  // settings
  document.querySelectorAll('.to-settings').forEach((el) => el.addEventListener('click', () => show('settings')));
  document.getElementById('settings-back').addEventListener('click', () => show('archive'));

  // archive: a day-cell opens its month thread
  document.getElementById('heatmap').addEventListener('click', async (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const date = cell.dataset.date;
    if (date === todayId()) { show('ritual'); return; }
    const [y, m] = monthOf(date);
    await Thread.open(y, m);
    show('thread');
  });

  // archive: a theme chip opens the focused theme view; "see them over time"
  // opens the timeline of every recurring word.
  document.getElementById('themes').addEventListener('click', async (e) => {
    if (e.target.closest('.themes-more')) {
      await Timeline.render();
      show('timeline-view');
      return;
    }
    const chip = e.target.closest('.theme');
    if (chip && Themes.openTheme(chip.dataset.word)) { themeOrigin = 'archive'; show('theme-view'); }
  });
  document.getElementById('theme-back').addEventListener('click', () => show(themeOrigin));

  // timeline: back to archive; a word opens its theme drill-in; a mark opens
  // that day. Reached from here, the theme view returns to the timeline.
  document.getElementById('timeline-back').addEventListener('click', () => show('archive'));
  document.getElementById('timeline-host').addEventListener('click', (e) => {
    const label = e.target.closest('.tl-label');
    if (label && Themes.openTheme(label.dataset.word)) { themeOrigin = 'timeline-view'; show('theme-view'); return; }
    const dot = e.target.closest('.tl-dot');
    if (dot) openReaderFor(dot.dataset.date, 'timeline-view');
  });
  document.getElementById('theme-entries').addEventListener('click', (e) => {
    const row = e.target.closest('.theme-entry');
    if (row) openReaderFor(row.dataset.date, 'theme-view');
  });

  // thread: a written day opens the reader
  document.getElementById('thread-back').addEventListener('click', () => show('archive'));
  document.getElementById('thread-track').addEventListener('click', (e) => {
    const dot = e.target.closest('.tdot');
    if (dot) openReaderFor(dot.dataset.date, 'thread');
  });

  // reader: back to wherever it was opened from
  document.getElementById('reader-back').addEventListener('click', () => show(readerOrigin));

  // Esc steps back one level
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const vis = (id) => !document.getElementById(id).hidden;
    if (vis('reader')) show(readerOrigin);
    else if (vis('theme-view')) show(themeOrigin);
    else if (vis('timeline-view')) show('archive');
    else if (vis('settings')) show('archive');
    else if (vis('thread')) show('archive');
    else if (vis('archive')) show('ritual');
  });
})();
