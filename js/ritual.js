/* ============================================================================
   ritual.js: the daily writing loop and its guardrails.

   The product's spine is one rule: you can only write today's entry, today.
   That rule is enforced here, not by convention:
     • the entry key is today's date, computed at open time
     • createdAt is stamped by the device clock, never supplied by the user
     • there is no date picker, no backdating, no import-as-entry
     • a past day, once its date has passed, opens read-only
   ============================================================================ */

(() => {
  const onboarding = document.getElementById('onboarding');
  const ritual     = document.getElementById('ritual');
  const entryEl    = document.getElementById('entry');
  const promptEl   = document.getElementById('prompt');
  const statusEl   = document.getElementById('status');
  const countEl    = document.getElementById('count');
  const weekdayEl  = document.getElementById('weekday');
  const fullDateEl = document.getElementById('full-date');
  const ageLineEl  = document.getElementById('age-line');
  const form       = document.getElementById('birthdate-form');
  const tipEl      = document.getElementById('tip');
  const tipDismiss = document.getElementById('tip-dismiss');

  // date + age helpers live in util.js (shared with the heatmap)
  const { todayId, ageOn } = window.CDate;

  function paintDateline(birthISO) {
    const now = new Date();
    weekdayEl.textContent  = now.toLocaleDateString(undefined, { weekday: 'long' });
    fullDateEl.textContent = now.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    if (birthISO) ageLineEl.textContent = `Age ${ageOn(birthISO, now)}`;
  }

  // ── autosave ──────────────────────────────────────────────────────────────
  let saveTimer = null;
  let birthdate = null;

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 700); // a pause in writing, not every keystroke
  }

  async function save() {
    const text = entryEl.value;
    const id = todayId();
    const entry = {
      id,
      createdAt: Date.now(),          // device clock: the proof of presence
      age: birthdate ? ageOn(birthdate) : null,
      text,
      wordCount: Patterns.wordCount(text),
      tokens: Patterns.tokenize(text),
    };
    await DB.putEntry(entry);
    breathe('Saved');
  }

  function breathe(msg) {
    statusEl.textContent = msg;
    statusEl.classList.remove('breath');
    void statusEl.offsetWidth;        // restart the animation
    statusEl.classList.add('breath');
  }

  function reflectState() {
    const has = entryEl.value.trim().length > 0;
    ritual.classList.toggle('writing', has);
    const c = Patterns.wordCount(entryEl.value);
    countEl.textContent = c ? `${c} ${c === 1 ? 'word' : 'words'}` : '';
  }

  // ── birthdate entry: three typed fields, no calendar to scroll ──────────────
  function setupBirthdateForm() {
    const dd = document.getElementById('dob-day');
    const mm = document.getElementById('dob-month');
    const yyyy = document.getElementById('dob-year');
    const errEl = document.getElementById('dob-error');
    const order = [dd, mm, yyyy];

    // keep fields numeric, and walk forward/back as they fill or empty
    order.forEach((field, i) => {
      field.addEventListener('input', () => {
        field.value = field.value.replace(/\D/g, '').slice(0, field.maxLength);
        clearError();
        if (field.value.length === field.maxLength && order[i + 1]) order[i + 1].focus();
      });
      field.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && field.value === '' && order[i - 1]) {
          order[i - 1].focus();
        }
      });
    });
    // a pasted "14/06/1996" or "1996-06-14" fans out across the three fields
    dd.addEventListener('paste', (e) => {
      const raw = (e.clipboardData || window.clipboardData).getData('text');
      const nums = raw.match(/\d+/g);
      if (!nums) return;
      e.preventDefault();
      if (nums.length >= 3) {
        // assume the year is the 4-digit chunk; the rest are day & month in field order
        const yearIdx = nums.findIndex((n) => n.length === 4);
        const year = yearIdx > -1 ? nums.splice(yearIdx, 1)[0] : nums.pop();
        dd.value = (nums[0] || '').slice(0, 2);
        mm.value = (nums[1] || '').slice(0, 2);
        yyyy.value = year.slice(0, 4);
      }
      yyyy.focus();
    });

    function clearError() { errEl.hidden = true; errEl.textContent = ''; }
    function showError(msg) { errEl.hidden = false; errEl.textContent = msg; }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = parseInt(dd.value, 10);
      const m = parseInt(mm.value, 10);
      const y = parseInt(yyyy.value, 10);

      if (!dd.value || !mm.value || !yyyy.value) return showError('Enter your full date of birth.');
      if (yyyy.value.length < 4)                 return showError('Enter the full four-digit year.');

      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const probe = new Date(iso + 'T00:00:00');
      const realDate =
        probe.getFullYear() === y && probe.getMonth() === m - 1 && probe.getDate() === d;

      if (!realDate)                  return showError('That isn’t a real date.');
      if (probe > new Date())         return showError('That date is in the future.');
      if (y < 1900)                   return showError('Please check the year.');

      await DB.saveSettings({ birthdate: iso, createdAt: Date.now() });
      onboarding.hidden = true;
      startRitual(iso);
    });

    dd.focus();
  }

  // ── boot ────────────────────────────────────────────────────────────────────
  async function boot() {
    const settings = await DB.getSettings();

    if (!settings || !settings.birthdate) {
      onboarding.hidden = false;
      setupBirthdateForm();
      return;
    }
    startRitual(settings.birthdate, settings.tipsHidden);
  }

  function setupTip(tipsHidden) {
    if (tipsHidden) return;          // permanently dismissed
    tipEl.hidden = false;
    tipDismiss.addEventListener('click', async () => {
      tipEl.hidden = true;
      await DB.updateSettings({ tipsHidden: true });
    }, { once: true });
  }

  async function startRitual(birthISO, tipsHidden) {
    birthdate = birthISO;
    paintDateline(birthISO);
    setupTip(tipsHidden);
    ritual.hidden = false;

    const existing = await DB.getEntry(todayId());
    if (existing) {
      entryEl.value = existing.text;
    }
    reflectState();

    // Today is always editable until it stops being today. (A future midnight
    // check / past-day routing closes the window; the data already supports it
    // because every entry is keyed and timestamped by date.)
    entryEl.addEventListener('input', () => { reflectState(); scheduleSave(); });
    window.addEventListener('beforeunload', () => { if (saveTimer) save(); });

    entryEl.focus();
  }

  boot();
})();
