/* ============================================================================
   themes.js: "what you keep returning to". The heart of the premise.

   The archive lists the words that recur across your entries (computed locally,
   no AI). Clicking one opens a focused view of every day you wrote about it,
   each with a snippet showing the word in context; clicking an entry reads the
   full day. So a theme takes you straight to what you actually said, not just
   to where on the calendar it lives.

   Tokens come from patterns.js and are lowercase letters only, safe in markup.
   ============================================================================ */

const Themes = (() => {
  let themes = [];
  let entriesById = new Map();

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // a window of text around the first mention of the word, with every
  // occurrence emphasised
  function snippet(text, word) {
    const clean = text.replace(/\s+/g, ' ').trim();
    const i = clean.toLowerCase().indexOf(word);
    let s, lead = false, trail = false;
    if (i < 0) {
      s = clean.slice(0, 150); trail = clean.length > 150;
    } else {
      const start = Math.max(0, i - 70);
      const end = Math.min(clean.length, i + word.length + 90);
      s = clean.slice(start, end); lead = start > 0; trail = end < clean.length;
    }
    const re = new RegExp('(' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    const html = escapeHtml(s).replace(re, '<mark>$1</mark>');
    return (lead ? '… ' : '') + html + (trail ? ' …' : '');
  }

  async function render() {
    const host = document.getElementById('themes');
    const written = (await DB.allEntries()).filter((e) => e.text && e.text.trim());
    entriesById = new Map(written.map((e) => [e.id, e]));

    if (written.length === 0) { host.innerHTML = ''; themes = []; return; }

    themes = Patterns.themeIndex(written, { minDays: 2, limit: 24 });
    if (themes.length === 0) {
      host.innerHTML =
        '<p class="themes-label">What you keep returning to</p>' +
        '<p class="themes-hint">Nothing has recurred across days yet. As your words start to repeat, the themes you circle will gather here.</p>';
      return;
    }

    // size encodes recurrence: the words you return to most grow largest, so the
    // list stays scannable however many words gather over time
    const max = themes[0].count;            // themes are sorted by count desc
    const min = themes[themes.length - 1].count;
    const sizeFor = (c) => {
      if (max === min) return 1.25;
      return (1.0 + ((c - min) / (max - min)) * 0.85).toFixed(2); // 1.0rem .. 1.85rem
    };

    host.innerHTML =
      '<p class="themes-label">What you keep returning to</p>' +
      '<div class="theme-cloud">' +
      themes.map((t) =>
        `<button type="button" class="theme" data-word="${t.word}" ` +
        `style="font-size:${sizeFor(t.count)}rem" title="${t.count} days">${t.word}</button>`).join('') +
      '</div>';
  }

  // build the focused view for one theme; returns false if unknown
  function openTheme(word) {
    const theme = themes.find((t) => t.word === word);
    if (!theme) return false;

    document.getElementById('theme-view-title').textContent = word;
    const n = theme.count;
    document.getElementById('theme-view-sub').textContent =
      `You returned to this on ${n} ${n === 1 ? 'day' : 'days'}.`;

    const days = theme.days.slice().sort((a, b) => (a < b ? 1 : -1)); // newest first
    document.getElementById('theme-entries').innerHTML = days.map((id) => {
      const e = entriesById.get(id);
      if (!e) return '';
      const d = new Date(id + 'T00:00:00');
      const dateStr = d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
      const ageStr = e.age != null ? `age ${e.age}` : '';
      return `<button type="button" class="theme-entry" data-date="${id}">` +
        `<span class="te-date">${dateStr}<span class="te-age">${ageStr}</span></span>` +
        `<span class="te-snippet">${snippet(e.text, word)}</span></button>`;
    }).join('');
    return true;
  }

  return { render, openTheme };
})();
