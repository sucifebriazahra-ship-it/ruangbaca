/* =========================================================================
   ruangbaca — katalog buku dunia
   Sumber (gratis, tanpa API key):
   • Open Library  — ±30 juta judul, data ISBN, sampul, trending
   • Google Books  — kuat untuk buku berbahasa Indonesia & terbitan baru,
                     sinopsis, penerbit, ISBN
   Pencarian bisa memakai judul, penulis, penerbit, atau ISBN (10/13 digit).
   Semua hasil disimpan di cache localStorage agar hemat & cepat.
   ========================================================================= */
(function (global) {
  'use strict';

  const CFG = global.RUANGBACA_CONFIG || {};
  const OL = 'https://openlibrary.org';
  const GB = 'https://www.googleapis.com/books/v1/volumes';
  const GBKEY = CFG.googleBooksKey ? '&key=' + encodeURIComponent(CFG.googleBooksKey) : '';
  const META_KEY = 'ruangbaca.meta.v3'; // v3: sampul diverifikasi (judul & penulis harus cocok)
  const TREND_KEY = 'ruangbaca.trending.v2';
  const OL_FIELDS = 'key,title,author_name,author_key,first_publish_year,number_of_pages_median,cover_i,subject,language,isbn,publisher,edition_count';
  const RECENT_FROM = new Date().getFullYear() - 3;

  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* penuh */ } },
  };
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const mapGenres = (s) => (global.RB_CATALOG ? global.RB_CATALOG.mapGenres(s) : ['Fiksi']);

  /* ---------- ISBN ---------- */
  function cleanIsbn(q) {
    const s = String(q || '').toUpperCase().replace(/[^0-9X]/g, '');
    if (s.length === 13 && /^97[89]\d{10}$/.test(s)) return validIsbn13(s) ? s : null;
    if (s.length === 10 && /^\d{9}[\dX]$/.test(s)) return validIsbn10(s) ? s : null;
    return null;
  }
  function validIsbn13(s) { let t = 0; for (let i = 0; i < 12; i++) t += Number(s[i]) * (i % 2 ? 3 : 1); return (10 - (t % 10)) % 10 === Number(s[12]); }
  function validIsbn10(s) { let t = 0; for (let i = 0; i < 10; i++) t += (s[i] === 'X' ? 10 : Number(s[i])) * (10 - i); return t % 11 === 0; }
  function isbn10to13(s) { const b = '978' + s.slice(0, 9); let t = 0; for (let i = 0; i < 12; i++) t += Number(b[i]) * (i % 2 ? 3 : 1); return b + ((10 - (t % 10)) % 10); }
  function isbn13to10(s) { if (!s.startsWith('978')) return null; const b = s.slice(3, 12); let t = 0; for (let i = 0; i < 9; i++) t += Number(b[i]) * (10 - i); const c = (11 - (t % 11)) % 11; return b + (c === 10 ? 'X' : String(c)); }
  /** ISBN apa pun (10/13, pakai tanda hubung atau tidak) → ISBN-13 baku, atau null bila tidak valid */
  const toIsbn13 = (q) => { const c = cleanIsbn(q); return !c ? null : c.length === 13 ? c : isbn10to13(c); };
  const isbnForms = (q) => { const t = toIsbn13(q); if (!t) return []; const ten = isbn13to10(t); return ten ? [t, ten] : [t]; };
  const sameIsbn = (a, b) => { const x = toIsbn13(a); return !!x && x === toIsbn13(b); };
  const looksLikeIsbn = (q) => /^[\d\s-]{9,17}[\dxX]$/.test(String(q || '').trim());

  async function getJSON(url, ms = 9000) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(() => ctl && ctl.abort(), ms);
    try {
      const r = await fetch(url, ctl ? { signal: ctl.signal } : undefined);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }
  const olCover = (id, size = 'L') => `https://covers.openlibrary.org/b/id/${id}-${size}.jpg`;
  const gbImage = (links) => {
    if (!links) return null;
    const u = links.thumbnail || links.smallThumbnail;
    return u ? u.replace(/^http:/, 'https:').replace('&edge=curl', '').replace('zoom=1', 'zoom=1') : null;
  };
  const stripHtml = (s) => String(s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\n{3,}/g, '\n\n').trim();
  function cleanDesc(d) {
    let s = typeof d === 'string' ? d : (d && d.value) || '';
    s = s.split(/\n-{3,}|\n\*\*\*|\(\[source\]/)[0];
    s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\r/g, '').trim();
    return s.length > 1600 ? s.slice(0, 1600).replace(/\s+\S*$/, '') + '…' : s;
  }
  const isbnFromGB = (v) => {
    const ids = v.industryIdentifiers || [];
    const x = ids.find((i) => i.type === 'ISBN_13') || ids.find((i) => i.type === 'ISBN_10');
    return x ? x.identifier : null;
  };
  const pickIsbn = (arr) => { if (!arr || !arr.length) return null; return arr.find((x) => x.length === 13 && x.startsWith('978')) || arr.find((x) => x.length === 13) || arr[0]; };

  function fromOL(doc) {
    const key = (doc.key || '').replace('/works/', '');
    return {
      id: 'ol-' + key, ol_key: key, source: 'openlibrary',
      title: doc.title, author: (doc.author_name || ['Tanpa nama'])[0],
      year: doc.first_publish_year || null, pages: doc.number_of_pages_median || null,
      genres: mapGenres(doc.subject || []), synopsis: '',
      cover_url: doc.cover_i ? olCover(doc.cover_i) : null,
      isbn: pickIsbn(doc.isbn), publisher: (doc.publisher || [])[0] || null,
      language: (doc.language || []).includes('ind') ? 'id' : (doc.language || [])[0] || null,
    };
  }
  function fromGB(item) {
    const v = item.volumeInfo || {};
    return {
      id: 'gb-' + item.id, ol_key: null, source: 'googlebooks',
      title: v.title + (v.subtitle && v.title.length < 24 ? ': ' + v.subtitle : ''), author: (v.authors || ['Tanpa nama']).join(' & ').slice(0, 120),
      year: v.publishedDate ? Number(String(v.publishedDate).slice(0, 4)) || null : null,
      pages: v.pageCount || null, genres: mapGenres(v.categories || []),
      synopsis: cleanDesc(stripHtml(v.description || '')), cover_url: gbImage(v.imageLinks),
      isbn: isbnFromGB(v), publisher: v.publisher || null, language: v.language || null,
    };
  }

  /* ---------- pengayaan data buku katalog (sampul, halaman, sinopsis, ISBN, penerbit) ---------- */
  const meta = ls.get(META_KEY, {});
  const queue = [];
  const queued = new Set();
  let active = 0;
  const listeners = new Set();
  const failedAt = {};
  const recentlyFailed = (id) => failedAt[id] && Date.now() - failedAt[id] < 10 * 60e3;
  let saveT = null;
  const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => ls.set(META_KEY, meta), 400); };
  /** judul cocok: sama persis, atau salah satunya = judul + subjudul (dipisah ":" "(" "-") */
  function titleMatch(cand, want) {
    const x = norm(cand), y = norm(want);
    if (!x || !y) return false;
    if (x === y) return true;
    const [short, longRaw] = x.length < y.length ? [x, want] : [y, cand];
    const long = norm(longRaw);
    if (!long.startsWith(short + ' ')) return false;
    if (short.split(' ').length >= 3) return true;
    const head = String(longRaw).split(/\s*[:(\u2013\u2014]\s*|\s+-\s+/)[0];
    return norm(head) === short;
  }
  const sameTitle = titleMatch;
  /** penulis cocok: minimal satu kata nama (≥3 huruf) sama */
  function authorMatch(cands, want) {
    const w = norm(String(want).split('&')[0]).split(' ').filter((x) => x.length >= 3);
    if (!w.length) return true;
    return (cands || []).some((c) => { const n = ' ' + norm(c) + ' '; return w.some((x) => n.includes(' ' + x + ' ')); });
  }
  /** pastikan gambar sampul benar-benar ada (bukan 404 / gambar kosong 1×1) */
  function probe(url, ms = 9000) {
    return new Promise((resolve) => {
      if (!url || typeof Image === 'undefined') { resolve(!!url); return; }
      const img = new Image();
      let done = false;
      const fin = (ok) => { if (!done) { done = true; resolve(ok); } };
      img.onload = () => fin(img.naturalWidth > 40 && img.naturalHeight > 40);
      img.onerror = () => fin(false);
      setTimeout(() => fin(false), ms);
      img.src = url;
    });
  }
  /** satu gambar sampul hanya boleh dipakai satu buku → tidak ada sampul "ganda" */
  const coverOwner = new Map();
  Object.keys(meta).forEach((id) => { const u = meta[id] && meta[id].u; if (u && !coverOwner.has(u)) coverOwner.set(u, id); });

  const gbMeta = (v) => ({ u: gbImage(v.imageLinks), p: v.pageCount || null, d: cleanDesc(stripHtml(v.description || '')), i: isbnFromGB(v), pub: v.publisher || null, y: v.publishedDate ? Number(String(v.publishedDate).slice(0, 4)) || null : null });
  const gbHasIsbn = (v, forms) => (v.industryIdentifiers || []).some((x) => forms.includes(String(x.identifier).toUpperCase().replace(/[^0-9X]/g, '')));
  async function viaGoogle(book) {
    const a = book.author.split('&')[0].trim();
    const forms = isbnForms(book.isbn);
    let best = null;
    const tries = [];
    if (forms.length) tries.push({ q: `isbn:${forms[0]}`, isbn: true });
    tries.push({ q: `intitle:"${book.title}" inauthor:"${a}"`, lang: book.language === 'id' });
    tries.push({ q: `${book.title} ${a}` });
    for (const t of tries) {
      let j;
      try { j = await getJSON(`${GB}?q=${encodeURIComponent(t.q)}&maxResults=10&printType=books${t.lang ? '&langRestrict=id' : ''}${GBKEY}`); } catch (e) { continue; }
      const items = (j.items || []).map((x) => x.volumeInfo || {})
        .filter((v) => (t.isbn ? gbHasIsbn(v, forms) : titleMatch(v.title, book.title) && authorMatch(v.authors, a)));
      const withImg = items.find((v) => v.imageLinks);
      if (withImg) return gbMeta(withImg);
      if (!best && items[0]) best = gbMeta(items[0]);
    }
    return best;
  }
  async function viaOpenLibrary(book) {
    const a = book.author.split('&')[0].trim();
    const forms = isbnForms(book.isbn);
    const urls = [];
    if (forms.length) urls.push({ u: `${OL}/search.json?isbn=${forms[0]}&limit=3&fields=${OL_FIELDS}`, isbn: true });
    urls.push({ u: `${OL}/search.json?title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(a)}&limit=10&fields=${OL_FIELDS}` });
    let best = null;
    for (const t of urls) {
      let j;
      try { j = await getJSON(t.u); } catch (e) { continue; }
      const docs = (j.docs || []).filter((d) => (t.isbn ? (d.isbn || []).some((x) => forms.includes(x)) : titleMatch(d.title, book.title) && authorMatch(d.author_name, a)));
      const d = docs.find((x) => x.cover_i) || docs[0];
      if (!d) continue;
      const r = { u: d.cover_i ? olCover(d.cover_i) : null, p: d.number_of_pages_median || null, k: (d.key || '').replace('/works/', ''), i: pickIsbn(d.isbn), pub: (d.publisher || [])[0] || null, y: d.first_publish_year || null };
      if (r.u) return r;
      if (!best) best = r;
    }
    return best;
  }
  async function resolveOne(book) {
    const res = { t: Date.now() };
    // buku Indonesia & terbitan baru lebih lengkap di Google Books; sisanya Open Library dulu
    const order = book.language === 'id' || (book.year || 0) >= RECENT_FROM ? [viaGoogle, viaOpenLibrary] : [viaOpenLibrary, viaGoogle];
    const cands = [];
    let ok = false;
    for (const fn of order) {
      try {
        const r = await fn(book);
        if (r) { ok = true; if (r.u) cands.push(r.u); Object.keys(r).forEach((k) => { if (k !== 'u' && r[k] && !res[k]) res[k] = r[k]; }); }
      } catch (e) { /* lanjut ke sumber berikutnya */ }
      if (cands.length && (res.d || book.synopsis) && res.i) break;
    }
    // cadangan: sampul Open Library berdasarkan ISBN (default=false → 404 bila tidak ada)
    const i13 = toIsbn13(book.isbn || res.i);
    if (i13) cands.push(`https://covers.openlibrary.org/b/isbn/${i13}-L.jpg?default=false`);
    for (const u of cands) {
      const owner = coverOwner.get(u);
      if (owner && owner !== book.id) continue;
      if (await probe(u)) { res.u = u; coverOwner.set(u, book.id); break; }
    }
    if (!ok && !res.u) res.err = true;
    return res;
  }
  function pump() {
    while (active < 5 && queue.length) {
      const b = queue.shift();
      active++;
      resolveOne(b).then((res) => {
        if (!res.err) { meta[b.id] = res; persist(); } else failedAt[b.id] = Date.now();
        listeners.forEach((fn) => fn(b.id, res));
      }).finally(() => { active--; queued.delete(b.id); pump(); });
    }
  }

  const API = {
    cleanIsbn, looksLikeIsbn, toIsbn13, isbnForms, sameIsbn, titleMatch, RECENT_FROM,
    /** 'yes' = sampul asli sudah ada, 'no' = sudah dicari tapi tidak ada, 'pending' = belum dicari */
    coverState(book) { if (!book) return 'no'; if (book.cover_url) return 'yes'; const m = meta[book.id]; return !m ? 'pending' : m.u ? 'yes' : 'no'; },
    coverOf(book) { if (!book) return null; if (book.cover_url) return book.cover_url; const m = meta[book.id]; return m && m.u ? m.u : null; },
    pagesOf(book) { if (!book) return 0; if (book.pages) return book.pages; const m = meta[book.id]; return (m && m.p) || 0; },
    /** gabungan data buku + hasil pengayaan (sinopsis, ISBN, penerbit, tahun) */
    metaOf(book) {
      const m = (book && meta[book.id]) || {};
      return { synopsis: book.synopsis || m.d || '', isbn: book.isbn || m.i || null, publisher: book.publisher || m.pub || null, year: book.year || m.y || null, pages: book.pages || m.p || null, olKey: book.ol_key || m.k || null, loaded: !!meta[book.id] };
    },
    queueCover(book) {
      if (!book || queued.has(book.id) || recentlyFailed(book.id)) return;
      const m = meta[book.id];
      const needs = !book.cover_url || (!book.synopsis && book.source === 'katalog');
      if (!needs) return;
      if (m && (m.u || Date.now() - m.t < 3 * 864e5)) return;
      queued.add(book.id); queue.push(book); pump();
    },
    /** paksa pengayaan sekarang (dipakai halaman buku) */
    enrich(book) {
      if (!book || meta[book.id] || queued.has(book.id) || recentlyFailed(book.id)) return;
      queued.add(book.id); queue.unshift(book); pump();
    },
    onCover(fn) { listeners.add(fn); },
    /** lupakan hasil pencarian sampul otomatis (dipakai saat admin mengembalikan ke otomatis) */
    forget(id) { delete meta[id]; delete failedAt[id]; persist(); },

    /** pencarian global: judul / penulis / penerbit / ISBN, dari Open Library + Google Books */
    async searchWorld(q, { limit = 24 } = {}) {
      q = q.trim();
      if (!q) return [];
      const isbn = cleanIsbn(q);
      if (isbn) return API.isbnLookup(isbn);
      const reqs = [getJSON(`${OL}/search.json?q=${encodeURIComponent(q)}&limit=${limit}&fields=${OL_FIELDS}`),
           getJSON(`${GB}?q=${encodeURIComponent(q)}&maxResults=20&printType=books${GBKEY}`),
           getJSON(`${GB}?q=${encodeURIComponent(q)}&maxResults=20&printType=books&langRestrict=id${GBKEY}`)];
      const res = await Promise.allSettled(reqs);
      const out = [], seen = new Map();
      const push = (b) => {
        if (!b.title) return;
        const k = norm(b.title).slice(0, 40) + '|' + norm(b.author).split(' ').pop();
        if (seen.has(k)) {
          const ex = seen.get(k);
          ['cover_url', 'synopsis', 'isbn', 'publisher', 'pages', 'year'].forEach((f) => { if (!ex[f] && b[f]) ex[f] = b[f]; });
          return;
        }
        seen.set(k, b); out.push(b);
      };
      // urutkan: Indonesia dulu bila kuerinya kemungkinan berbahasa Indonesia
      const order = [2, 0, 1];
      order.forEach((i) => {
        const r = res[i];
        if (!r || r.status !== 'fulfilled') return;
        if (r.value.docs) r.value.docs.forEach((d) => push(fromOL(d)));
        if (r.value.items) r.value.items.forEach((it) => push(fromGB(it)));
      });
      if (res.every((r) => r.status === 'rejected')) throw new Error('offline');
      // relevansi sederhana: judul yang mengandung kata kunci di atas
      const nq = norm(q);
      out.sort((a, b) => (norm(b.title).includes(nq) ? 1 : 0) - (norm(a.title).includes(nq) ? 1 : 0));
      return out;
    },

    /** buku trending di Open Library — HANYA terbitan 3 tahun terakhir */
    async trendingWorld(period = 'daily') {
      const c = ls.get(TREND_KEY, {});
      if (c[period] && Date.now() - c[period].t < 6 * 36e5) return c[period].items;
      const recent = (d) => (d.first_publish_year || 0) >= RECENT_FROM;
      let items = [];
      try {
        const score = period === 'daily' ? 'trending_score_hourly_sum:[1 TO *]' : 'trending_score_daily_0:[1 TO *]';
        const q = `${score} AND first_publish_year:[${RECENT_FROM} TO *]`;
        const j = await getJSON(`${OL}/search.json?q=${encodeURIComponent(q)}&sort=trending&limit=40&fields=${OL_FIELDS}`);
        items = (j.docs || []).filter((d) => d.cover_i && recent(d)).map(fromOL);
      } catch (e) { /* coba endpoint lama */ }
      if (items.length < 6) {
        try {
          const j = await getJSON(`${OL}/trending/${period}.json?limit=100`);
          const more = (j.works || []).filter((d) => d.cover_i && recent(d)).map(fromOL);
          const have = new Set(items.map((x) => x.id));
          items.push(...more.filter((x) => !have.has(x.id)));
        } catch (e) { if (!items.length) throw e; }
      }
      c[period] = { t: Date.now(), items };
      ls.set(TREND_KEY, c);
      return items;
    },

    /** detail lengkap buku dari katalog dunia */
    /** rak penerbit / kueri bebas Google Books, dengan paginasi (startIndex) */
    async browse(q, { start = 0, lang = 'id', count = 40 } = {}) {
      const j = await getJSON(`${GB}?q=${encodeURIComponent(q)}&startIndex=${start}&maxResults=${count}&printType=books${lang ? '&langRestrict=' + lang : ''}${GBKEY}`);
      const seen = new Set();
      const items = (j.items || []).map(fromGB).filter((b) => {
        const k = norm(b.title) + '|' + norm(b.author);
        if (!b.title || b.title === 'undefined' || seen.has(k)) return false;
        seen.add(k); return true;
      });
      return { items, total: j.totalItems || 0, next: start + count };
    },
    /** semua karya seorang penulis: Google Books (inauthor) + Open Library */
    async authorWorks(name) {
      const [g1, g2, o] = await Promise.allSettled([
        getJSON(`${GB}?q=${encodeURIComponent(`inauthor:"${name}"`)}&maxResults=40&printType=books${GBKEY}`),
        getJSON(`${GB}?q=${encodeURIComponent(`inauthor:"${name}"`)}&maxResults=40&printType=books&langRestrict=id${GBKEY}`),
        getJSON(`${OL}/search.json?author=${encodeURIComponent(name)}&limit=40&sort=editions&fields=${OL_FIELDS}`),
      ]);
      const n = norm(name);
      const out = []; const seen = new Map();
      const add = (b) => {
        if (!b || !b.title || b.title === 'undefined' || !norm(b.author).includes(n.split(' ')[0])) return;
        const k = norm(b.title).replace(/\b(the|a|an)\b/g, '').slice(0, 40);
        const ex = seen.get(k);
        if (ex) { ['cover_url', 'year', 'isbn', 'publisher', 'pages', 'synopsis'].forEach((f) => { if (!ex[f] && b[f]) ex[f] = b[f]; }); return; }
        seen.set(k, b); out.push(b);
      };
      [g2, g1].forEach((r) => { if (r.status === 'fulfilled') (r.value.items || []).map(fromGB).forEach(add); });
      if (o.status === 'fulfilled') (o.value.docs || []).map(fromOL).forEach(add);
      return out.sort((a, b) => (b.year || 0) - (a.year || 0));
    },
    /** biografi singkat penulis (Open Library, data terbuka) */
    async authorBio(name) {
      const s = await getJSON(`${OL}/search/authors.json?q=${encodeURIComponent(name)}&limit=1`);
      const d = (s.docs || [])[0];
      if (!d) return null;
      let bio = '';
      try { const a = await getJSON(`${OL}/authors/${d.key}.json`); bio = cleanDesc(a.bio); } catch (e) { /* tanpa bio */ }
      return { bio, birth: d.birth_date || null, top: d.top_work || null, works: d.work_count || null, key: d.key };
    },
    /**
     * Pencarian ISBN yang KETAT: hanya mengembalikan buku yang benar-benar memuat ISBN itu
     * (versi 10 & 13 digit disamakan). Tidak ada hasil "mirip".
     */
    async isbnLookup(code) {
      const forms = isbnForms(code);
      if (!forms.length) return [];
      const i13 = forms[0];
      const out = [];
      const [ed, gb, ols] = await Promise.allSettled([
        getJSON(`${OL}/isbn/${i13}.json`),
        getJSON(`${GB}?q=isbn:${i13}&maxResults=10${GBKEY}`),
        getJSON(`${OL}/search.json?isbn=${i13}&limit=5&fields=${OL_FIELDS}`),
      ]);
      // 1) Open Library: rekaman edisi persis untuk ISBN ini
      if (ed.status === 'fulfilled' && ed.value && ed.value.title) {
        const e = ed.value;
        const edIsbns = [...(e.isbn_13 || []), ...(e.isbn_10 || [])].map((x) => String(x).replace(/[^0-9X]/gi, '').toUpperCase());
        if (!edIsbns.length || edIsbns.some((x) => forms.includes(x))) {
          const wk = ((e.works || [])[0] || {}).key ? e.works[0].key.replace('/works/', '') : null;
          let author = 'Tanpa nama', work = null;
          try { if (wk) work = await getJSON(`${OL}/works/${wk}.json`); } catch (x) { /* tanpa data karya */ }
          const aKey = ((e.authors || [])[0] || ((work && work.authors) || [])[0] || {});
          const ak = aKey.key || (aKey.author && aKey.author.key);
          try { if (ak) author = (await getJSON(`${OL}${ak}.json`)).name || author; } catch (x) { /* nama tidak terbaca */ }
          const cover = (e.covers || []).find((c) => c > 0) || ((work && work.covers) || []).find((c) => c > 0);
          out.push({
            id: wk ? 'ol-' + wk : 'ole-' + (e.key || '').replace('/books/', ''), ol_key: wk, source: 'openlibrary',
            title: e.title + (e.subtitle && e.title.length < 24 ? ': ' + e.subtitle : ''), author,
            year: Number(String(e.publish_date || '').match(/\d{4}/) || 0) || null, pages: e.number_of_pages || null,
            genres: mapGenres((work && work.subjects) || e.subjects || []), synopsis: cleanDesc((work && work.description) || e.description),
            cover_url: cover ? olCover(cover) : null, isbn: i13, publisher: (e.publishers || [])[0] || null,
            language: ((e.languages || [])[0] || {}).key === '/languages/ind' ? 'id' : null, _isbnMatch: true,
          });
        }
      }
      // 2) Google Books: hanya volume yang daftar ISBN-nya memuat ISBN ini
      if (gb.status === 'fulfilled') {
        (gb.value.items || []).filter((it) => gbHasIsbn(it.volumeInfo || {}, forms)).forEach((it) => {
          const b = fromGB(it); b.isbn = i13; b._isbnMatch = true;
          const twin = out.find((x) => titleMatch(x.title, b.title) || norm(x.title).slice(0, 18) === norm(b.title).slice(0, 18));
          if (twin) { ['synopsis', 'cover_url', 'publisher', 'pages', 'year', 'language'].forEach((f) => { if (!twin[f] && b[f]) twin[f] = b[f]; }); if (b.synopsis && b.synopsis.length > (twin.synopsis || '').length) twin.synopsis = b.synopsis; }
          else out.push(b);
        });
      }
      // 3) cadangan: indeks pencarian Open Library, juga diverifikasi
      if (!out.length && ols.status === 'fulfilled') {
        (ols.value.docs || []).filter((d) => (d.isbn || []).some((x) => forms.includes(x))).slice(0, 1).forEach((d) => { const b = fromOL(d); b.isbn = i13; b._isbnMatch = true; out.push(b); });
      }
      if (!out.length && [ed, gb, ols].every((r) => r.status === 'rejected' && !/HTTP 404/.test(String(r.reason)))) throw new Error('offline');
      return out;
    },

    /* ---------- Open Library tanpa batas (paginasi) ---------- */
    async olSearch(q, page = 1, limit = 40) {
      const j = await getJSON(`${OL}/search.json?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}&fields=${OL_FIELDS}`);
      return { items: (j.docs || []).filter((d) => d.title).map(fromOL), total: j.numFound || 0, page };
    },
    /** cari kunci penulis di Open Library (yang namanya paling cocok & karyanya terbanyak) */
    async olAuthor(name) {
      const j = await getJSON(`${OL}/search/authors.json?q=${encodeURIComponent(name)}&limit=10`);
      const n = norm(name);
      const docs = (j.docs || []).filter((d) => norm(d.name) === n || norm(d.name).includes(n) || n.includes(norm(d.name)));
      const d = docs.sort((a, b) => (norm(b.name) === n) - (norm(a.name) === n) || (b.work_count || 0) - (a.work_count || 0))[0];
      return d ? { key: d.key, name: d.name, works: d.work_count || 0, birth: d.birth_date || null, top: d.top_work || null } : null;
    },
    /** SEMUA karya seorang penulis di Open Library, terpopuler dulu, per halaman */
    async olAuthorWorks(key, page = 1, limit = 48) {
      const j = await getJSON(`${OL}/search.json?q=${encodeURIComponent('author_key:' + key)}&sort=editions&page=${page}&limit=${limit}&fields=${OL_FIELDS}`);
      return { items: (j.docs || []).filter((d) => d.title).map(fromOL), total: j.numFound || 0, page };
    },
    /** rak subjek Open Library (tanpa batas); hanya buku yang punya sampul */
    async olSubject(subject, page = 1, limit = 48) {
      const j = await getJSON(`${OL}/search.json?q=${encodeURIComponent(`subject:"${subject}"`)}&sort=editions&page=${page}&limit=${limit}&fields=${OL_FIELDS}`);
      return { items: (j.docs || []).filter((d) => d.title && d.cover_i).map(fromOL), total: j.numFound || 0, page };
    },
    /** daftar edisi sebuah karya (ISBN, penerbit, tahun, bahasa, halaman) */
    async editions(olKey, limit = 30) {
      const j = await getJSON(`${OL}/works/${olKey}/editions.json?limit=${limit}`);
      const langs = { ind: 'Indonesia', eng: 'Inggris', jpn: 'Jepang', kor: 'Korea', msa: 'Melayu', may: 'Melayu', fre: 'Prancis', ger: 'Jerman', spa: 'Spanyol', chi: 'Mandarin', ara: 'Arab', ita: 'Italia', por: 'Portugis', dut: 'Belanda', rus: 'Rusia' };
      return {
        total: j.size || 0,
        items: (j.entries || []).map((e) => {
          const isbn = toIsbn13((e.isbn_13 || [])[0] || (e.isbn_10 || [])[0] || '');
          const lk = (((e.languages || [])[0] || {}).key || '').replace('/languages/', '');
          return { key: (e.key || '').replace('/books/', ''), title: e.title, isbn, publisher: (e.publishers || [])[0] || null, year: Number(String(e.publish_date || '').match(/\d{4}/) || 0) || null, pages: e.number_of_pages || null, lang: langs[lk] || lk || null, cover: (e.covers || []).find((c) => c > 0) ? olCover(e.covers.find((c) => c > 0), 'S') : null };
        }).sort((a, b) => (b.isbn ? 1 : 0) - (a.isbn ? 1 : 0) || (b.year || 0) - (a.year || 0)),
      };
    },
    /** tautan openlibrary.org/works/… atau /books/… → id buku ruangbaca */
    async resolveOlLink(url) {
      const m = String(url).match(/openlibrary\.org\/(works|books)\/(OL\d+[WM])/i);
      if (!m) return null;
      if (m[1].toLowerCase() === 'works') return 'ol-' + m[2].toUpperCase();
      const e = await getJSON(`${OL}/books/${m[2].toUpperCase()}.json`);
      const wk = ((e.works || [])[0] || {}).key;
      return wk ? 'ol-' + wk.replace('/works/', '') : null;
    },
    async fetchDetails(id) {
      if (id.startsWith('ol-')) {
        const key = id.slice(3);
        const [w, s] = await Promise.allSettled([
          getJSON(`${OL}/works/${key}.json`),
          getJSON(`${OL}/search.json?q=${encodeURIComponent(`key:/works/${key}`)}&limit=1&fields=${OL_FIELDS}`),
        ]);
        const doc = s.status === 'fulfilled' ? (s.value.docs || [])[0] : null;
        const work = w.status === 'fulfilled' ? w.value : null;
        if (!doc && !work) throw new Error('Buku tidak ditemukan');
        const b = doc ? fromOL(doc) : { id, ol_key: key, source: 'openlibrary', title: work.title, author: 'Tanpa nama', year: null, pages: null, genres: mapGenres(work.subjects || []), cover_url: null };
        if (work) {
          b.synopsis = cleanDesc(work.description);
          if (!b.cover_url && work.covers && work.covers[0] > 0) b.cover_url = olCover(work.covers[0]);
          if (work.subjects) b.genres = mapGenres(work.subjects);
        }
        if (!b.synopsis) { try { const g = await viaGoogle(b); if (g) { b.synopsis = g.d || ''; b.publisher = b.publisher || g.pub; b.isbn = b.isbn || g.i; } } catch (e) { /* abaikan */ } }
        return b;
      }
      if (id.startsWith('gb-')) {
        const item = await getJSON(`${GB}/${id.slice(3)}${GBKEY ? '?' + GBKEY.slice(1) : ''}`);
        if (!item || !item.volumeInfo || !item.volumeInfo.title) throw new Error('Buku tidak ditemukan');
        return { ...fromGB(item), id };
      }
      throw new Error('ID buku tidak dikenal');
    },
  };

  global.API = API;
})(window);
