/* ============================================================================
   patterns.js: local-only theme detection. No AI, no API.

   Phase 1 uses only tokenize(), so every saved entry already carries the
   tokens the later theme views (Phase 4 thread colouring, the constellation)
   will read. Building the data shape now means those phases are pure UI work.
   ============================================================================ */

const Patterns = (() => {
  // A small, deliberately conservative stopword list. The goal is to surface
  // what someone keeps *returning* to, so we strip the connective tissue of
  // language but keep anything that could carry meaning.
  const STOP = new Set((
    'the a an and or but if then so because as of to in on at by for with from ' +
    'into over under again further is are was were be been being am do does did ' +
    'doing have has had having i me my myself we our ours you your yours he him ' +
    'his she her it its they them their this that these those what which who whom ' +
    'will would can could should just about up down out not no nor too very ' +
    'there here when where why how all any both each more most other some such ' +
    'than only own same s t now also get got like really thing things much'
  ).split(' '));

  function tokenize(text) {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z\s'-]/g, ' ')
      .split(/\s+/)
      .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
      .filter((w) => w.length > 2 && !STOP.has(w));
  }

  function wordCount(text) {
    const t = (text || '').trim();
    return t ? t.split(/\s+/).length : 0;
  }

  // Frequency of each token across many entries: the raw material for
  // "you've returned to X N times." (Surfaced in a later phase.)
  function themeFrequency(entries) {
    const freq = new Map();
    for (const e of entries) {
      for (const tok of new Set(e.tokens || [])) { // count once per day
        freq.set(tok, (freq.get(tok) || 0) + 1);
      }
    }
    return [...freq.entries()].sort((a, b) => b[1] - a[1]);
  }

  return { tokenize, wordCount, themeFrequency };
})();
