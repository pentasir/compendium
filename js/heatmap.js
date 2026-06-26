/* ============================================================================
   heatmap.js: the archive home. A year-by-year grid of your writing life,
   one cell per day, with the age you were down the left. Cell intensity comes
   from how much you wrote that day (wordCount), never from a streak count.

   Years stack newest-first. Each year is a Monday-rows / week-columns grid,
   the same shape as a contribution graph, so a glance reads as "the shape of
   my year."
   ============================================================================ */

const Heatmap = (() => {
  const { iso, ageOn, todayId } = window.CDate;

  // wordCount -> intensity bucket. Deliberately coarse: presence and depth,
  // not precise quantity.
  function level(wc) {
    if (!wc) return 0;
    if (wc <= 25) return 1;
    if (wc <= 70) return 2;
    if (wc <= 150) return 3;
    return 4;
  }

  function yearBlock(year, byDate, birthISO, now) {
    const block = document.createElement('div');
    block.className = 'year-block';

    const label = document.createElement('div');
    label.className = 'year-label';
    // representative age for the year: who you were mid-year
    const age = birthISO ? ageOn(birthISO, new Date(year, 6, 1)) : null;
    label.innerHTML =
      `<span class="yl-year">${year}</span>` +
      (age != null ? `<span class="yl-age">age ${age}</span>` : '');

    const grid = document.createElement('div');
    grid.className = 'year-grid';

    const isThisYear = year === now.getFullYear();
    const startDow = (new Date(year, 0, 1).getDay() + 6) % 7; // Mon=0 .. Sun=6
    const end = isThisYear
      ? new Date(year, now.getMonth(), now.getDate())
      : new Date(year, 11, 31);
    const todayKey = todayId(now);

    const cursor = new Date(year, 0, 1);
    let dayIndex = 0;
    while (cursor <= end) {
      const id = iso(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
      const entry = byDate.get(id);
      const pos = dayIndex + startDow;

      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = `cell lvl-${level(entry ? entry.wordCount : 0)}`;
      if (id === todayKey) cell.classList.add('is-today');
      cell.style.gridColumn = Math.floor(pos / 7) + 1;
      cell.style.gridRow = (pos % 7) + 1;
      cell.dataset.date = id;

      const human = cursor.toLocaleDateString(undefined,
        { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      cell.title = entry ? `${human} · ${entry.wordCount} ${entry.wordCount === 1 ? 'word' : 'words'}` : human;
      cell.setAttribute('aria-label', cell.title);

      grid.appendChild(cell);
      cursor.setDate(cursor.getDate() + 1);
      dayIndex++;
    }

    block.appendChild(label);
    block.appendChild(grid);
    return block;
  }

  async function render() {
    const host = document.getElementById('heatmap');
    const [entries, settings] = await Promise.all([DB.allEntries(), DB.getSettings()]);
    const byDate = new Map(entries.map((e) => [e.id, e]));
    const birthISO = settings ? settings.birthdate : null;

    const now = new Date();
    const thisYear = now.getFullYear();
    let firstYear = thisYear;
    for (const e of entries) {
      const y = parseInt(e.id.slice(0, 4), 10);
      if (y < firstYear) firstYear = y;
    }

    host.innerHTML = '';
    for (let y = thisYear; y >= firstYear; y--) {
      host.appendChild(yearBlock(y, byDate, birthISO, now));
    }
  }

  return { render };
})();
