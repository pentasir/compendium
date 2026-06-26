/* ============================================================================
   nav.js: moves between the three screens after boot.
     today   <-> archive   (the heatmap)
     archive  -> reader     (a single past day, read-only)

   ritual.js owns the initial onboarding -> today transition. nav.js only
   reacts to navigation the writer initiates, toggling the [hidden] attribute
   (which, per the CSS, genuinely removes a screen from layout and focus order).
   ============================================================================ */

(() => {
  const { todayId } = window.CDate;
  const screens = ['onboarding', 'ritual', 'archive', 'reader']
    .map((id) => document.getElementById(id));

  function show(id) {
    screens.forEach((s) => { s.hidden = s.id !== id; });
    window.scrollTo(0, 0);
  }

  // today <-> archive
  document.getElementById('to-archive').addEventListener('click', async () => {
    await Heatmap.render();
    show('archive');
  });
  document.getElementById('to-today').addEventListener('click', () => show('ritual'));
  document.getElementById('reader-back').addEventListener('click', () => show('archive'));

  // click a day in the heatmap
  document.getElementById('heatmap').addEventListener('click', async (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const date = cell.dataset.date;

    if (date === todayId()) { show('ritual'); return; } // today is for writing

    const entry = await DB.getEntry(date);
    if (entry && entry.text && entry.text.trim()) {
      openReader(entry);
      show('reader');
    }
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
