/* ============================================================================
   themes.js: "what you keep returning to". This is the heart of the premise.

   It reads the recurring words across your entries (computed locally, no AI),
   lists them on the archive, and lets you click one to light up every day it
   appears on across your heatmap, so a loop in your thinking becomes visible.

   Tokens come from patterns.js and are lowercase letters only, so they are safe
   to place in markup without escaping.
   ============================================================================ */

const Themes = (() => {
  function clearHighlight(heatmap, list, status) {
    list.querySelectorAll('.theme').forEach((b) => b.classList.remove('active'));
    heatmap.querySelectorAll('.cell.is-marked').forEach((c) => c.classList.remove('is-marked'));
    heatmap.classList.remove('filtered');
    if (status) status.textContent = '';
  }

  async function render() {
    const host = document.getElementById('themes');
    const written = (await DB.allEntries()).filter((e) => e.text && e.text.trim());

    // nothing written yet: let the heatmap's empty state speak instead
    if (written.length === 0) { host.innerHTML = ''; return; }

    const themes = Patterns.themeIndex(written, { minDays: 2, limit: 12 });
    if (themes.length === 0) {
      host.innerHTML =
        '<p class="themes-label">What you keep returning to</p>' +
        '<p class="themes-hint">Nothing has recurred across days yet. As your words start to repeat, the themes you circle will gather here.</p>';
      return;
    }

    host.innerHTML =
      '<p class="themes-label">What you keep returning to</p>' +
      '<div class="theme-list">' +
      themes.map((t) =>
        `<button type="button" class="theme" data-word="${t.word}">` +
        `${t.word}<span class="theme-count">${t.count}</span></button>`).join('') +
      '</div>' +
      '<p class="themes-status" id="themes-status"></p>';

    const heatmap = document.getElementById('heatmap');
    const list = host.querySelector('.theme-list');
    const status = document.getElementById('themes-status');

    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme');
      if (!btn) return;
      const active = btn.classList.contains('active');
      clearHighlight(heatmap, list, status); // selecting is single-choice; re-clicking clears
      if (active) return;

      btn.classList.add('active');
      const theme = themes.find((t) => t.word === btn.dataset.word);
      const days = new Set(theme.days);
      heatmap.querySelectorAll('.cell').forEach((c) => {
        if (days.has(c.dataset.date)) c.classList.add('is-marked');
      });
      heatmap.classList.add('filtered');
      status.textContent =
        `“${theme.word}” appears on ${theme.count} ${theme.count === 1 ? 'day' : 'days'}`;
    });
  }

  return { render };
})();
