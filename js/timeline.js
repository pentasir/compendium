/* ============================================================================
   timeline.js: "what you keep returning to", over time.

   The deeper view behind the theme bars. Each recurring word becomes a thread
   along a shared timeline (first entry -> today); the days it appeared are
   ember marks, and a faint band shows its active span. A thread that clusters
   is a phase you moved through; one that runs the whole width is a loop you
   keep circling. The premise, made visible.

   Reads the same {word, days[]} shape patterns.js already produces. Navigation
   (click a word -> the theme drill-in, click a mark -> that day) lives in
   nav.js, so this module only computes and draws.
   ============================================================================ */

const Timeline = (() => {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAY = 86400000;
  const ms = (id) => new Date(id + 'T00:00:00').getTime();
  const clamp = (n) => Math.max(0, Math.min(100, n));
  const fmt = (id) => new Date(id + 'T00:00:00')
    .toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  async function render() {
    const host = document.getElementById('timeline-host');
    const written = (await DB.allEntries()).filter((e) => e.text && e.text.trim());

    if (written.length === 0) {
      host.innerHTML = '<p class="tl-empty">Your threads gather here as words begin to repeat across days. There is nothing yet.</p>';
      return;
    }
    const themes = Patterns.themeIndex(written, { minDays: 2, limit: 14 });
    if (themes.length === 0) {
      host.innerHTML = '<p class="tl-empty">Nothing has recurred across days yet. As your words start to repeat, the threads you circle will appear here.</p>';
      return;
    }

    // domain: earliest written day -> today
    const minId = written.map((e) => e.id).sort()[0];
    const min = ms(minId);
    const max = Math.max(ms(window.CDate.todayId()), min + DAY);
    const span = max - min;
    const pct = (id) => clamp(((ms(id) - min) / span) * 100);

    // month axis, thinned so labels never crowd
    let axis = '<div class="tl-axis"><span class="tl-spacer"></span><span class="tl-axisline">';
    let cur = new Date(new Date(min).getFullYear(), new Date(min).getMonth(), 1);
    let lastX = -100;
    while (cur.getTime() <= max) {
      const x = ((cur.getTime() - min) / span) * 100;
      if (x >= 0 && x <= 100 && x - lastX >= 6) {
        const label = cur.getMonth() === 0 ? cur.getFullYear() : MONTHS[cur.getMonth()];
        axis += `<span style="left:${x}%">${label}</span>`;
        lastX = x;
      }
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    axis += '</span></div>';

    const rows = themes.map((t) => {
      const first = pct(t.days[0]);
      const last = pct(t.days[t.days.length - 1]);
      const dots = t.days
        .map((id) => `<span class="tl-dot" data-date="${id}" style="left:${pct(id)}%"></span>`)
        .join('');
      return `<div class="tl-row">` +
        `<button type="button" class="tl-label" data-word="${t.word}">` +
          `<span class="tl-word">${t.word}</span>` +
          `<span class="tl-count">${t.count} ${t.count === 1 ? 'day' : 'days'}</span>` +
        `</button>` +
        `<div class="tl-track">` +
          `<span class="tl-span" style="left:${first}%; width:${Math.max(last - first, 0.6)}%"></span>` +
          dots +
        `</div>` +
      `</div>`;
    }).join('');

    host.innerHTML = axis + rows;
  }

  // one tooltip for the marks, wired once to the persistent host
  function initTip() {
    const host = document.getElementById('timeline-host');
    if (!host) return;
    const tip = document.createElement('div');
    tip.className = 'tl-tip';
    document.body.appendChild(tip);
    host.addEventListener('mouseover', (e) => {
      const dot = e.target.closest('.tl-dot');
      if (!dot) return;
      tip.textContent = fmt(dot.dataset.date);
      tip.classList.add('on');
    });
    host.addEventListener('mousemove', (e) => {
      if (!tip.classList.contains('on')) return;
      let x = e.clientX + 14, y = e.clientY + 16;
      if (x + tip.offsetWidth > window.innerWidth - 8) x = e.clientX - tip.offsetWidth - 14;
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
    });
    host.addEventListener('mouseout', (e) => {
      if (e.target.closest('.tl-dot')) tip.classList.remove('on');
    });
  }
  initTip();

  return { render };
})();
