/* ============================================================================
   backup.js: export and import entries as Obsidian-compatible Markdown.

   Compendium is a browser app, so it cannot silently read or write a folder of
   files the way Obsidian does. Instead it makes your entries fully portable:
   export downloads a .zip of one Markdown file per day (with YAML frontmatter),
   which you can drop straight into an Obsidian vault, commit to git, or stash in
   any synced folder. Import reads those files back, merging without ever
   overwriting an entry you already have.

   Everything is vanilla, including a minimal store-only (uncompressed) ZIP
   writer and reader, so there is still no dependency and nothing leaves the
   device except the file you choose to save.
   ============================================================================ */

const Backup = (() => {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  // ── CRC32 (required by the ZIP format) ──────────────────────────────────
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  const u16 = (n) => new Uint8Array([n & 255, (n >> 8) & 255]);
  const u32 = (n) => new Uint8Array([n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255]);
  function concat(arrs) {
    let len = 0; for (const a of arrs) len += a.length;
    const out = new Uint8Array(len); let o = 0;
    for (const a of arrs) { out.set(a, o); o += a.length; }
    return out;
  }

  // ── store-only ZIP writer (sizes in the local header; no data descriptor) ─
  function makeZip(files) { // files: [{name, data:Uint8Array}]
    const parts = [], central = []; let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name);
      const crc = crc32(f.data);
      const size = f.data.length;
      const local = concat([
        u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(size), u32(size), u16(name.length), u16(0),
      ]);
      parts.push(local, name, f.data);
      central.push(concat([
        u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(size), u32(size), u16(name.length),
        u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
      ]));
      offset += local.length + name.length + f.data.length;
    }
    const cd = concat(central);
    const eocd = concat([
      u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
      u32(cd.length), u32(offset), u16(0),
    ]);
    return new Blob([...parts, cd, eocd], { type: 'application/zip' });
  }

  // ── store-only ZIP reader (only reads what makeZip writes) ───────────────
  function parseZip(buffer) {
    const dv = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const out = [];
    let i = 0;
    while (i + 4 <= bytes.length && dv.getUint32(i, true) === 0x04034b50) {
      const size = dv.getUint32(i + 18, true);
      const nameLen = dv.getUint16(i + 26, true);
      const extraLen = dv.getUint16(i + 28, true);
      const nameStart = i + 30;
      const name = dec.decode(bytes.subarray(nameStart, nameStart + nameLen));
      const dataStart = nameStart + nameLen + extraLen;
      out.push({ name, data: bytes.subarray(dataStart, dataStart + size) });
      i = dataStart + size;
    }
    return out;
  }

  // ── entry <-> markdown ───────────────────────────────────────────────────
  function toMarkdown(e) {
    const words = e.wordCount ?? Patterns.wordCount(e.text);
    return `---\ndate: ${e.id}\nage: ${e.age ?? ''}\nwords: ${words}\n---\n\n${e.text}\n`;
  }
  function fromMarkdown(name, text) {
    let date = null, age = null, body = text;
    const fm = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
    if (fm) {
      const d = fm[1].match(/date:\s*(\d{4}-\d{2}-\d{2})/);
      if (d) date = d[1];
      const a = fm[1].match(/age:\s*(\d+)/);
      if (a) age = parseInt(a[1], 10);
      body = text.slice(fm[0].length);
    }
    if (!date) { const n = name.match(/(\d{4}-\d{2}-\d{2})/); if (n) date = n[1]; }
    if (!date) return null;
    body = body.replace(/\s+$/, '');
    return {
      id: date,
      createdAt: new Date(date + 'T12:00:00').getTime(),
      age,
      text: body,
      wordCount: Patterns.wordCount(body),
      tokens: Patterns.tokenize(body),
    };
  }

  function download(blob, name) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function status(msg) {
    const el = document.getElementById('backup-status');
    if (el) el.textContent = msg;
  }

  // ── public actions ───────────────────────────────────────────────────────
  async function exportAll() {
    const entries = (await DB.allEntries())
      .filter((e) => e.text && e.text.trim())
      .sort((a, b) => (a.id < b.id ? -1 : 1));
    if (entries.length === 0) { status('Nothing written yet to export.'); return; }
    const files = entries.map((e) => ({ name: `${e.id}.md`, data: enc.encode(toMarkdown(e)) }));
    download(makeZip(files), `compendium-backup-${window.CDate.todayId()}.zip`);
    status(`Exported ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} as Markdown.`);
  }

  async function importFiles(fileList) {
    const parsed = [];
    for (const file of fileList) {
      if (file.name.endsWith('.zip')) {
        for (const ent of parseZip(await file.arrayBuffer())) {
          if (ent.name.endsWith('.md')) {
            const e = fromMarkdown(ent.name, dec.decode(ent.data));
            if (e) parsed.push(e);
          }
        }
      } else if (file.name.endsWith('.md')) {
        const e = fromMarkdown(file.name, await file.text());
        if (e) parsed.push(e);
      }
    }
    if (parsed.length === 0) { status('No Markdown entries found in that selection.'); return; }
    let imported = 0, skipped = 0;
    for (const e of parsed) {
      if (await DB.getEntry(e.id)) { skipped++; continue; } // never clobber an existing day
      await DB.putEntry(e); imported++;
    }
    status(`Imported ${imported}, kept ${skipped} already on this device.`);
    if (typeof Heatmap !== 'undefined') await Heatmap.render();
    if (typeof Themes !== 'undefined') await Themes.render();
  }

  // ── wire the controls ─────────────────────────────────────────────────────
  document.getElementById('export-md').addEventListener('click', exportAll);
  const input = document.getElementById('import-file');
  input.addEventListener('change', async () => {
    if (input.files.length) await importFiles(input.files);
    input.value = ''; // allow re-importing the same file
  });

  return { exportAll, importFiles };
})();
