/* ============================================================================
   util.js: shared date and age helpers.
   "Today" is always local, never UTC, because the ritual belongs to wherever
   the writer is. Age is computed against a given day so the heatmap can show
   the age you were in any past year, not just now.
   ============================================================================ */

window.CDate = (() => {
  const pad = (n) => String(n).padStart(2, '0');

  // the storage key for a given day: "YYYY-MM-DD", in local time
  function todayId(d = new Date()) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function iso(y, m, d) { return `${y}-${pad(m)}-${pad(d)}`; }

  // full years old on a given day
  function ageOn(birthISO, d = new Date()) {
    const b = new Date(birthISO + 'T00:00:00');
    let age = d.getFullYear() - b.getFullYear();
    const hadBirthday =
      d.getMonth() > b.getMonth() ||
      (d.getMonth() === b.getMonth() && d.getDate() >= b.getDate());
    if (!hadBirthday) age -= 1;
    return age;
  }

  return { pad, todayId, iso, ageOn };
})();
