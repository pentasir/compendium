/* ============================================================================
   nav.js: moves between screens after boot. The descent:

     today  <->  archive (heatmap)
                   |  click a day-cell
                   v
                 thread (that day's month, day by day)
                   |  click a written day
                   v
                 reader (the full entry, read-only)

   ritual.js owns the initial onboarding -> today transition. nav.js owns every
   transition after that, toggling the [hidden] attribute (which, per the CSS,
   genuinely removes a screen from layout and focus order). Today is always for
   writing: a today-cell or today-dot jumps straight to the writing screen.
   ============================================================================ */

(() => {
  const { todayId } = window.CDate;
  const screens = ['onboarding', 'ritual', 'archive', 'thread', 'reader', 'settings']
    .map((id) => document.getElementById(id));

  function show(id) {
    screens.forEach((s) => { s.hidden = s.id !== id; });
    window.scrollTo(0, 0);
  }

  const monthOf = (id) => [parseInt(id.slice(0, 4), 10), parseInt(id.slice(5, 7), 10) - 1];

  // today <-> archive
  document.getElementById('to-archive').addEventListener('click', async () => {
    await Heatmap.render();
    await Themes.render();
    show('archive');
  });

  // every "Write today" button and the today markers return to writing
  ['to-today', 'thread-today', 'reader-today', 'settings-today'].forEach((id) =>
    document.getElementById(id).addEventListener('click', () => show('ritual')));

  // settings (reached from the archive nav)
  document.querySelectorAll('.to-settings').forEach((el) =>
    el.addEventListener('click', () => show('settings')));
  document.getElementById('settings-back').addEventListener('click', () => show('archive'));

  // archive: click a day-cell -> open its month thread (today -> writing)
  document.getElementById('heatmap').addEventListener('click', async (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const date = cell.dataset.date;
    if (date === todayId()) { show('ritual'); return; }
    const [y, m] = monthOf(date);
    await Thread.open(y, m);
    show('thread');
  });

  // thread: back to archive, or click a written day -> reader (today -> writing)
  document.getElementById('thread-back').addEventListener('click', () => show('archive'));
  document.getElementById('thread-track').addEventListener('click', async (e) => {
    const dot = e.target.closest('.tdot');
    if (!dot) return;
    const date = dot.dataset.date;
    if (date === todayId()) { show('ritual'); return; }
    const entry = await DB.getEntry(date);
    if (entry && entry.text && entry.text.trim()) {
      openReader(entry);
      show('reader');
    }
  });

  // reader: back returns to the month thread it was opened from
  document.getElementById('reader-back').addEventListener('click', () => show('thread'));

  // Esc steps back one level: reader -> thread -> archive -> today
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const vis = (id) => !document.getElementById(id).hidden;
    if (vis('reader')) show('thread');
    else if (vis('settings')) show('archive');
    else if (vis('thread')) show('archive');
    else if (vis('archive')) show('ritual');
    // on today / onboarding there is nowhere further back
  });

  function openReader(entry) {
    const d = new Date(entry.id + 'T00:00:00');
    document.getElementById('reader-weekday').textContent =
      d.toLocaleDateString(undefined, { weekday: 'long' });
    document.getElementById('reader-date').textContent =
      d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('reader-age').textContent =
      entry.age != null ? `Age ${entry.age}` : '';
    document.getElementById('reader-text').textContent = entry.text;
  }
})();
