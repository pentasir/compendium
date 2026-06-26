/* ============================================================================
   thread.js: the month drilldown. One bead per day of a single month, laid out
   as a string of dots (a "thread"), coloured by how much was written. Hovering
   or focusing a day previews it; clicking a written day opens the full entry.

   This is the intimate middle level between the heatmap (a whole life) and the
   reader (a single day). Dots are round here, deliberately distinct from the
   square cells of the heatmap.
   ============================================================================ */

const Thread = (() => {
  const { iso, ageOn, todayId } = window.CDate;

  // data for the currently open month, read by the preview handlers
  let byDate = new Map();
  let birthISO = null;

  const titleEl   = () => document.getElementById('thread-title');
  const trackEl   = () => document.getElementById('thread-track');
  const previewEl = () => document.getElementById('thread-preview');

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function open(year, month /* 0-based */) {
    const [entries, settings] = await Promise.all([DB.allEntries(), DB.getSettings()]);
    byDate = new Map(entries.map((e) => [e.id, e]));
    birthISO = settings ? settings.birthdate : null;

    const now = new Date();
    const monthName = new Date(year, month, 1)
      .toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const age = birthISO ? ageOn(birthISO, new Date(year, month, 15)) : null;
    titleEl().innerHTML =
      `${monthName}` + (age != null ? ` <span class="thread-age">age ${age}</span>` : '');

    const track = trackEl();
    track.innerHTML = '';
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = todayId(now);

    for (let d = 1; d <= daysInMonth; d++) {
      const id = iso(year, month + 1, d);
      const entry = byDate.get(id);
      const future = new Date(year, month, d) > now;

      const day = document.createElement('div');
      day.className = 'tday';

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `tdot lvl-${entry ? Heatmap.level(entry.wordCount) : 0}`;
      if (id === todayKey) dot.classList.add('is-today');
      if (future) dot.classList.add('is-future');
      dot.dataset.date = id;
      dot.setAttribute('aria-label', new Date(id + 'T00:00:00')
        .toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }));

      const num = document.createElement('span');
      num.className = 'tnum';
      num.textContent = d;

      day.appendChild(dot);
      day.appendChild(num);
      track.appendChild(day);
    }
    defaultPreview();
  }

  function renderPreview(id) {
    const entry = byDate.get(id);
    const d = new Date(id + 'T00:00:00');
    const dateStr = d.toLocaleDateString(undefined,
      { weekday: 'long', day: 'numeric', month: 'long' });
    const ageStr = birthISO ? `age ${ageOn(birthISO, d)}` : '';
    const head = `<p class="pv-date">${dateStr}<span class="pv-age">${ageStr}</span></p>`;

    if (entry && entry.text && entry.text.trim()) {
      const clean = entry.text.trim().replace(/\s+/g, ' ');
      const snip = escapeHtml(clean.slice(0, 160)) + (clean.length > 160 ? '…' : '');
      previewEl().innerHTML = head +
        `<p class="pv-snip">${snip}</p>` +
        `<p class="pv-meta">${entry.wordCount} ${entry.wordCount === 1 ? 'word' : 'words'} · click to read</p>`;
    } else {
      previewEl().innerHTML = head + `<p class="pv-empty">Nothing written this day.</p>`;
    }
  }

  function defaultPreview() {
    previewEl().innerHTML =
      `<p class="pv-hint">Hover a day to preview it. Click a written day to read it.</p>`;
  }

  // preview on hover / keyboard focus, wired once
  function init() {
    const track = trackEl();
    const handle = (e) => {
      const dot = e.target.closest('.tdot');
      if (dot) renderPreview(dot.dataset.date);
    };
    track.addEventListener('mouseover', handle);
    track.addEventListener('focusin', handle);
    track.addEventListener('mouseleave', defaultPreview);
  }
  init();

  return { open };
})();
