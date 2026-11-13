/* =========================================================================
   ruangbaca — aplikasi utama (SPA dengan hash routing)
   Modul lain (market.js, wrap.js) menambahkan rute lewat window.RB.
   ========================================================================= */
(() => {
  'use strict';

  /* ===================== utilitas ===================== */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
  const pad = (n) => String(n).padStart(2, '0');
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const parseDay = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const ts = (iso) => Date.parse(iso) || 0;
  const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const fmtDate = (s) => { const d = String(s).length <= 10 ? parseDay(s) : new Date(s); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
  const num = (n) => Number(n || 0).toLocaleString('id-ID');
  const rupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
  function timeAgo(iso) {
    const s = (Date.now() - ts(iso)) / 1000;
    if (s < 60) return 'baru saja';
    const m = s / 60; if (m < 60) return `${Math.floor(m)} menit lalu`;
    const h = m / 60; if (h < 24) return `${Math.floor(h)} jam lalu`;
    const d = h / 24; if (d < 7) return `${Math.floor(d)} hari lalu`;
    if (d < 30) return `${Math.floor(d / 7)} minggu lalu`;
    if (d < 365) return `${Math.floor(d / 30)} bulan lalu`;
    return `${Math.floor(d / 365)} tahun lalu`;
  }
  const greeting = () => { const h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'; };
  const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const starsText = (r) => (r ? '★'.repeat(Math.floor(r)) + (r % 1 ? '½' : '') : '');
  const firstName = (u) => (u?.name || u?.username || '').split(/\s+/)[0];
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const paras = (t) => esc(t).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } },
  };
  const DAY = 864e5;

  /* ===================== ikon ===================== */
  const ICONS = {
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    trending: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    truck: '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    barcode: '<path d="M3 5v14M7 5v14M11 5v14M14 5v14M18 5v14M21 5v14"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  };
  const GOOGLE = '<svg class="ic g" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>';
  const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const STAR_PATH = '<path d="M12 2.6l2.85 6 6.55.75-4.87 4.47 1.33 6.48L12 17.05 6.14 20.3l1.33-6.48L2.6 9.35l6.55-.75z"/>';
  const starRow = () => Array.from({ length: 5 }, () => `<svg viewBox="0 0 24 24">${STAR_PATH}</svg>`).join('');

  /* ===================== query data ===================== */
  const S = window.Store;
  const me = () => S.me;
  const books = () => S.table('books');
  const getBook = (id) => S.get('books', id);
  const getUser = (id) => S.get('profiles', id);
  const userByName = (n) => S.first('profiles', (u) => u.username === n);
  const shelfOf = (uid, bid) => S.first('user_books', (r) => r.user_id === uid && r.book_id === bid);
  const followingIds = (uid) => S.where('follows', (f) => f.follower_id === uid).map((f) => f.following_id);
  const followerIds = (uid) => S.where('follows', (f) => f.following_id === uid).map((f) => f.follower_id);
  const isFollowing = (a, b) => !!S.first('follows', (f) => f.follower_id === a && f.following_id === b);
  const byReadDesc = (a, b) => (b.read_date + b.created_at).localeCompare(a.read_date + a.created_at);
  const byCreatedDesc = (a, b) => ts(b.created_at) - ts(a.created_at);
  const entriesOf = (uid) => S.where('diary_entries', (e) => e.user_id === uid).sort(byReadDesc);
  const reviewLikes = (eid) => S.where('review_likes', (l) => l.entry_id === eid);
  const commentsOf = (eid) => S.where('comments', (c) => c.entry_id === eid).sort((a, b) => ts(a.created_at) - ts(b.created_at));
  const listItems = (lid) => S.where('list_items', (i) => i.list_id === lid).sort((a, b) => a.position - b.position);
  const listLikes = (lid) => S.where('list_likes', (l) => l.list_id === lid);
  const goalOf = (uid, year) => S.first('reading_goals', (g) => g.user_id === uid && g.year === year);
  const yearEntries = (uid, year) => S.where('diary_entries', (e) => e.user_id === uid && e.read_date.startsWith(String(year)));
  const favoritesOf = (uid) => S.where('favorites', (f) => f.user_id === uid).sort((a, b) => a.position - b.position);
  const genres = () => window.RB_CATALOG.GENRES.filter((g) => books().some((b) => (b.genres || []).includes(g)));
  const pagesOf = (b) => window.API.pagesOf(b);

  function setShelf(uid, bid, patch) {
    const ex = shelfOf(uid, bid);
    const t = new Date().toISOString();
    if (ex) S.update('user_books', ex.id, { ...patch, updated_at: t });
    else S.insert('user_books', { user_id: uid, book_id: bid, status: null, rating: null, liked: false, progress: 0, updated_at: t, ...patch });
  }
  function bookStats(bid) {
    const rows = S.where('user_books', (r) => r.book_id === bid);
    const rated = rows.filter((r) => r.rating);
    const hist = Array(10).fill(0);
    rated.forEach((r) => { hist[Math.max(0, Math.round(r.rating * 2) - 1)]++; });
    const avg = rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0;
    return {
      avg, count: rated.length, hist,
      readers: rows.filter((r) => r.status === 'read').length,
      reading: rows.filter((r) => r.status === 'reading').length,
      want: rows.filter((r) => r.status === 'want').length,
      likes: rows.filter((r) => r.liked).length,
      reviews: S.where('diary_entries', (e) => e.book_id === bid && e.review).length,
    };
  }
  /** popularitas komunitas: semua aktivitas nyata pengguna */
  function communityScore(b) {
    const s = bookStats(b.id);
    return s.readers * 3 + s.likes * 2 + s.reading * 2 + s.want + s.reviews * 3 + s.count;
  }
  /** skor trending: aktivitas 7 hari terakhir, makin baru makin berat */
  function trendingCommunity(days = 7) {
    const since = Date.now() - days * DAY;
    const score = new Map();
    const add = (bid, w, t) => { const age = (Date.now() - ts(t)) / (days * DAY); score.set(bid, (score.get(bid) || 0) + w * (1 - age * 0.5)); };
    S.where('diary_entries', (e) => ts(e.created_at) > since).forEach((e) => add(e.book_id, e.review ? 5 : 3, e.created_at));
    S.where('user_books', (r) => ts(r.updated_at) > since).forEach((r) => add(r.book_id, (r.status === 'want' ? 1.5 : r.status ? 2 : 0) + (r.liked ? 1.5 : 0), r.updated_at));
    S.where('listings', (l) => ts(l.created_at) > since).forEach((l) => add(l.book_id, 1, l.created_at));
    return [...score.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([id, v]) => ({ b: getBook(id), v })).filter((x) => x.b);
  }
  const popularBooks = () => books().slice().sort((a, b) => communityScore(b) - communityScore(a) || (a.rank || 9999) - (b.rank || 9999));
  function searchBooks(q) {
    const n = norm(q.trim());
    if (!n) return books().slice();
    const isbn = window.API.cleanIsbn(q);
    if (isbn) return books().filter((b) => window.API.sameIsbn(b.isbn || window.API.metaOf(b).isbn, isbn));
    return books().filter((b) => norm(`${b.title} ${b.author} ${b.publisher || ''} ${(b.genres || []).join(' ')}`).includes(n));
  }
  function searchUsers(q) {
    const n = norm(q.trim().replace(/^@/, ''));
    if (!n) return [];
    return S.table('profiles').filter((u) => norm(`${u.name} ${u.username}`).includes(n));
  }
  function notify(userId, type, refId) {
    const u = me();
    if (!u || !userId || userId === u.id) return;
    S.insert('notifications', { user_id: userId, actor_id: u.id, type, ref_id: refId ?? null, is_read: false });
  }
  const unreadNotifs = () => (me() ? S.where('notifications', (n) => n.user_id === me().id && !n.is_read).length : 0);
  const unreadMessages = () => (me() ? S.where('messages', (m) => m.recipient_id === me().id && !m.is_read).length : 0);

  /* ===================== komponen ===================== */
  const PALETTES = [
    ['#e0f2f4', '#bad6da', '#2f4a50'], ['#ffdbdf', '#f3c2c8', '#5a2f37'], ['#fff1c4', '#f6e3a1', '#5a4a1d'],
    ['#eef0c9', '#dddd9b', '#454a1c'], ['#e7ece9', '#cad7d1', '#2e3f39'], ['#efe9e1', '#ddd2c3', '#4a3d2e'],
    ['#dfe8ef', '#bfd1de', '#2c3e4d'], ['#f4e4e8', '#e5c9d0', '#4d2d36'],
  ];
  function coverVars(b) {
    const h = hashStr((b.title || '') + '|' + (b.author || ''));
    const p = PALETTES[h % PALETTES.length];
    return { style: `--c1:${p[0]};--c2:${p[1]};--c3:${p[2]}`, pat: (h >>> 5) % 4, p };
  }
  const imgTag = (src) => `<img class="cover-img" src="${esc(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onload="this.classList.add('ok')" onerror="this.remove()">`;
  function cover(b, { size = '', link = true } = {}) {
    if (!b) return '';
    const src = window.API.coverOf(b);
    const { style, pat } = coverVars(b);
    const inner = `<span class="cover-in"><span class="cover-t">${esc(b.title)}</span><span class="cover-a">${esc(b.author)}</span></span>${src ? imgTag(src) : ''}`;
    const attrs = `class="cover pat-${pat} ${size}" style="${style}" ${src ? '' : `data-cid="${esc(b.id)}"`} title="${esc(b.title)}${b.year ? ` (${b.year})` : ''} — ${esc(b.author)}"`;
    return link ? `<a href="#/buku/${encodeURIComponent(b.id)}" ${attrs}>${inner}</a>` : `<span ${attrs}>${inner}</span>`;
  }
  function tile(b, { rating = null, sub = '', rank = null, actions = true, extra = '' } = {}) {
    if (!b) return '';
    const u = me();
    const sh = u && S.get('books', b.id) ? shelfOf(u.id, b.id) : null;
    const act = u && actions ? `<div class="tile-actions">
        <button class="ta ${sh?.status === 'read' ? 'on read' : ''}" data-action="toggle-read" data-book="${esc(b.id)}" title="Sudah dibaca">${ic('check')}</button>
        <button class="ta ${sh?.liked ? 'on like' : ''}" data-action="toggle-like" data-book="${esc(b.id)}" title="Suka">${ic('heart')}</button>
        <button class="ta ${sh?.status === 'want' ? 'on want' : ''}" data-action="toggle-want" data-book="${esc(b.id)}" title="Ingin dibaca">${ic('bookmark')}</button>
      </div>` : '';
    const meta = rating || sub ? `<div class="tile-meta">${rating ? `<span class="stars">${starsText(rating)}</span>` : ''}${sub}</div>` : '';
    return `<div class="tile">${rank ? `<span class="rank">${rank}</span>` : ''}<div class="tile-cover">${cover(b)}${act}${extra}</div>${meta}</div>`;
  }
  const tileTitle = (b) => `<a class="tile-title" href="#/buku/${encodeURIComponent(b.id)}">${esc(b.title)}</a><a class="tile-author" href="#/penulis/${encodeURIComponent(String(b.author || '').split(/\s*&\s*|,\s*/)[0].trim())}">${esc(b.author)}</a>`;
  function avatar(u, size = 'md', link = true) {
    if (!u) return '';
    const init = (u.name || u.username || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    const img = u.avatar_url ? `<img src="${esc(u.avatar_url)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
    const attrs = `class="av av-${size}" style="--av:${esc(u.avatar_color || '#7fa9b0')}" title="${esc(u.name)}"`;
    return link ? `<a href="#/u/${esc(u.username)}" ${attrs}>${esc(init)}${img}</a>` : `<span ${attrs}>${esc(init)}${img}</span>`;
  }
  function starInput(value = 0, bookId = '') {
    return `<div class="star-wrap"><div class="star-input" data-star-input data-value="${value || 0}" ${bookId ? `data-book="${esc(bookId)}"` : ''} tabindex="0" role="slider" aria-label="Rating" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${value || 0}">
      <span class="si-bg">${starRow()}</span><span class="si-fg" style="width:${((value || 0) / 5) * 100}%">${starRow()}</span></div>
      <span class="si-label">${value ? value.toFixed(1) : '–'}</span></div>`;
  }
  function followBtn(target, size = 'sm') {
    const u = me();
    if (u && u.id === target.id) return '';
    const f = u && isFollowing(u.id, target.id);
    return `<button class="btn ${f ? 'ghost following' : 'primary'} ${size}" data-action="follow" data-user="${esc(target.id)}">${f ? `${ic('check')}<span>Mengikuti</span>` : `${ic('plus')}<span>Ikuti</span>`}</button>`;
  }
  const empty = (msg, href, label, icon = 'book', action = '') => `<div class="empty">${ic(icon)}<p>${msg}</p>${href ? `<a class="btn ghost sm" href="${href}">${label}</a>` : ''}${action}</div>`;
  const secHead = (title, more = '', icon = '') => `<div class="sec-head"><h2 class="sec-title">${icon ? ic(icon) : ''}${title}</h2>${more}</div>`;
  const skeletonRow = (n = 8) => Array.from({ length: n }, () => '<div class="tile"><span class="cover skel"></span><span class="skel-line"></span></div>').join('');

  function reviewCard(e, { showBook = true, clamp = true } = {}) {
    const u = getUser(e.user_id), b = getBook(e.book_id);
    if (!u || !b) return '';
    const likes = reviewLikes(e.id);
    const liked = me() && likes.some((l) => l.user_id === me().id);
    const cm = commentsOf(e.id).length;
    return `<article class="review ${showBook ? '' : 'no-book'}">
      ${showBook ? `<div class="review-cover">${cover(b, { size: 'sm' })}</div>` : ''}
      <div class="review-body">
        ${showBook ? `<h3 class="review-book"><a href="#/buku/${encodeURIComponent(b.id)}">${esc(b.title)}</a> <span class="year">${b.year || ''}</span></h3>` : ''}
        <div class="review-meta">${avatar(u, 'xs')}<span>Ulasan oleh <a href="#/u/${esc(u.username)}" class="by">${esc(u.name)}</a></span>
          ${e.rating ? `<span class="stars">${starsText(e.rating)}</span>` : ''}${e.liked ? `<span class="heart-on" title="Menyukai buku ini">${ic('heart')}</span>` : ''}${e.is_reread ? `<span class="muted" title="Baca ulang">${ic('repeat')}</span>` : ''}
        </div>
        <div class="review-text ${e.contains_spoiler ? 'spoiler' : ''} ${clamp ? 'clamp' : ''}">
          ${e.contains_spoiler ? `<button class="spoiler-cover" data-action="reveal">Ulasan ini mengandung spoiler — <u>tampilkan</u></button>` : ''}
          <div class="rt">${paras(e.review)}</div>
        </div>
        <div class="review-actions">
          <button class="ra ${liked ? 'on' : ''}" data-action="like-review" data-entry="${e.id}">${ic('heart')}<span>${likes.length ? num(likes.length) + ' ' : ''}Suka</span></button>
          <a class="ra" href="#/ulasan/${e.id}">${ic('message')}<span>${cm ? cm + ' ' : ''}Komentar</span></a>
          <span class="ra-time">${timeAgo(e.created_at)}</span>
        </div>
      </div>
    </article>`;
  }
  function listCard(l) {
    const items = listItems(l.id);
    const u = getUser(l.user_id);
    const likes = listLikes(l.id).length;
    const covers = items.slice(0, 5).map((it) => cover(getBook(it.book_id), { link: false, size: 'sm' }));
    while (covers.length < 5) covers.push('<span class="cover ghost sm"></span>');
    return `<a href="#/daftar/${l.id}" class="list-card">
      <div class="stack">${covers.join('')}</div>
      <div class="lc-body"><h3>${esc(l.title)}</h3>
        <p class="lc-meta">${avatar(u, 'xs', false)}<span>${esc(u?.name || '')}</span><span class="dot">·</span><span>${items.length} buku</span>${likes ? `<span class="dot">·</span><span class="lc-likes">${ic('heart')} ${likes}</span>` : ''}</p>
        ${l.description ? `<p class="lc-desc">${esc(l.description)}</p>` : ''}
      </div></a>`;
  }
  function userRow(u) {
    const reads = S.where('user_books', (r) => r.user_id === u.id && r.status === 'read').length;
    const revs = S.where('diary_entries', (e) => e.user_id === u.id && e.review).length;
    return `<div class="user-row">${avatar(u, 'md')}<div class="ur-body"><a href="#/u/${esc(u.username)}" class="ur-name">${esc(u.name)}</a><span class="muted sm">@${esc(u.username)} · ${reads} buku · ${revs} ulasan</span></div>${followBtn(u)}</div>`;
  }
  function goalWidget(u) {
    const year = new Date().getFullYear();
    const own = me() && me().id === u.id;
    const g = goalOf(u.id, year);
    const done = yearEntries(u.id, year).length;
    if (!g) return own ? `<div class="card goal"><h3 class="sec-title sm">${ic('target')}Tantangan ${year}</h3><p class="muted sm">Tetapkan berapa buku yang ingin kamu selesaikan tahun ini.</p><button class="btn primary sm" data-action="edit-goal">Pasang target</button></div>` : '';
    const pct = Math.min(1, done / g.target);
    const R = 52, C = 2 * Math.PI * R;
    const start = new Date(year, 0, 1), end = new Date(year + 1, 0, 1);
    const expected = g.target * ((Date.now() - start) / (end - start));
    let msg;
    if (done >= g.target) msg = '<span class="ok">Target tercapai! 🎉</span>';
    else if (done >= Math.floor(expected)) msg = '<span class="ok">Sesuai jadwal.</span> Pertahankan ritmenya!';
    else msg = `Tertinggal <b>${Math.ceil(expected - done)}</b> buku dari jadwal. Pelan-pelan saja, yuk!`;
    return `<div class="card goal">
      <h3 class="sec-title sm">${ic('target')}Tantangan ${year}</h3>
      <div class="goal-body">
        <div class="ring-wrap"><svg class="ring" viewBox="0 0 120 120"><circle class="ring-bg" cx="60" cy="60" r="${R}"/><circle class="ring-fg" cx="60" cy="60" r="${R}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}"/></svg>
        <div class="ring-label"><b>${done}</b><span>dari ${g.target}</span></div></div>
        <div class="goal-text"><p>${own ? 'Kamu' : esc(firstName(u))} sudah menyelesaikan <b>${Math.round(pct * 100)}%</b> target.</p>${own ? `<p class="muted sm">${msg}</p><button class="link-btn" data-action="edit-goal">${ic('edit')} Ubah target</button>` : ''}</div>
      </div></div>`;
  }
  function progressCard(r) {
    const b = getBook(r.book_id);
    if (!b) return '';
    const total = pagesOf(b) || 300;
    const pct = Math.min(100, Math.round(((r.progress || 0) / total) * 100));
    return `<div class="progress-card">
      ${cover(b, { size: 'sm' })}
      <div class="pc-body"><a href="#/buku/${encodeURIComponent(b.id)}" class="pc-title">${esc(b.title)}</a><span class="muted sm">${esc(b.author)}</span>
        <div class="pbar"><span style="width:${pct}%"></span></div>
        <div class="pc-row"><span class="sm" id="pl-${hashStr(b.id)}">hal. <b>${r.progress || 0}</b> / ${total}${pagesOf(b) ? '' : '±'} · ${pct}%</span>
          <input type="range" min="0" max="${total}" value="${r.progress || 0}" data-progress="${esc(b.id)}" data-total="${total}" aria-label="Halaman yang sudah dibaca">
          <button class="btn primary xs" data-action="open-log" data-book="${esc(b.id)}">${ic('check')}Selesai</button></div>
      </div></div>`;
  }
  function feedItem(it) {
    if (it.kind === 'list') {
      const l = it.l, u = getUser(l.user_id);
      if (!u) return '';
      return `<article class="feed-item">${avatar(u, 'sm')}<div class="feed-body"><p class="feed-line"><a href="#/u/${esc(u.username)}" class="by">${esc(u.name)}</a> membuat daftar <a href="#/daftar/${l.id}">${esc(l.title)}</a></p><span class="feed-time">${timeAgo(l.created_at)}</span></div><div class="feed-covers">${listItems(l.id).slice(0, 3).map((i) => cover(getBook(i.book_id), { size: 'xs' })).join('')}</div></article>`;
    }
    if (it.kind === 'listing') {
      const l = it.l, u = getUser(l.seller_id), b = getBook(l.book_id);
      if (!u || !b) return '';
      return `<article class="feed-item">${avatar(u, 'sm')}<div class="feed-body"><p class="feed-line"><a href="#/u/${esc(u.username)}" class="by">${esc(u.name)}</a> menjual <a href="#/preloved/${l.id}">${esc(b.title)}</a> <span class="price-chip">${rupiah(l.price)}</span></p><span class="feed-time">${ic('bag')} Preloved · ${timeAgo(l.created_at)}</span></div>${cover(b, { size: 'xs' })}</article>`;
    }
    const e = it.e, u = getUser(e.user_id), b = getBook(e.book_id);
    if (!u || !b) return '';
    return `<article class="feed-item">${avatar(u, 'sm')}<div class="feed-body">
      <p class="feed-line"><a href="#/u/${esc(u.username)}" class="by">${esc(u.name)}</a> ${e.is_reread ? 'membaca ulang' : 'selesai membaca'} <a href="#/buku/${encodeURIComponent(b.id)}">${esc(b.title)}</a>
      ${e.rating ? `<span class="stars">${starsText(e.rating)}</span>` : ''}${e.liked ? `<span class="heart-on">${ic('heart')}</span>` : ''}</p>
      ${e.review ? `<a class="feed-review ${e.contains_spoiler ? 'blur' : ''}" href="#/ulasan/${e.id}">${esc(e.review.length > 200 ? e.review.slice(0, 200) + '…' : e.review)}</a>` : ''}
      <span class="feed-time">${timeAgo(e.created_at)}</span></div>${cover(b, { size: 'xs' })}</article>`;
  }

  /* ---------- buku dari katalog dunia ---------- */
  const worldCache = new Map();
  const remember = (list) => { list.forEach((b) => worldCache.set(b.id, b)); return list; };
  const pending = new Set();
  async function ensureBook(id) {
    if (getBook(id) || pending.has(id)) return getBook(id);
    pending.add(id);
    try {
      let b = worldCache.get(id);
      try { const d = await window.API.fetchDetails(id); b = { ...(b || {}), ...Object.fromEntries(Object.entries(d).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length))), id }; }
      catch (e) { if (!b) throw e; }
      S.upsertBook({ ...b, created_by: me()?.id || null });
      return getBook(id);
    } finally { pending.delete(id); }
  }
  function worldRow(items, opts = {}) {
    return items.map((b, i) => { const local = getBook(b.id); return tile(local || b, { actions: !!local, rank: opts.rank ? i + 1 : null, sub: tileTitle(b) }); }).join('');
  }

  /* ===================== router ===================== */
  const app = $('#app');
  const routes = [];
  const route = (re, fn, nav = '') => routes.push([re, fn, nav]);
  const mountQueue = [];
  const onMount = (fn) => mountQueue.push(fn);
  const setTitle = (t) => { document.title = t ? `${t} · ruangbaca` : 'ruangbaca — catat, nilai, dan bagikan bacaanmu'; };
  function parseHash() {
    const h = location.hash.slice(1) || '/';
    const [path, qs = ''] = h.split('?');
    return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs)) };
  }
  let lastPath = null;
  let dirty = false;
  function render(keepScroll = false) {
    const { path, query } = parseHash();
    let match = null;
    for (const [re, fn, nav] of routes) { const m = path.match(re); if (m) { match = { fn, nav, params: m.slice(1).map((x) => (x ? decodeURIComponent(x) : x)) }; break; } }
    let nav = match ? match.nav : '';
    if (nav === 'profil' && (!me() || match.params[0] !== me().username) && match.fn === viewProfile) nav = 'anggota';
    renderHeader(nav);
    const y = window.scrollY;
    mountQueue.length = 0;
    app.innerHTML = match ? match.fn(match.params, query) : viewNotFound();
    if (path !== lastPath) { app.classList.remove('turn'); void app.offsetWidth; app.classList.add('turn'); }
    mountQueue.splice(0).forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    hydrateCovers(app);
    if (keepScroll || path === lastPath) window.scrollTo(0, y); else window.scrollTo(0, 0);
    lastPath = path;
    dirty = false;
    closeSearchPop();
  }
  const refresh = () => render(true);
  const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

  function hydrateCovers(root = document) {
    $$('[data-cid]', root).forEach((el) => {
      const b = getBook(el.dataset.cid) || worldCache.get(el.dataset.cid);
      if (b) window.API.queueCover(b);
    });
  }
  window.API.onCover((id, res) => {
    const p = decodeURIComponent(parseHash().path);
    if (p === `/buku/${id}` && !res.err) setTimeout(() => { if (!/INPUT|TEXTAREA/.test(document.activeElement.tagName) && $('#modalRoot').hidden) refresh(); }, 50);
    if (!res.u) return;
    $$(`[data-cid="${CSS.escape(id)}"]`).forEach((el) => { el.removeAttribute('data-cid'); el.insertAdjacentHTML('beforeend', imgTag(res.u)); });
  });

  /* ===================== header ===================== */
  let currentNav = '';
  function renderHeader(nav) {
    currentNav = nav;
    $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === nav));
    const u = me();
    const theme = document.documentElement.dataset.theme;
    const themeBtn = `<button class="icon-btn" data-action="theme" title="Ganti tema">${ic(theme === 'dark' ? 'sun' : 'moon')}</button>`;
    const box = $('#topbarActions');
    if (!u) {
      box.innerHTML = `${themeBtn}<button class="btn ghost sm hide-sm" data-action="open-auth" data-tab="login">Masuk</button><button class="btn primary sm" data-action="open-auth" data-tab="register">Daftar</button>`;
    } else {
      const n = unreadNotifs(), m = unreadMessages();
      box.innerHTML = `<button class="btn primary sm log-btn hide-sm" data-action="open-log" title="Catat bacaan (L)">${ic('plus')}<span>Catat</span></button>
        <a href="#/pesan" class="icon-btn ${nav === 'pesan' ? 'active' : ''}" title="Pesan">${ic('chat')}${m ? `<span class="badge">${m}</span>` : ''}</a>
        <a href="#/notifikasi" class="icon-btn ${nav === 'notif' ? 'active' : ''}" title="Notifikasi">${ic('bell')}${n ? `<span class="badge">${n}</span>` : ''}</a>
        <span class="hide-sm">${themeBtn}</span>
        <div class="menu"><button class="menu-trigger" data-action="menu" aria-haspopup="true">${avatar(u, 'sm', false)}<span class="menu-name">${esc(firstName(u))}</span>${ic('down', 'chev')}</button>
          <div class="menu-pop" hidden>
            <div class="menu-head">${avatar(u, 'md', false)}<div><b>${esc(u.name)}</b><span class="muted sm">@${esc(u.username)}</span></div></div>
            <a href="#/u/${esc(u.username)}">${ic('user')}Profil</a>
            <a href="#/wrap">${ic('gift')}Reading Wrap</a>
            <a href="#/u/${esc(u.username)}/diary">${ic('calendar')}Diary</a>
            <a href="#/u/${esc(u.username)}/rak">${ic('bookmark')}Rak buku</a>
            <a href="#/u/${esc(u.username)}/lapak">${ic('bag')}Lapak preloved</a>
            <a href="#/pesan">${ic('chat')}Pesan</a>
            <a href="#/u/${esc(u.username)}/statistik">${ic('chart')}Statistik</a>
            <a href="#/pengaturan">${ic('settings')}Pengaturan</a>
            ${u.is_admin ? `<a href="#/admin">${ic('shield')}Admin</a>` : ''}
            <button data-action="theme" class="show-sm">${ic(theme === 'dark' ? 'sun' : 'moon')}Ganti tema</button>
            <button data-action="logout" class="danger">${ic('logout')}Keluar</button>
          </div></div>`;
    }
    $('#bottomnav').innerHTML = `
      <a href="#/" class="${nav === 'home' ? 'active' : ''}">${ic('home')}<span>Beranda</span></a>
      <a href="#/jelajah" class="${nav === 'jelajah' || nav === 'trending' ? 'active' : ''}">${ic('compass')}<span>Jelajah</span></a>
      <button class="bn-log" data-action="open-log" aria-label="Catat bacaan">${ic('plus')}</button>
      <a href="#/preloved" class="${nav === 'preloved' ? 'active' : ''}">${ic('bag')}<span>Preloved</span></a>
      ${u ? `<a href="#/u/${esc(u.username)}" class="${nav === 'profil' ? 'active' : ''}">${ic('user')}<span>Profil</span></a>` : `<button data-action="open-auth" data-tab="login">${ic('user')}<span>Masuk</span></button>`}`;
    const mb = $('#modeBanner');
    if (mb) mb.hidden = S.online || store.get('ruangbaca.hideBanner') === '1';
    $('#modeLabel').textContent = S.online ? 'Mode online · Supabase' : 'Mode demo · data di browser ini';
  }

  /* ===================== beranda ===================== */
  function viewHome() { return me() ? homeUser() : homeGuest(); }

  function asyncWorldRow(kind, rank = false) {
    onMount(() => {
      const el = $(`[data-world="${kind}"]`);
      if (!el) return;
      window.API.trendingWorld(kind).then((items) => {
        if (!document.contains(el)) return;
        remember(items);
        el.innerHTML = items.length ? worldRow(items.slice(0, 20), { rank }) : `<p class="muted sm">Belum ada terbitan ${window.API.RECENT_FROM}+ yang sedang trending di Open Library.</p>`;
        hydrateCovers(el);
      }).catch(() => {
        if (document.contains(el)) el.innerHTML = `<div class="empty slim">${ic('globe')}<p>Tidak bisa memuat trending dunia (sedang offline?). Coba lagi nanti.</p></div>`;
      });
    });
    return `<div class="row-scroll shelf" data-world="${kind}">${skeletonRow(8)}</div>`;
  }

  /* ---------- pembuka beranda: deretan sampul ---------- */
  const authorHref = (a) => `#/penulis/${encodeURIComponent(String(a || '').split(/\s*&\s*|,\s*/)[0].trim())}`;
  function favBooks() { return books().filter((b) => b.fav).sort((a, b) => (a.language === 'id' ? 0 : 1) - (b.language === 'id' ? 0 : 1) || (a.rank || 999) - (b.rank || 999)); }
  /** penulis yang karyanya memang hits di Indonesia — sumber utama rak sampul beranda */
  const HIT_AUTHORS = ['Brian Khrisna', 'Tere Liye', 'Leila S. Chudori', 'Dee Lestari', 'Andrea Hirata', 'Ika Natassa', 'Fiersa Besari', 'Valerie Patkar',
    'J.S. Khairen', 'Eka Kurniawan', 'Pidi Baiq', 'Ahmad Fuadi', 'Henry Manampiring', 'Marchella FP', 'Andreas Kurniawan', 'Almira Bastari', 'Alvi Syahrin',
    'Ziggy Zezsyazeoviennazabrizkie', 'Rintik Sedu', 'Toshikazu Kawaguchi', 'Keigo Higashino', 'Pramoedya Ananta Toer', 'Nadia Omara', 'Raditya Dika'];
  const firstAuthor = (b) => String(b.author || '').split(/\s*&\s*/)[0];
  function hitAuthorBooks(author) {
    const set = author ? [author] : HIT_AUTHORS;
    return books().filter((b) => set.includes(firstAuthor(b)))
      .sort((a, b) => (b.hot ? 2 : b.fav ? 1 : 0) - (a.hot ? 2 : a.fav ? 1 : 0) || HIT_AUTHORS.indexOf(firstAuthor(a)) - HIT_AUTHORS.indexOf(firstAuthor(b)) || (b.year || 0) - (a.year || 0));
  }
  function familiarPool() {
    const hot = hotBooks(), fav = favBooks();
    const out = [], seen = new Set();
    const push = (b) => { if (b && !seen.has(b.id)) { seen.add(b.id); out.push(b); } };
    const hotId = hot.filter((b) => b.language === 'id'), favId = fav.filter((b) => b.language === 'id'), hits = hitAuthorBooks();
    for (let i = 0; i < 30; i++) { push(hotId[i]); push(favId[i]); push(hits[i]); }
    hits.forEach(push); hot.forEach(push); fav.forEach(push);
    return out;
  }
  /* ---------- hanya buku yang sampulnya benar-benar ada ---------- */
  const hasCover = (b) => window.API.coverState(b) === 'yes';
  const isPending = (b) => window.API.coverState(b) === 'pending';
  const coverReady = (list, max, scan = max * 3) => {
    const head = list.slice(0, Math.max(scan, max));
    head.forEach((b) => window.API.queueCover(b));
    const ready = list.filter(hasCover).slice(0, max);
    return { ready, pending: ready.length < max && head.some(isPending) };
  };
  const LIVE = {
    hot: () => hotBooks(), fav: () => favBooks(), hits: () => hitAuthorBooks(),
    hotId: () => hotBooks().filter((b) => b.language === 'id'), hotIntl: () => hotBooks().filter((b) => b.language !== 'id'),
    favId: () => favBooks().filter((b) => b.language === 'id'), favIntl: () => favBooks().filter((b) => b.language !== 'id'),
    intl: () => books().filter((b) => b.intl),
    author: () => [],
  };
  /** rak yang hanya berisi buku bersampul; terisi sendiri begitu sampul selesai dicari */
  function liveShelf(kind, max = 16, { rank = false, author = '' } = {}) {
    const list = author ? hitAuthorBooks(author) : LIVE[kind]();
    const { ready, pending } = coverReady(list, max);
    const inner = ready.length ? shelfRow(ready, { rank }) : pending ? `<div class="row-scroll shelf">${skeletonRow(8)}</div>` : '<p class="muted sm">Sampul buku-buku ini belum tersedia di katalog dunia.</p>';
    return `<div data-live-shelf="${kind}" data-max="${max}" data-rank="${rank ? 1 : ''}" data-author="${esc(author)}" data-pending="${pending ? 1 : ''}">${inner}</div>`;
  }
  let heroTimer = null, liveT = null;
  function liveUpdate() {
    clearTimeout(liveT);
    liveT = setTimeout(() => {
      const hero = $('#coverHero.is-loading');
      if (hero) {
        const guest = hero.dataset.guest === '1';
        const { ready, pending } = coverReady(familiarPool(), 18, 90);
        if (ready.length >= 18 || !pending) { hero.outerHTML = coverHero(guest); initHero(); }
      }
      $$('[data-live-shelf][data-pending="1"]').forEach((el) => {
        const sc = $('.row-scroll', el); const left = sc ? sc.scrollLeft : 0;
        const tmp = document.createElement('div');
        tmp.innerHTML = liveShelf(el.dataset.liveShelf, Number(el.dataset.max), { rank: !!el.dataset.rank, author: el.dataset.author });
        const fresh = tmp.firstElementChild;
        if (fresh.innerHTML === el.innerHTML) return;
        el.replaceWith(fresh);
        const sc2 = $('.row-scroll', fresh); if (sc2) sc2.scrollLeft = left;
      });
    }, 450);
  }
  window.API.onCover(() => { if ($('#coverHero.is-loading') || $('[data-live-shelf][data-pending="1"]')) liveUpdate(); });
  function initHero() {
    clearInterval(heroTimer);
    const root = $('#coverHero'); if (!root || root.classList.contains('is-loading')) return;
    const panes = $$('.ch-pane', root);
    let cur = 0, paused = false;
    const show = (i) => {
      cur = (i + panes.length) % panes.length;
      panes.forEach((p, k) => p.classList.toggle('on', k === cur));
      $$('.ch-dots button', root).forEach((d, k) => d.classList.toggle('on', k === cur));
    };
    root.addEventListener('click', (e) => { const d = e.target.closest('[data-spot]'); if (d) show(Number(d.dataset.spot)); });
    root.addEventListener('pointerenter', () => { paused = true; });
    root.addEventListener('pointerleave', () => { paused = false; });
    heroTimer = setInterval(() => { if (!document.contains(root)) { clearInterval(heroTimer); return; } if (!paused && !document.hidden && panes.length > 1) show(cur + 1); }, 6500);
  }
  function coverHero(guest) {
    const kicker = `<p class="ch-kicker">${ic('book')} ${guest ? 'ruangbaca · rak buku sosial untuk pembaca Indonesia' : `${greeting()}, ${esc(firstName(me()))} — ini yang lagi dibaca banyak orang`}</p>`;
    const { ready, pending } = coverReady(familiarPool(), 39, 90);
    if (ready.length < 18 && pending) {
      setTimeout(liveUpdate, 12000); // jangan menunggu selamanya bila koneksi lambat
      return `<section class="cover-hero is-loading" id="coverHero" data-guest="${guest ? 1 : 0}"><div class="wrap ch-inner">
        <div class="ch-spot">${kicker}<div class="ch-pane on"><span class="ch-cover"><span class="cover lg skel"></span></span><div class="ch-info"><span class="skel-line w40"></span><span class="skel-line h2"></span><span class="skel-line w60"></span><p class="muted sm loading-text"><span class="spinner sm"></span> Menata rak sampul…</p></div></div></div>
        <div class="ch-wall" aria-hidden="true"><div class="ch-tilt">${[0, 1, 2].map((k) => `<div class="ch-row"><div class="ch-track still">${Array.from({ length: 8 }, () => '<a><span class="cover skel"></span></a>').join('')}</div></div>`).join('')}</div></div>
      </div></section>`;
    }
    onMount(initHero);
    if (!ready.length) return `<section class="cover-hero" id="coverHero"><div class="wrap">${kicker}<h1 class="display">Setiap buku yang kamu baca layak dicatat.</h1><div class="ch-actions"><a class="btn primary" href="#/jelajah">${ic('search')}Cari buku</a></div></div></section>`;
    const spot = ready.slice(0, 6);
    let wall = ready.slice(0, 39);
    while (wall.length < 27) wall = wall.concat(ready).slice(0, 39);
    const per = Math.ceil(wall.length / 3);
    const rows = [wall.slice(0, per), wall.slice(per, per * 2), wall.slice(per * 2)];
    const mine = (b) => { const u = me(); const r = u ? shelfOf(u.id, b.id) : null; return r && r.status === 'want'; };
    return `
    <section class="cover-hero" id="coverHero">
      <div class="wrap ch-inner">
        <div class="ch-spot">
          ${kicker}
          ${spot.map((b, i) => `<article class="ch-pane ${i ? '' : 'on'}">
            <a class="ch-cover" href="#/buku/${encodeURIComponent(b.id)}" aria-label="${esc(b.title)}">${cover(b, { link: false, size: 'lg' })}</a>
            <div class="ch-info">
              <p class="ch-tag ${b.hot ? 'hot' : 'fav'}">${ic(b.hot ? 'flame' : 'bookmark')}${b.hot ? 'Lagi ramai' : b.fav ? 'Favorit pembaca' : 'Penulis hits'}${b.trend_note ? ` · ${esc(b.trend_note.slice(0, 48))}` : ''}</p>
              <h2 class="ch-title"><a href="#/buku/${encodeURIComponent(b.id)}">${esc(b.title)}</a></h2>
              <p class="ch-author">oleh <a href="${authorHref(b.author)}">${esc(b.author)}</a>${b.year ? ` · ${b.year}` : ''}</p>
              ${window.API.metaOf(b).synopsis ? `<p class="ch-syn">${esc(window.API.metaOf(b).synopsis)}</p>` : ''}
              <div class="ch-actions">
                <a class="btn primary" href="#/buku/${encodeURIComponent(b.id)}">${ic('book')}Lihat buku</a>
                ${guest ? '<button class="btn ghost" data-action="open-auth" data-tab="register">Mulai catat bacaanmu</button>' : `<button class="btn ghost ${mine(b) ? 'on' : ''}" data-action="toggle-want" data-book="${esc(b.id)}">${ic('bookmark')}Ingin baca</button>`}
              </div>
            </div>
          </article>`).join('')}
          <div class="ch-dots" role="tablist">${spot.map((b, i) => `<button data-spot="${i}" class="${i ? '' : 'on'}" aria-label="${esc(b.title)}"></button>`).join('')}</div>
        </div>
        <div class="ch-wall" aria-hidden="true"><div class="ch-tilt">
          ${rows.map((r, k) => `<div class="ch-row ${k % 2 ? 'rev' : ''}" style="--dur:${70 + k * 14}s"><div class="ch-track">${[...r, ...r].map((b) => `<a href="#/buku/${encodeURIComponent(b.id)}" tabindex="-1">${cover(b, { link: false })}</a>`).join('')}</div></div>`).join('')}
        </div></div>
      </div>
    </section>`;
  }
  /** deretan chip penulis hits */
  const hitAuthorChips = () => `<div class="author-chips">${HIT_AUTHORS.slice(0, 14).map((a) => `<a class="author-chip" href="${authorHref(a)}"><span>${esc(a.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase())}</span>${esc(a)}</a>`).join('')}</div>`;

  /* ---------- penulis ---------- */
  function viewAuthor([name]) {
    setTitle(name);
    const n = norm(name);
    const local = books().filter((b) => norm(b.author).split(/\s*&\s*/).some((a) => a.includes(n) || n.includes(a)) || norm(b.author).includes(n))
      .sort((a, b) => (b.year || 0) - (a.year || 0));
    const stats = local.map((b) => bookStats(b.id));
    const readers = stats.reduce((s, x) => s + x.readers, 0);
    const rated = stats.filter((x) => x.count);
    const avg = rated.length ? rated.reduce((s, x) => s + x.avg * x.count, 0) / rated.reduce((s, x) => s + x.count, 0) : 0;
    const hot = local.filter((b) => b.hot || b.fav);
    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    onMount(() => {
      const bioEl = $('#authorBio'), worldEl = $('#authorWorld');
      window.API.authorBio(name).then((a) => {
        if (!bioEl || !document.contains(bioEl)) return;
        bioEl.innerHTML = a && (a.bio || a.birth || a.works)
          ? `${a.bio ? paras(a.bio.length > 900 ? a.bio.slice(0, 900).replace(/\s\S*$/, '') + '…' : a.bio) : ''}<p class="muted xs">${[a.birth ? `Lahir ${esc(a.birth)}` : '', a.works ? `${num(a.works)} karya tercatat di Open Library` : ''].filter(Boolean).join(' · ')}${a.key ? ` · <a href="https://openlibrary.org/authors/${esc(a.key)}" target="_blank" rel="noopener">sumber</a>` : ''}</p>`
          : '<p class="muted sm">Belum ada biografi di Open Library untuk penulis ini.</p>';
      }).catch(() => { if (bioEl) bioEl.innerHTML = '<p class="muted sm">Biografi tidak bisa dimuat (offline?).</p>'; });
      const have = new Set(local.map((b) => norm(b.title)));
      const shownW = new Set();
      const fresh = (items) => remember(items.filter((b) => { const k = norm(b.title); if (have.has(k) || shownW.has(k) || getBook(b.id)) return false; shownW.add(k); return true; }));
      const wtile = (b) => tile(b, { actions: false, sub: tileTitle(b) + `<span class="src-badge">${b.source === 'googlebooks' ? 'Google Books' : 'Open Library'}${b.year ? ' · ' + b.year : ''}</span>` });
      let olKey = null, page = 0, total = 0;
      const loadOL = async () => {
        const btn = $('#authorMore');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner sm"></span>Memuat…'; }
        try {
          const r = await window.API.olAuthorWorks(olKey, ++page);
          total = r.total;
          if (!worldEl || !document.contains(worldEl)) return;
          const grid = $('#authorGrid', worldEl);
          if (page === 1) grid.innerHTML = '';
          grid.insertAdjacentHTML('beforeend', fresh(r.items).map(wtile).join(''));
          hydrateCovers(grid);
          $('#authorWorldCount').textContent = `${num(total)} karya di Open Library`;
          if (btn) { btn.hidden = page * 48 >= total; btn.disabled = false; btn.innerHTML = `${ic('plus')}Muat lebih banyak karya`; }
          if (page === 1 && !grid.children.length && page * 48 >= total) grid.outerHTML = '<p class="muted sm">Semua karyanya di Open Library sudah ada di atas.</p>';
        } catch (e) { if (btn) { btn.disabled = false; btn.textContent = 'Coba lagi'; } }
      };
      window.API.olAuthor(name).then((a) => {
        if (!worldEl || !document.contains(worldEl)) return;
        if (!a) { $('#authorGrid', worldEl).outerHTML = '<p class="muted sm">Penulis ini belum terdaftar di Open Library.</p>'; return; }
        olKey = a.key; loadOL();
        const btn = $('#authorMore'); if (btn) btn.addEventListener('click', loadOL);
      }).catch(() => { if (worldEl) worldEl.innerHTML = '<p class="muted sm">Open Library tidak bisa dihubungi (offline?).</p>'; });
      window.API.authorWorks(name).then((items) => {
        const gEl = $('#authorGB'); if (!gEl || !document.contains(gEl)) return;
        const gb = fresh(items.filter((b) => b.source === 'googlebooks'));
        gEl.innerHTML = gb.length ? `<div class="grid books">${gb.slice(0, 40).map(wtile).join('')}</div>` : '<p class="muted sm">Tidak ada edisi tambahan di Google Books.</p>';
        hydrateCovers(gEl);
      }).catch(() => { const gEl = $('#authorGB'); if (gEl) gEl.innerHTML = '<p class="muted sm">Google Books tidak bisa dihubungi.</p>'; });
    });
    return `
    <section class="wrap author-head">
      <span class="author-plate" aria-hidden="true"><b>${esc(initials)}</b><small>ex libris</small></span>
      <div>
        <p class="eyebrow">${ic('edit')} Penulis</p>
        <h1 class="display sm">${esc(name)}</h1>
        <div class="author-stats">
          <span><b>${local.length}</b> buku di ruangbaca</span>
          <span><b>${num(readers)}</b> pembaca</span>
          <span><b>${avg ? avg.toFixed(2) : '–'}</b> rata-rata rating komunitas</span>
          ${hot.length ? `<span class="hot-badge">${ic('flame')}${hot.length} karya lagi ramai / favorit</span>` : ''}
        </div>
        <div class="author-bio" id="authorBio"><p class="muted sm loading-text">${ic('globe')} Mengambil biografi…</p></div>
        <p class="author-links"><a class="link-btn" href="https://www.gramedia.com/search?q=${encodeURIComponent(name)}" target="_blank" rel="noopener">${ic('bag')}Cari karyanya di Gramedia.com →</a></p>
      </div>
    </section>
    ${local.length ? `<section class="wrap">${secHead(`Di ruangbaca <span class="count">${local.length}</span>`, '', 'book')}${local.length > 8 ? `<div class="grid books">${local.map((b) => tile(b, { sub: noteSub(b) })).join('')}</div>` : shelfRow(local)}</section>` : ''}
    <section class="wrap">${secHead('Semua karya · Open Library <span class="muted xs" id="authorWorldCount"></span>', '<span class="muted xs">terpopuler dulu</span>', 'globe')}<div id="authorWorld"><div class="grid books" id="authorGrid">${skeletonRow(8)}</div>
      <p class="center load-more"><button class="btn ghost" id="authorMore" hidden>${ic('plus')}Muat lebih banyak karya</button></p></div></section>
    <section class="wrap">${secHead('Edisi lain · Google Books', '<span class="muted xs">termasuk terbitan Indonesia</span>', 'book')}<div id="authorGB"><div class="grid books">${skeletonRow(6)}</div></div>
      ${addBookCta(name)}</section>`;
  }

  /* ---------- rak penerbit ---------- */
  /** genre ruangbaca → subjek Open Library */
  const SUBJECTS = {
    'Fiksi': 'fiction', 'Sastra Indonesia': 'indonesian fiction', 'Sastra Dunia': 'literary fiction', 'Klasik': 'classic literature',
    'Romansa': 'romance', 'Fantasi': 'fantasy', 'Fiksi Ilmiah': 'science fiction', 'Misteri & Thriller': 'thriller', 'Horor': 'horror',
    'Young Adult': 'young adult fiction', 'Fiksi Sejarah': 'historical fiction', 'Non-Fiksi': 'nonfiction', 'Pengembangan Diri': 'self-help',
    'Psikologi': 'psychology', 'Bisnis & Keuangan': 'business', 'Sejarah': 'history', 'Filsafat': 'philosophy', 'Memoar': 'biography',
    'Sains': 'science', 'Puisi': 'poetry', 'Komik & Manga': 'manga',
  };
  const PUBLISHERS = ['Gramedia Pustaka Utama', 'Kepustakaan Populer Gramedia', 'Elex Media Komputindo', 'Bentang Pustaka', 'Mizan', 'GagasMedia', 'Republika', 'Sabak Grip', 'Noura Books', 'Falcon Publishing', 'Penerbit Haru', 'Bhuana Ilmu Populer', 'Grasindo', 'Marjin Kiri', 'Penerbit Buku Kompas', 'Bukune', 'Mojok', 'Penerbit Baca', 'm&c!', 'Akad'];
  function viewPublisher([name]) {
    setTitle(name);
    let next = 0, loading = false;
    const load = async () => {
      const grid = $('#pubGrid'), more = $('#pubMore');
      if (!grid || loading) return;
      loading = true; if (more) { more.disabled = true; more.innerHTML = '<span class="spinner sm"></span>Memuat…'; }
      try {
        const r = await window.API.browse(`inpublisher:"${name}"`, { start: next });
        next = r.next;
        remember(r.items);
        if (next === 40) grid.innerHTML = '';
        grid.insertAdjacentHTML('beforeend', r.items.map((b) => tile(getBook(b.id) || b, { actions: !!getBook(b.id), sub: tileTitle(b) + (b.year ? `<span class="src-badge">${b.year}</span>` : '') })).join(''));
        hydrateCovers(grid);
        $('#pubCount').textContent = r.total ? `±${num(r.total)} judul di Google Books` : '';
        if (more) { more.hidden = !r.items.length || next >= Math.min(r.total, 400); more.disabled = false; more.innerHTML = `${ic('plus')}Muat lebih banyak`; }
        if (!r.items.length && next === 40) grid.outerHTML = empty('Belum ada judul dari penerbit ini di Google Books.', '#/jelajah', 'Kembali ke Jelajah', 'globe');
      } catch (e) {
        if (more) { more.disabled = false; more.innerHTML = 'Coba lagi'; }
        toast('Katalog penerbit tidak bisa dimuat (offline?)', 'err');
      }
      loading = false;
    };
    onMount(() => { load(); const m = $('#pubMore'); if (m) m.addEventListener('click', load); });
    return `
    <section class="wrap page-head"><p class="eyebrow"><a href="#/jelajah">${ic('compass')} Jelajah</a> · Rak penerbit</p><h1 class="display sm">${esc(name)}</h1>
      <p class="muted">Terbitan berbahasa Indonesia dari penerbit ini, langsung dari katalog Google Books. <span id="pubCount"></span></p></section>
    <div class="wrap chips scroll">${PUBLISHERS.map((p) => `<a class="chip ${p === name ? 'on' : ''}" href="#/penerbit/${encodeURIComponent(p)}">${esc(p)}</a>`).join('')}</div>
    <section class="wrap"><div class="grid books" id="pubGrid">${skeletonRow(12)}</div>
      <p class="center" style="margin-top:26px"><button class="btn ghost" id="pubMore" hidden>${ic('plus')}Muat lebih banyak</button></p></section>`;
  }

  /** buku yang sedang ramai: kurasi terkini + aktivitas komunitas, hanya terbitan baru */
  function hotBooks() {
    const y = new Date().getFullYear();
    const comm = new Map(trendingCommunity(30).map((x) => [x.b.id, x.v]));
    return books().filter((b) => b.hot || (comm.has(b.id) && (b.year || y) >= y - 3))
      .sort((a, b) => (comm.get(b.id) || 0) - (comm.get(a.id) || 0) || (b.hot ? 1 : 0) - (a.hot ? 1 : 0) || (a.rank || 9999) - (b.rank || 9999));
  }
  const noteSub = (b) => tileTitle(b) + (b.trend_note ? `<span class="trend-note">${ic('flame')}${esc(b.trend_note)}</span>` : '');
  const shelfRow = (list, { rank = false } = {}) => `<div class="row-scroll shelf">${list.map((b, i) => tile(b, { rank: rank ? i + 1 : null, sub: noteSub(b) })).join('')}</div>`;

  function homeGuest() {
    setTitle('');
    const hot = hotBooks();
    const fav = favBooks();
    const reviews = S.where('diary_entries', (e) => e.review).sort(byCreatedDesc).slice(0, 4);
    const listings = S.where('listings', (l) => l.status === 'available').sort(byCreatedDesc).slice(0, 4);
    const users = S.table('profiles').length;
    return `
    ${coverHero(true)}
    <section class="wrap">${secHead('Lagi ramai sekarang', '<a href="#/trending" class="more">Semua trending →</a>', 'flame')}
      <p class="muted sm sec-sub">Dari daftar best seller Gramedia.com 2025–2026, ditambah yang paling banyak dicatat di ruangbaca.</p>
      ${liveShelf('hot', 16, { rank: true })}</section>
    <section class="wrap">${secHead('Favorit pembaca Indonesia', '<a href="#/jelajah" class="more">Jelajah →</a>', 'bookmark')}${liveShelf('fav', 18)}</section>
    <section class="wrap">${secHead('Dari penulis hits', '<a href="#/trending" class="more">Penulis lain →</a>', 'edit')}${hitAuthorChips()}<div class="gap-sm"></div>${liveShelf('hits', 20)}</section>
    <section class="wrap">${secHead('Semesta Tere Liye', `<a href="${authorHref('Tere Liye')}" class="more">Semua karya →</a>`, 'book')}${liveShelf('author', 18, { author: 'Tere Liye' })}</section>
    <section class="hero-book">
      <div class="wrap">
        <div class="open-book">
          <div class="ob-page left">
            <span class="ob-folio">ruangbaca · halaman 1</span>
            <p class="eyebrow">${ic('book')} Jejaring sosial para pembaca</p>
            <h1 class="display">Setiap buku yang kamu baca <em>layak dicatat.</em></h1>
            <p class="ob-lead">Catat bacaanmu, beri rating, tulis ulasan, ikuti teman, jual buku preloved, dan lihat Reading Wrap-mu — semua dalam satu rak.</p>
            <div class="hero-cta">
              <button class="btn primary lg" data-action="open-auth" data-tab="register">Mulai membaca bersama</button>
              <a href="#/jelajah" class="btn ghost lg">${ic('search')}Cari judul / ISBN</a>
            </div>
            <p class="hero-note">${users ? `${num(users)} pembaca sudah bergabung · ` : ''}Jutaan judul dari seluruh dunia · tanpa ulasan palsu</p>
          </div>
          <div class="ob-page right">
            <span class="ob-folio">halaman 2</span>
            <p class="label">${ic('compass')} Rak penerbit Indonesia</p>
            <ol class="ob-list">${PUBLISHERS.slice(0, 7).map((p) => `<li><a href="#/penerbit/${encodeURIComponent(p)}"><b>${esc(p)}</b><small>buka rak</small></a></li>`).join('')}</ol>
            <a href="#/jelajah" class="link-btn">Semua penerbit &amp; genre →</a>
          </div>
          <span class="ob-ribbon" aria-hidden="true"></span>
        </div>
      </div>
    </section>
    <section class="wrap features">
      ${[['calendar', 'Diary bacaan', 'Catat tanggal selesai, rating setengah bintang, dan ulasan dengan penanda spoiler.', 'read'],
         ['users', 'Medsos pembaca', 'Ikuti teman, sukai & komentari ulasan, lihat apa yang sedang mereka baca.', 'reading'],
         ['bag', 'Preloved', 'Jual buku bekasmu dengan foto & kondisi asli, lalu ngobrol langsung dengan pembeli.', 'want'],
         ['gift', 'Reading Wrap', 'Rangkuman bacaan bulanan & tahunan ala Spotify: genre, penulis favorit, persona bacamu.', 'like']]
        .map(([i, t, d, c], k) => `<div class="feature f-${c}"><span class="f-num">Bab ${['I', 'II', 'III', 'IV'][k]}</span><span class="f-ic">${ic(i)}</span><h3>${t}</h3><p>${d}</p></div>`).join('')}
    </section>
    <section class="wrap two-col">
      <div>${secHead('Ulasan terbaru komunitas', '', 'message')}${reviews.length ? `<div class="reviews">${reviews.map((e) => reviewCard(e)).join('')}</div>` : empty('Belum ada ulasan. Ulasan di sini 100% ditulis pembaca asli — jadilah yang pertama!', '', '', 'message', '<button class="btn primary sm" data-action="open-auth" data-tab="register">Buat akun</button>')}</div>
      <div>${secHead('Preloved terbaru', '<a href="#/preloved" class="more">Lihat lapak →</a>', 'bag')}${listings.length ? `<div class="listing-mini">${listings.map((l) => window.RB.listingMini(l)).join('')}</div>` : empty('Belum ada buku yang dijual. Punya buku bekas? Beri ia rumah baru.', '#/jual', 'Jual buku', 'bag')}</div>
    </section>`;
  }

  function buildFeed(uid, scope) {
    const ids = scope === 'all' ? null : new Set(followingIds(uid));
    const ok = (id) => (ids ? ids.has(id) : id !== uid);
    const items = [
      ...S.where('diary_entries', (e) => ok(e.user_id)).map((e) => ({ kind: 'entry', e, t: e.created_at })),
      ...S.where('lists', (l) => ok(l.user_id)).map((l) => ({ kind: 'list', l, t: l.created_at })),
      ...S.where('listings', (l) => ok(l.seller_id)).map((l) => ({ kind: 'listing', l, t: l.created_at })),
    ];
    return items.sort((a, b) => ts(b.t) - ts(a.t)).slice(0, 25);
  }
  function topGenresOf(uid) {
    const c = {};
    S.where('user_books', (r) => r.user_id === uid && (r.status || r.liked || r.rating)).forEach((r) => {
      const b = getBook(r.book_id);
      (b?.genres || []).forEach((g) => { c[g] = (c[g] || 0) + 1 + (r.rating >= 4 ? 1 : 0) + (r.liked ? 1 : 0); });
    });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([g]) => g);
  }

  function homeUser() {
    const u = me();
    setTitle('Beranda');
    const year = new Date().getFullYear(), month = new Date().getMonth();
    const reading = S.where('user_books', (r) => r.user_id === u.id && r.status === 'reading');
    const following = followingIds(u.id).length;
    const scope = store.get('ruangbaca.feed') || (following ? 'following' : 'all');
    const feed = buildFeed(u.id, scope);
    const fIds = new Set(followingIds(u.id));
    const suggest = S.table('profiles').filter((x) => x.id !== u.id && !fIds.has(x.id)).sort((a, b) => followerIds(b.id).length - followerIds(a.id).length).slice(0, 4);
    const myYear = yearEntries(u.id, year);
    const myMonth = myYear.filter((e) => parseDay(e.read_date).getMonth() === month);
    const want = S.where('user_books', (r) => r.user_id === u.id && r.status === 'want').length;
    const mine = new Set(S.where('user_books', (r) => r.user_id === u.id && (r.status || r.liked)).map((r) => r.book_id));
    const tg = topGenresOf(u.id);
    const picks = books().filter((b) => !mine.has(b.id))
      .map((b) => ({ b, s: (b.genres || []).reduce((s, g) => s + Math.max(0, 6 - (tg.indexOf(g) + 1 || 7)), 0) * 3 + communityScore(b) - (b.rank || 999) / 200 }))
      .sort((a, b) => b.s - a.s).slice(0, 12).map((x) => x.b);
    const trend = trendingCommunity().slice(0, 12);
    const listings = S.where('listings', (l) => l.status === 'available' && l.seller_id !== u.id).sort(byCreatedDesc).slice(0, 3);
    return `
    ${coverHero(false)}
    <div class="wrap layout">
      <div class="main-col">
        <section>${secHead('Lagi ramai sekarang', '<a href="#/trending" class="more">Selengkapnya →</a>', 'flame')}${liveShelf('hot', 14, { rank: true })}</section>
        <section>${secHead('Favorit pembaca Indonesia', '<a href="#/trending?t=indonesia" class="more">Selengkapnya →</a>', 'bookmark')}${liveShelf('fav', 16)}</section>
        <section>${secHead('Dari penulis hits', '', 'edit')}${hitAuthorChips()}<div class="gap-sm"></div>${liveShelf('hits', 18)}</section>
        <a href="#/wrap" class="wrap-banner"><span class="wb-ic">${ic('gift')}</span><span><b>Reading Wrap ${MONTHS[month]} ${year}</b><small>${myMonth.length ? `${myMonth.length} buku bulan ini — lihat rangkumannya ala Spotify ✨` : 'Catat bacaanmu bulan ini, lalu lihat rangkumannya ala Spotify ✨'}</small></span>${ic('right')}</a>
        ${reading.length ? `<section class="card">${secHead('Sedang kamu baca', '', 'book')}<div class="progress-list">${reading.map(progressCard).join('')}</div></section>` : ''}
        ${trend.length ? `<section>${secHead('Hangat di ruangbaca minggu ini', '', 'trending')}${shelfRow(trend.map((x) => x.b))}</section>` : ''}
        <section>${secHead('Aktivitas', `<div class="seg mini"><button data-action="feed-scope" data-scope="following" class="${scope === 'following' ? 'on' : ''}">Mengikuti</button><button data-action="feed-scope" data-scope="all" class="${scope === 'all' ? 'on' : ''}">Semua</button></div>`, 'users')}
          ${feed.length ? `<div class="feed card flush">${feed.map(feedItem).join('')}</div>` : empty(scope === 'following' ? 'Belum ada aktivitas dari orang yang kamu ikuti. Temukan pembaca lain atau lihat semua aktivitas.' : 'Belum ada aktivitas di komunitas. Mulailah dengan mencatat buku yang kamu baca!', '#/anggota', 'Temukan anggota', 'users')}
        </section>
        <section>${secHead('Rekomendasi untukmu', '<a href="#/jelajah" class="more">Jelajah →</a>', 'sparkle')}
          <p class="muted sm sec-sub">${tg.length ? `Berdasarkan seleramu: ${tg.slice(0, 3).map(esc).join(', ')}.` : 'Tandai beberapa buku agar rekomendasinya makin pas.'}</p>
          <div class="grid books">${picks.map((b) => tile(b, { sub: tileTitle(b) })).join('')}</div></section>
      </div>
      <aside class="side-col">
        <div class="card me-card"><p class="eyebrow">${greeting()}, ${esc(firstName(u))}.</p><p class="me-q">Mau membaca apa hari ini?</p>
          <div class="quick-stats">
            <a href="#/u/${esc(u.username)}/diary" class="qs q-read"><b>${myYear.length}</b><span>dibaca ${year}</span></a>
            <a href="#/u/${esc(u.username)}/rak?s=reading" class="qs q-reading"><b>${reading.length}</b><span>sedang dibaca</span></a>
            <a href="#/u/${esc(u.username)}/rak?s=want" class="qs q-want"><b>${want}</b><span>ingin dibaca</span></a>
          </div></div>
        ${goalWidget(u)}
        ${listings.length ? `<div class="card">${secHead('Preloved terbaru', '<a href="#/preloved" class="more">Lapak →</a>', 'bag')}<div class="listing-mini">${listings.map((l) => window.RB.listingMini(l)).join('')}</div></div>` : ''}
        ${suggest.length ? `<div class="card">${secHead('Pembaca untuk diikuti', '', 'users')}${suggest.map(userRow).join('')}</div>` : ''}
        <div class="card">${secHead('Jelajahi genre', '', 'compass')}<div class="chips">${genres().map((g) => `<a class="chip" href="#/jelajah?genre=${encodeURIComponent(g)}">${esc(g)}</a>`).join('')}</div></div>
      </aside>
    </div>`;
  }

  /* ===================== jelajah ===================== */
  const exploreHref = (o) => '#/jelajah?' + new URLSearchParams(Object.entries(o).filter(([, v]) => v)).toString();
  function viewExplore(_, q) {
    const query = q.q || '', genre = q.genre || '', sort = q.sort || 'populer';
    setTitle(query ? `Cari “${query}”` : 'Jelajah');
    let list = searchBooks(query);
    const matchAuthors = query.length >= 3 && !window.API.cleanIsbn(query) ? [...new Set(books().map((b) => String(b.author).split(/\s*&\s*/)[0]).filter((a) => norm(a).includes(norm(query))))].slice(0, 4) : [];
    if (genre) list = list.filter((b) => (b.genres || []).includes(genre));
    const avg = (b) => bookStats(b.id).avg;
    const sorters = {
      populer: (a, b) => communityScore(b) - communityScore(a) || (a.rank || 9999) - (b.rank || 9999),
      rating: (a, b) => avg(b) - avg(a) || communityScore(b) - communityScore(a),
      terbaru: (a, b) => (b.year || 0) - (a.year || 0),
      terlama: (a, b) => (a.year || 9999) - (b.year || 9999),
      judul: (a, b) => a.title.localeCompare(b.title, 'id'),
    };
    list.sort(sorters[sort] || sorters.populer);
    const people = searchUsers(query);
    onMount(() => {
      $('#exploreForm').addEventListener('submit', (e) => { e.preventDefault(); go(exploreHref({ q: e.target.q.value.trim(), genre, sort })); });
      $('#sortSel').addEventListener('change', (e) => go(exploreHref({ q: query, genre, sort: e.target.value })));
      if (query && /openlibrary\.org\/(works|books)\//i.test(query)) {
        window.API.resolveOlLink(query).then((id) => { if (id) location.replace('#/buku/' + encodeURIComponent(id)); else toast('Tautan Open Library tidak dikenali', 'err'); }).catch(() => toast('Open Library tidak bisa dihubungi', 'err'));
        return;
      }
      if (query) {
        const el = $('#worldResults');
        const isbn = window.API.cleanIsbn(query);
        const shown = new Set(list.map((b) => b.id));
        const localTitles = new Set(list.map((b) => norm(b.title)));
        const src = (b) => `<span class="src-badge">${b._isbnMatch ? 'ISBN cocok persis · ' : ''}${b.source === 'googlebooks' ? 'Google Books' : 'Open Library'}${b.year ? ' · ' + b.year : ''}</span>`;
        const keep = (items) => remember(items.filter((b) => {
          if (shown.has(b.id) || localTitles.has(norm(b.title))) return false;
          const loc = localFromWorld(b);
          if (loc && isbn) { shown.add(loc.id); return false; }
          if (getBook(b.id) && !isbn) return false;
          shown.add(b.id); return true;
        }));
        let page = 1, total = 0, count = 0;
        const more = async (btn) => {
          btn.disabled = true; btn.innerHTML = '<span class="spinner sm"></span>Memuat…';
          try {
            const r = await window.API.olSearch(query, ++page);
            const fresh = keep(r.items);
            count += fresh.length;
            $('#worldGrid', el).insertAdjacentHTML('beforeend', fresh.map((b) => tile(b, { actions: false, sub: tileTitle(b) + src(b) })).join(''));
            hydrateCovers(el);
            $('#worldCount').textContent = `${num(count)} ditampilkan · ±${num(total)} di Open Library`;
            btn.hidden = page * 40 >= total; btn.disabled = false; btn.innerHTML = `${ic('plus')}Muat lebih banyak dari Open Library`;
          } catch (e) { btn.disabled = false; btn.textContent = 'Coba lagi'; }
        };
        const firstOL = isbn ? Promise.resolve({ items: [], total: 0 }) : window.API.olSearch(query, 1).catch(() => ({ items: [], total: 0 }));
        Promise.all([window.API.searchWorld(query), firstOL]).then(([items, ol]) => {
          if (!document.contains(el)) return;
          total = ol.total;
          const fresh = keep([...items, ...ol.items]);
          count = fresh.length;
          if (isbn) {
            const localHits = [];
            const worldHits = [];
            items.forEach((b) => {
              const loc = localFromWorld(b);
              if (loc) { if (!list.includes(loc) && !localHits.includes(loc)) localHits.push(loc); }
              else worldHits.push(b);
            });
            remember(worldHits);
            $('#worldCount').textContent = items.length ? 'ISBN cocok persis' : '';
            el.innerHTML = localHits.length || worldHits.length
              ? `<div class="grid books" id="worldGrid">${localHits.map((b) => tile(b, { sub: tileTitle(b) + '<span class="src-badge">ISBN cocok · sudah ada di ruangbaca</span>' })).join('')}${worldHits.map((b) => tile(b, { actions: false, sub: tileTitle(b) + src(b) })).join('')}</div>`
              : list.length
                ? '<p class="muted sm">Buku dengan ISBN ini sudah ada di ruangbaca (lihat di atas).</p>'
                : `<div class="empty slim">${ic('tag')}<p><b>ISBN ${esc(isbn)} tidak ditemukan</b> di Open Library maupun Google Books. Kami sengaja tidak menampilkan buku "mirip" supaya tidak salah — tambahkan bukunya sendiri di bawah.</p></div>${addBookCta(isbn)}`;
          } else {
            $('#worldCount').textContent = fresh.length ? `${num(count)} ditampilkan${total ? ` · ±${num(total)} di Open Library` : ''}` : '';
            el.innerHTML = (fresh.length ? `<div class="grid books" id="worldGrid">${fresh.map((b) => tile(b, { actions: false, sub: tileTitle(b) + src(b) })).join('')}</div>` : '<p class="muted sm">Tidak ada hasil tambahan dari katalog dunia.</p>')
              + (total > 40 ? `<p class="center load-more"><button class="btn ghost" id="worldMore">${ic('plus')}Muat lebih banyak dari Open Library</button></p>` : '')
              + addBookCta(query);
            const mb = $('#worldMore', el); if (mb) mb.addEventListener('click', () => more(mb));
          }
          hydrateCovers(el);
        }).catch(() => { if (document.contains(el)) el.innerHTML = `<div class="empty slim">${ic('globe')}<p>Katalog dunia tidak bisa dihubungi (offline?). Hasil di atas berasal dari ruangbaca.</p></div>` + addBookCta(query); });
      }
      if (!query && genre && SUBJECTS[genre]) {
        const el = $('#subjectShelf');
        let page = 0, loading = false;
        const load = async () => {
          if (loading || !document.contains(el)) return;
          loading = true;
          const btn = $('#subjectMore');
          if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner sm"></span>Memuat…'; }
          try {
            const r = await window.API.olSubject(SUBJECTS[genre], ++page);
            const have = new Set(books().map((b) => norm(b.title)));
            const fresh = remember(r.items.filter((b) => !have.has(norm(b.title)) && !getBook(b.id)));
            const grid = $('#subjectGrid');
            if (page === 1) grid.innerHTML = '';
            grid.insertAdjacentHTML('beforeend', fresh.map((b) => tile(b, { actions: false, sub: tileTitle(b) + (b.year ? `<span class="src-badge">${b.year}</span>` : '') })).join(''));
            hydrateCovers(grid);
            $('#subjectCount').textContent = r.total ? `±${num(r.total)} judul` : '';
            if (btn) { btn.hidden = page * 48 >= r.total; btn.disabled = false; btn.innerHTML = `${ic('plus')}Muat lebih banyak`; }
          } catch (e) { if (btn) { btn.disabled = false; btn.textContent = 'Coba lagi'; } }
          loading = false;
        };
        load();
        $('#subjectMore').addEventListener('click', load);
      }
    });
    return `
    <section class="wrap page-head"><p class="eyebrow">${ic('compass')} Jelajah</p><h1 class="display sm">${query ? `Hasil untuk “${esc(query)}”` : genre ? esc(genre) : 'Temukan bacaan berikutnya'}</h1>
      <p class="muted">Cari pakai judul, penulis, penerbit, atau <b>ISBN</b> — dari ruangbaca dan jutaan judul di katalog dunia (Open Library &amp; Google Books, termasuk terbitan Indonesia). Tidak ketemu? Tambahkan sendiri.</p>${window.API.cleanIsbn(query) ? `<p class="isbn-chip">${ic('tag')} Mencari ISBN <b>${esc(window.API.isbnForms(query).join(' / '))}</b> · hanya hasil yang cocok persis</p>` : ''}${matchAuthors.length ? `<div class="author-chips sm">${matchAuthors.map((a) => `<a class="author-chip" href="${authorHref(a)}"><span>${esc(a.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase())}</span>Penulis: ${esc(a)} →</a>`).join('')}</div>` : ''}</section>
    <section class="wrap explore-bar">
      <form id="exploreForm" class="explore-search">${ic('search')}<input name="q" class="input" value="${esc(query)}" placeholder="Judul, penulis, penerbit, atau ISBN (978…)" autocomplete="off"><button type="button" class="scan-btn" data-action="scan-isbn" title="Scan barcode ISBN">${ic('barcode')}<span>Scan ISBN</span></button></form>
      <label class="sort"><span class="muted sm">Urutkan</span><select id="sortSel" class="input sm">
        ${[['populer', 'Terpopuler'], ['rating', 'Rating komunitas'], ['terbaru', 'Terbit terbaru'], ['terlama', 'Terbit terlama'], ['judul', 'Judul A–Z']].map(([v, l]) => `<option value="${v}" ${v === sort ? 'selected' : ''}>${l}</option>`).join('')}
      </select></label>
      <a href="#/trending" class="btn ghost">${ic('flame')}Trending</a>
      <button class="btn ghost" data-action="add-book">${ic('plus')}Tambah buku</button>
    </section>
    <div class="wrap chips scroll">${['', ...genres()].map((g) => `<a class="chip ${g === genre ? 'on' : ''}" href="${exploreHref({ q: query, genre: g, sort })}">${g ? esc(g) : 'Semua'}</a>`).join('')}</div>
    ${!query && !genre ? `<section class="wrap pub-shelf"><span class="label">${ic('book')} Rak penerbit Indonesia</span><div class="chips scroll">${PUBLISHERS.map((p) => `<a class="chip pub" href="#/penerbit/${encodeURIComponent(p)}">${esc(p)}</a>`).join('')}</div></section>` : ''}
    ${people.length ? `<section class="wrap"><h2 class="sec-title sm">${ic('users')}Anggota</h2><div class="people-grid">${people.slice(0, 6).map(userRow).join('')}</div></section>` : ''}
    <section class="wrap">${query ? secHead(`Di ruangbaca <span class="count">${list.length}</span>`, '', 'book') : ''}${list.length ? `<div class="grid books">${list.map((b) => tile(b, { sub: tileTitle(b) + avgSub(b) })).join('')}</div>` : (query ? '<p class="muted sm">Belum ada di ruangbaca — lihat katalog dunia di bawah.</p>' : empty('Tidak ada buku di genre ini.', '#/jelajah', 'Semua buku', 'search'))}</section>
    ${query ? `<section class="wrap">${secHead(`Dari katalog dunia <span class="muted xs" id="worldCount"></span>`, '', 'globe')}<div id="worldResults"><div class="grid books">${skeletonRow(6)}</div></div></section>` : ''}
    ${!query && genre && SUBJECTS[genre] ? `<section class="wrap" id="subjectShelf">${secHead(`Rak ${esc(genre)} dari Open Library <span class="muted xs" id="subjectCount"></span>`, '<span class="muted xs">tanpa batas · terpopuler dulu</span>', 'globe')}<div class="grid books" id="subjectGrid">${skeletonRow(12)}</div><p class="center load-more"><button class="btn ghost" id="subjectMore" hidden>${ic('plus')}Muat lebih banyak</button></p></section>` : ''}`;
  }
  function avgSub(b) {
    const s = bookStats(b.id);
    return s.count ? `<span class="avg-sub">★ ${s.avg.toFixed(1)} <small>(${s.count})</small></span>` : '';
  }

  /* ===================== trending ===================== */
  function viewTrending(_, q) {
    setTitle('Trending');
    const year = new Date().getFullYear();
    const tab = q.t || 'semua';
    const hot = hotBooks();
    const hotId = hot.filter((b) => b.language === 'id');
    const hotIntl = hot.filter((b) => b.language !== 'id');
    const fav = favBooks();
    const favId = fav.filter((b) => b.language === 'id'), favIntl = fav.filter((b) => b.language !== 'id');
    const intl = books().filter((b) => b.intl);
    const comm = trendingCommunity(7).slice(0, 18);
    const tabFilter = (b) => (tab === 'indonesia' ? b.language === 'id' : tab === 'dunia' ? b.language !== 'id' : true);
    const fresh = books().filter((b) => (b.year || 0) >= year - 1 && (b.hot || b.fav || b.intl || communityScore(b))).filter(tabFilter)
      .sort((a, b) => (b.year || 0) - (a.year || 0) || communityScore(b) - communityScore(a) || (a.rank || 999) - (b.rank || 999)).slice(0, 18);
    const authors = (() => {
      const m = new Map();
      [...hot, ...fav].filter(tabFilter).forEach((b) => { const a = String(b.author).split(/\s*&\s*/)[0]; m.set(a, (m.get(a) || 0) + (b.hot ? 2 : 1)); });
      books().filter(tabFilter).forEach((b) => { const a = String(b.author).split(/\s*&\s*/)[0]; if (m.has(a)) m.set(a, m.get(a) + 0.3); });
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([a]) => a);
    })();
    const recent = (b) => (b.year || year) >= year - 3;
    const mostRead = books().filter(recent).map((b) => ({ b, s: bookStats(b.id) })).filter((x) => x.s.readers).sort((a, b) => b.s.readers - a.s.readers).slice(0, 10);
    const topRated = books().filter(recent).map((b) => ({ b, s: bookStats(b.id) })).filter((x) => x.s.count >= 2).sort((a, b) => b.s.avg - a.s.avg || b.s.count - a.s.count).slice(0, 10);
    const mostReviewed = books().filter(recent).map((b) => ({ b, s: bookStats(b.id) })).filter((x) => x.s.reviews).sort((a, b) => b.s.reviews - a.s.reviews).slice(0, 10);
    const commEmpty = (t) => `<div class="empty slim">${ic('users')}<p>${t}</p></div>`;
    const tabs = [['semua', 'Semua'], ['indonesia', 'Indonesia'], ['dunia', 'Internasional']];
    const showId = tab !== 'dunia', showIntl = tab !== 'indonesia';
    return `
    <section class="wrap page-head"><p class="eyebrow">${ic('flame')} Trending</p><h1 class="display sm">Buku yang lagi ramai sekarang</h1>
      <p class="muted">Buku hits yang familiar: disusun dari daftar best seller Gramedia.com 2025–2026, buku yang terus dicari pembaca Indonesia, dan aktivitas nyata anggota ruangbaca.</p></section>
    <div class="wrap chips">${tabs.map(([k, l]) => `<a class="chip ${k === tab ? 'on' : ''}" href="#/trending?t=${k}">${l}</a>`).join('')}</div>
    ${showId ? `<section class="wrap">${secHead('Lagi ramai di Indonesia', '<span class="muted xs">best seller Gramedia.com 2025–2026</span>', 'flame')}${liveShelf('hotId', 30, { rank: true })}</section>` : ''}
    ${showId ? `<section class="wrap">${secHead('Favorit pembaca Indonesia', '<span class="muted xs">terus dicari &amp; dicetak ulang</span>', 'bookmark')}${liveShelf('favId', 30)}</section>` : ''}
    ${showId ? `<section class="wrap">${secHead('Dari penulis hits', '', 'edit')}${liveShelf('hits', 30)}</section>` : ''}
    ${showIntl ? `<section class="wrap">${secHead('Buku luar yang lagi ramai di sini', '', 'flame')}${liveShelf('hotIntl', 20, { rank: true })}</section>` : ''}
    ${showIntl ? `<section class="wrap">${secHead('Favorit pembaca dunia', '', 'bookmark')}${liveShelf('favIntl', 20)}</section>` : ''}
    <section class="wrap">${secHead('Hangat di ruangbaca · 7 hari', '', 'users')}${comm.length ? shelfRow(comm.map((x) => x.b), { rank: true }) : commEmpty('Belum ada aktivitas minggu ini. Catat atau tandai buku untuk membuatnya trending!')}</section>
    ${authors.length ? `<section class="wrap">${secHead('Penulis yang lagi dicari', '', 'edit')}<div class="author-chips">${authors.map((a) => `<a class="author-chip" href="${authorHref(a)}"><span>${esc(a.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase())}</span>${esc(a)}</a>`).join('')}</div></section>` : ''}
    ${fresh.length ? `<section class="wrap">${secHead(`Terbitan ${year - 1}–${year}`, '', 'sparkle')}${shelfRow(fresh)}</section>` : ''}
    ${showIntl && tab === 'dunia' && intl.length ? `<section class="wrap">${secHead('Bestseller luar negeri', '<span class="muted xs">Publishers Weekly 2026</span>', 'globe')}${liveShelf('intl', 20)}</section>` : ''}
    <section class="wrap three-col">
      <div class="card">${secHead('Paling banyak dibaca', '', 'eye')}${mostRead.length ? mostRead.map((x, i) => rankRow(x.b, i, `${x.s.readers} pembaca`)).join('') : '<p class="muted sm">Belum ada data dari anggota.</p>'}</div>
      <div class="card">${secHead('Rating tertinggi', '', 'award')}${topRated.length ? topRated.map((x, i) => rankRow(x.b, i, `★ ${x.s.avg.toFixed(2)} · ${x.s.count} penilaian`)).join('') : '<p class="muted sm">Butuh minimal 2 penilaian per buku.</p>'}</div>
      <div class="card">${secHead('Paling banyak diulas', '', 'message')}${mostReviewed.length ? mostReviewed.map((x, i) => rankRow(x.b, i, `${x.s.reviews} ulasan`)).join('') : '<p class="muted sm">Belum ada ulasan.</p>'}</div>
    </section>`;
  }
  const rankRow = (b, i, meta) => `<a class="rank-row" href="#/buku/${encodeURIComponent(b.id)}"><span class="rr-n">${i + 1}</span>${cover(b, { size: 'xs', link: false })}<span class="rr-body"><b>${esc(b.title)}</b><small>${esc(b.author)} · ${meta}</small></span></a>`;

  /* ===================== detail buku ===================== */
  function viewBook([id]) {
    let b = getBook(id);
    if (!b) {
      if (!/^(ol|ole|gb)-/.test(id)) return viewNotFound();
      const pre = worldCache.get(id);
      setTitle(pre ? pre.title : 'Memuat buku…');
      onMount(() => ensureBook(id).then(() => { if (parseHash().path === `/buku/${id}` || decodeURIComponent(parseHash().path) === `/buku/${id}`) refresh(); }).catch(() => {
        const el = $('#bookLoading'); if (el) el.innerHTML = empty('Buku tidak bisa dimuat dari katalog dunia. Periksa koneksi internet lalu coba lagi.', '#/jelajah', 'Kembali ke Jelajah', 'globe');
      }));
      return `<section class="wrap book-page" id="bookLoading"><div class="book-cover-col">${pre ? cover(pre, { link: false, size: 'lg' }) : '<span class="cover lg skel"></span>'}</div><div class="book-main"><div class="skel-line w60"></div><div class="skel-line w40"></div><div class="skel-line"></div><div class="skel-line"></div><p class="muted sm">${ic('globe')} Mengambil data dari katalog dunia…</p></div></section>`;
    }
    setTitle(b.title);
    onMount(() => {
      const box = $('#editionsBox');
      const k = window.API.metaOf(b).olKey;
      if (!box || !k) return;
      window.API.editions(k).then((r) => {
        if (!document.contains(box) || !r.items.length) return;
        box.innerHTML = `<details class="editions"><summary>${ic('book')}Edisi lain <b>${num(r.total)}</b><small>ISBN, penerbit, bahasa · Open Library</small></summary>
          <div class="ed-table">${r.items.map((e) => `<div class="ed-row">${e.cover ? `<img src="${esc(e.cover)}" alt="" loading="lazy">` : '<span class="ed-ph"></span>'}
            <div class="ed-main"><b>${esc(e.title || b.title)}</b><small>${[e.publisher, e.year, e.lang, e.pages ? e.pages + ' hlm' : ''].filter(Boolean).map(esc).join(' · ')}</small></div>
            ${e.isbn ? `<a class="ed-isbn" href="#/jelajah?q=${e.isbn}" title="Cari ISBN ini">${e.isbn}</a>` : '<span class="ed-isbn muted">tanpa ISBN</span>'}</div>`).join('')}</div>
          ${r.total > r.items.length ? `<a class="link-btn" href="https://openlibrary.org/works/${esc(k)}/editions" target="_blank" rel="noopener">Lihat semua ${num(r.total)} edisi di Open Library →</a>` : ''}</details>`;
      }).catch(() => { /* edisi opsional */ });
    });
    const st = bookStats(b.id);
    const u = me();
    const sh = u ? shelfOf(u.id, b.id) : null;
    const reviews = S.where('diary_entries', (e) => e.book_id === b.id && e.review).map((e) => ({ e, n: reviewLikes(e.id).length })).sort((a, c) => c.n - a.n || ts(c.e.created_at) - ts(a.e.created_at));
    const friends = u ? followingIds(u.id).map((fid) => ({ f: getUser(fid), s: shelfOf(fid, b.id) })).filter((x) => x.f && x.s && (x.s.status || x.s.rating || x.s.liked)) : [];
    const inLists = S.table('lists').filter((l) => listItems(l.id).some((i) => i.book_id === b.id));
    const listings = S.where('listings', (l) => l.book_id === b.id && l.status !== 'sold').sort((a, c) => a.price - c.price);
    const similar = books().filter((x) => x.id !== b.id)
      .map((x) => ({ x, o: (x.genres || []).filter((g) => (b.genres || []).includes(g)).length + (x.author === b.author ? 2 : 0) }))
      .filter((r) => r.o > 0).sort((a, c) => c.o - a.o || communityScore(c.x) - communityScore(a.x) || (a.x.rank || 999) - (c.x.rank || 999)).slice(0, 6).map((r) => r.x);
    const maxH = Math.max(1, ...st.hist);
    const myEntries = u ? S.where('diary_entries', (e) => e.user_id === u.id && e.book_id === b.id).sort(byReadDesc) : [];
    const statusLabel = { read: 'Sudah dibaca', reading: 'Sedang dibaca', want: 'Ingin dibaca' };
    const pages = pagesOf(b);
    const bid = esc(b.id);
    const mt = window.API.metaOf(b);
    if (!mt.loaded && (!mt.synopsis || !mt.isbn)) window.API.enrich(b);
    const langName = { id: 'Indonesia', en: 'Inggris', ja: 'Jepang', ko: 'Korea', eng: 'Inggris', ind: 'Indonesia' }[b.language] || (b.language ? b.language.toUpperCase() : null);
    const srcLink = b.ol_key ? `https://openlibrary.org/works/${b.ol_key}` : b.source === 'googlebooks' ? `https://books.google.com/books?id=${b.id.slice(3)}` : `https://www.google.com/search?tbm=bks&q=${encodeURIComponent((b.isbn || b.title) + ' ' + b.author)}`;

    return `
    <div class="book-backdrop" style="${coverVars(b).style}"></div>
    <section class="wrap book-page">
      <div class="book-cover-col">
        ${cover(b, { link: false, size: 'lg' })}
        <div class="book-mini-stats">
          <span title="${st.readers} orang sudah membaca" class="ms read">${ic('eye')}${st.readers}</span>
          <span title="${st.likes} orang menyukai" class="ms like">${ic('heart')}${st.likes}</span>
          <span title="Ada di ${inLists.length} daftar" class="ms list">${ic('list')}${inLists.length}</span>
        </div>
      </div>
      <div class="book-main">
       <div class="book-info">
        <p class="eyebrow">${(b.genres || []).map((g) => `<a href="#/jelajah?genre=${encodeURIComponent(g)}">${esc(g)}</a>`).join(' · ')}</p>
        <h1 class="book-title">${esc(b.title)}</h1>
        <p class="book-author">${mt.year ? `<span class="year">${mt.year}</span> · ` : ''}oleh <a href="${authorHref(b.author)}">${esc(b.author)}</a></p>
        ${b.hot && b.trend_note ? `<p class="hot-badge">${ic('flame')}Lagi ramai · ${esc(b.trend_note)}</p>` : ''}
        <div class="synopsis">${mt.synopsis ? paras(mt.synopsis) : (mt.loaded ? '<p class="muted">Belum ada sinopsis untuk buku ini.</p>' : `<p class="muted loading-text">${ic('globe')} Mengambil sinopsis dari Google Books &amp; Open Library…</p>`)}</div>
        <dl class="colophon">
          <div><dt>Penulis</dt><dd><a href="${authorHref(b.author)}">${esc(b.author)}</a></dd></div>
          ${mt.publisher ? `<div><dt>Penerbit</dt><dd><a href="#/penerbit/${encodeURIComponent(mt.publisher)}">${esc(mt.publisher)}</a></dd></div>` : ''}
          ${mt.year ? `<div><dt>Terbit</dt><dd>${mt.year}</dd></div>` : ''}
          ${pages ? `<div><dt>Tebal</dt><dd>${num(pages)} halaman</dd></div>` : ''}
          ${mt.isbn ? `<div><dt>ISBN</dt><dd><a href="#/jelajah?q=${encodeURIComponent(mt.isbn)}">${esc(mt.isbn)}</a></dd></div>` : ''}
          ${langName ? `<div><dt>Bahasa</dt><dd>${esc(langName)}</dd></div>` : ''}
          <div><dt>Genre</dt><dd>${(b.genres || []).map(esc).join(', ') || '–'}</dd></div>
          <div><dt>Sumber data</dt><dd><a href="${srcLink}" target="_blank" rel="noopener">${b.source === 'googlebooks' ? 'Google Books' : b.source === 'pengguna' ? 'Ditambahkan anggota' : 'Open Library / Google Books'}</a></dd></div>
        </dl>
        <div id="editionsBox"></div>
        <div class="buy-row"><a class="btn ghost sm" href="https://www.gramedia.com/search?q=${encodeURIComponent(mt.isbn || (b.title + ' ' + b.author))}" target="_blank" rel="noopener">${ic('bag')}Cek di Gramedia.com</a><a class="btn ghost sm" href="${authorHref(b.author)}">${ic('edit')}Karya lain ${esc(String(b.author).split(/\s*&\s*/)[0])}</a></div>
        <div class="facts"><span>${ic('bookmark')}${st.want} ingin membaca</span><span>${ic('book')}${st.reading} sedang membaca</span><span>${ic('eye')}${st.readers} sudah membaca</span></div>
        ${myEntries.length ? `<div class="my-log"><span class="label">Catatanmu</span>${myEntries.map((e) => `<a href="#/ulasan/${e.id}" class="my-log-item">${ic(e.is_reread ? 'repeat' : 'calendar')}${fmtDate(e.read_date)} ${e.rating ? `<span class="stars">${starsText(e.rating)}</span>` : ''}${e.review ? '<span class="muted xs">· ada ulasan</span>' : ''}</a>`).join('')}</div>` : ''}
       </div>
       <div class="book-more">
        ${listings.length ? `<section>${secHead(`Tersedia preloved <span class="count">${listings.length}</span>`, `<a class="more" href="#/jual?book=${encodeURIComponent(b.id)}">Jual punyamu →</a>`, 'bag')}<div class="listing-mini row">${listings.slice(0, 4).map((l) => window.RB.listingMini(l)).join('')}</div></section>` : ''}
        ${friends.length ? `<section>${secHead('Aktivitas teman', '', 'users')}<div class="friends">${friends.map(({ f, s }) => `<div class="friend">${avatar(f, 'md')}<span class="stars xs">${starsText(s.rating) || '&nbsp;'}</span><span class="friend-st">${s.liked ? ic('heart', 'heart-on') : ''}${s.status ? `<i class="st-${s.status}">${statusLabel[s.status]}</i>` : ''}</span></div>`).join('')}</div></section>` : ''}
        <section>${secHead(`Ulasan ${reviews.length ? `<span class="count">${reviews.length}</span>` : ''}`, `<button class="more" data-action="open-log" data-book="${bid}">Tulis ulasan →</button>`, 'message')}
          ${reviews.length ? `<div class="reviews">${reviews.map((r) => reviewCard(r.e, { showBook: false })).join('')}</div>` : empty('Belum ada ulasan untuk buku ini. Semua ulasan di ruangbaca ditulis pembaca asli — jadilah yang pertama!', '', '', 'message', `<button class="btn primary sm" data-action="open-log" data-book="${bid}">${ic('edit')}Tulis ulasan</button>`)}
        </section>
        ${inLists.length ? `<section>${secHead('Ada di daftar', '', 'list')}<div class="lists-grid">${inLists.slice(0, 4).map(listCard).join('')}</div></section>` : ''}
        ${similar.length ? `<section>${secHead('Mungkin kamu juga suka', '', 'sparkle')}<div class="grid books six">${similar.map((x) => tile(x, { sub: tileTitle(x) })).join('')}</div></section>` : ''}
       </div>
      </div>
      <aside class="book-side">
        <div class="action-panel">
        ${u ? `
          <div class="ap-row">
            <button class="ap-btn ${sh?.status === 'read' ? 'on read' : ''}" data-action="toggle-read" data-book="${bid}">${ic('check')}<span>${sh?.status === 'read' ? 'Dibaca' : 'Dibaca?'}</span></button>
            <button class="ap-btn ${sh?.status === 'reading' ? 'on reading' : ''}" data-action="toggle-reading" data-book="${bid}">${ic('book')}<span>Sedang</span></button>
            <button class="ap-btn ${sh?.liked ? 'on like' : ''}" data-action="toggle-like" data-book="${bid}">${ic('heart')}<span>Suka</span></button>
            <button class="ap-btn ${sh?.status === 'want' ? 'on want' : ''}" data-action="toggle-want" data-book="${bid}">${ic('bookmark')}<span>Ingin</span></button>
          </div>
          <div class="ap-rate"><span class="label">${sh?.rating ? 'Rating kamu' : 'Beri rating'}</span>${starInput(sh?.rating || 0, b.id)}</div>
          ${sh?.status === 'reading' ? `<div class="ap-progress">${progressCard(sh)}</div>` : ''}
          <button class="ap-link" data-action="open-log" data-book="${bid}">${ic('edit')}Catat atau ulas…</button>
          <button class="ap-link" data-action="add-to-list" data-book="${bid}">${ic('list')}Tambah ke daftar…</button>
          <a class="ap-link" href="#/jual?book=${encodeURIComponent(b.id)}">${ic('tag')}Jual buku ini (preloved)</a>
          <button class="ap-link" data-action="share" data-book="${bid}">${ic('link')}Salin tautan</button>`
        : `<div class="ap-guest"><p>Masuk untuk mencatat, menilai, atau menyimpan buku ini ke rakmu.</p><button class="btn primary full" data-action="open-auth" data-tab="login">Masuk</button><button class="btn ghost full" data-action="open-auth" data-tab="register">Buat akun baru</button></div>`}
        </div>
        <div class="card ratings-card">
          <div class="rc-head"><span class="label">Rating komunitas</span><span class="muted xs">${st.count} penilaian</span></div>
          ${st.count ? `<div class="histo-wrap"><span class="stars xs">★</span>
            <div class="histo">${st.hist.map((h, i) => `<span class="bar" style="--h:${(h / maxH).toFixed(2)}" title="${h} × ${starsText((i + 1) / 2)}"></span>`).join('')}</div>
            <span class="stars xs">★★★★★</span><b class="avg">${st.avg.toFixed(1)}</b></div>` : '<p class="muted sm no-rate">Belum ada rating. Jadilah yang pertama menilai!</p>'}
        </div>
      </aside>
    </section>`;
  }

  /* ===================== ulasan ===================== */
  function viewReview([id]) {
    const e = S.get('diary_entries', id);
    if (!e) return viewNotFound();
    const u = getUser(e.user_id), b = getBook(e.book_id), m = me();
    if (!u || !b) return viewNotFound();
    const own = m && m.id === u.id;
    setTitle(`Ulasan ${b.title} oleh ${u.name}`);
    const comments = commentsOf(e.id);
    const likes = reviewLikes(e.id);
    const liked = m && likes.some((l) => l.user_id === m.id);
    onMount(() => {
      const f = $('#commentForm');
      if (f) f.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const body = f.body.value.trim();
        if (!body) return;
        S.insert('comments', { user_id: m.id, entry_id: e.id, body });
        notify(e.user_id, 'comment', e.id);
        toast('Komentar terkirim');
        refresh();
      });
    });
    return `
    <div class="book-backdrop" style="${coverVars(b).style}"></div>
    <section class="wrap review-page">
      <div class="rp-cover">${cover(b, { size: 'lg' })}</div>
      <div class="rp-main">
        <div class="review-meta lg">${avatar(u, 'sm')}<span>Ulasan oleh <a href="#/u/${esc(u.username)}" class="by">${esc(u.name)}</a></span></div>
        <h1 class="book-title sm"><a href="#/buku/${encodeURIComponent(b.id)}">${esc(b.title)}</a> <span class="year">${b.year || ''}</span></h1>
        <p class="rp-line">${e.rating ? `<span class="stars lg">${starsText(e.rating)}</span>` : ''}${e.liked ? `<span class="heart-on">${ic('heart')}</span>` : ''}<span class="muted sm">${e.is_reread ? 'Dibaca ulang' : 'Dibaca'} ${fmtDate(e.read_date)}</span></p>
        ${e.review ? `<div class="review-text big ${e.contains_spoiler ? 'spoiler' : ''}">${e.contains_spoiler ? '<button class="spoiler-cover" data-action="reveal">Ulasan ini mengandung spoiler — <u>tampilkan</u></button>' : ''}<div class="rt">${paras(e.review)}</div></div>` : '<p class="muted">Tidak ada ulasan tertulis untuk catatan ini.</p>'}
        <div class="review-actions">
          <button class="ra ${liked ? 'on' : ''}" data-action="like-review" data-entry="${e.id}">${ic('heart')}<span>${likes.length ? num(likes.length) + ' ' : ''}Suka</span></button>
          <button class="ra" data-action="copy-link" data-href="#/ulasan/${e.id}">${ic('link')}<span>Salin tautan</span></button>
          ${own ? `<button class="ra" data-action="edit-entry" data-entry="${e.id}">${ic('edit')}<span>Ubah</span></button>` : ''}
          ${own || m?.is_admin ? `<button class="ra danger" data-action="delete-entry" data-entry="${e.id}">${ic('trash')}<span>Hapus</span></button>` : ''}
        </div>
        ${likes.length ? `<div class="likers"><span class="muted xs">Disukai oleh</span>${likes.slice(0, 10).map((l) => avatar(getUser(l.user_id), 'xs')).join('')}</div>` : ''}
        <section class="comments">${secHead(`Komentar <span class="count">${comments.length}</span>`, '', 'message')}
          ${comments.map((c) => { const cu = getUser(c.user_id); if (!cu) return ''; return `<div class="comment">${avatar(cu, 'sm')}<div class="c-body"><p><a href="#/u/${esc(cu.username)}" class="by">${esc(cu.name)}</a> <span class="muted xs">${timeAgo(c.created_at)}</span></p><div>${paras(c.body)}</div></div>${m && (m.id === c.user_id || own || m.is_admin) ? `<button class="icon-btn sm" data-action="delete-comment" data-id="${c.id}" title="Hapus komentar">${ic('trash')}</button>` : ''}</div>`; }).join('') || '<p class="muted sm">Belum ada komentar.</p>'}
          ${m ? `<form id="commentForm" class="comment-form">${avatar(m, 'sm', false)}<textarea name="body" class="input" rows="2" maxlength="1000" placeholder="Tulis komentar…"></textarea><button class="btn primary sm">${ic('send')}Kirim</button></form>` : `<p class="muted sm"><button class="link-btn" data-action="open-auth" data-tab="login">Masuk</button> untuk ikut berkomentar.</p>`}
        </section>
      </div>
    </section>`;
  }

  /* ===================== profil ===================== */
  function viewProfile([username, tab = 'ringkasan'], q) {
    const p = userByName(username);
    if (!p) return viewNotFound();
    const m = me(), own = m && m.id === p.id;
    setTitle(`${p.name} (@${p.username})`);
    const year = new Date().getFullYear();
    const reads = S.where('user_books', (r) => r.user_id === p.id && r.status === 'read').length;
    const thisYear = yearEntries(p.id, year).length;
    const lists = S.where('lists', (l) => l.user_id === p.id);
    const following = followingIds(p.id), followers = followerIds(p.id);
    const shop = S.where('listings', (l) => l.seller_id === p.id && l.status !== 'sold').length;
    const tabs = [['ringkasan', 'Ringkasan'], ['diary', 'Diary'], ['ulasan', 'Ulasan'], ['rak', 'Rak'], ['daftar', 'Daftar'], ['lapak', 'Lapak'], ['suka', 'Disukai'], ['statistik', 'Statistik'], ['jaringan', 'Jaringan']];
    const body = {
      ringkasan: () => profOverview(p, own), diary: () => profDiary(p, own), ulasan: () => profReviews(p),
      rak: () => profShelf(p, q.s || 'read'), daftar: () => profLists(p, own), lapak: () => window.RB.profShop(p, own),
      suka: () => profLikes(p), statistik: () => profStats(p, Number(q.y) || year), jaringan: () => profNetwork(p),
    }[tab] || (() => profOverview(p, own));
    const joined = new Date(p.created_at);
    return `
    <section class="profile-head" style="--av:${esc(p.avatar_color || '#7fa9b0')}">
      <div class="wrap ph-inner lib-card">
        <span class="lib-tag" aria-hidden="true">Kartu Anggota ruangbaca <i>No. ${String(p.id).replace(/[^0-9a-z]/gi, '').slice(-6).toUpperCase().padStart(6, '0')}</i></span>
        <span class="lib-stamp" aria-hidden="true">${joined.getFullYear()}</span>
        ${avatar(p, 'xl', false)}
        <div class="ph-info">
          <h1 class="display sm">${esc(p.name)}</h1>
          <p class="muted">@${esc(p.username)}${p.location ? ` · ${ic('pin')}${esc(p.location)}` : ''} · Bergabung ${MONTHS[joined.getMonth()]} ${joined.getFullYear()}${p.provider === 'google' ? ' · <span class="g-badge">' + GOOGLE + 'Google</span>' : ''}</p>
          ${p.bio ? `<p class="ph-bio">${esc(p.bio)}</p>` : ''}
          ${p.website ? `<p class="ph-web">${ic('link')}<a href="${esc(/^https?:/.test(p.website) ? p.website : 'https://' + p.website)}" target="_blank" rel="noopener nofollow">${esc(p.website.replace(/^https?:\/\//, ''))}</a></p>` : ''}
          <div class="ph-actions">${own ? `<a href="#/pengaturan" class="btn ghost sm">${ic('edit')}Edit profil</a><a href="#/wrap" class="btn primary sm">${ic('gift')}Reading Wrap</a>` : `${followBtn(p)}${m && isFollowing(p.id, m.id) ? '<span class="follows-you">Mengikutimu</span>' : ''}`}</div>
        </div>
        <div class="ph-stats">
          <a href="#/u/${esc(p.username)}/rak"><b>${reads}</b><span>Buku</span></a>
          <a href="#/u/${esc(p.username)}/diary"><b>${thisYear}</b><span>Tahun ini</span></a>
          <a href="#/u/${esc(p.username)}/lapak"><b>${shop}</b><span>Lapak</span></a>
          <a href="#/u/${esc(p.username)}/jaringan"><b>${following.length}</b><span>Mengikuti</span></a>
          <a href="#/u/${esc(p.username)}/jaringan"><b>${followers.length}</b><span>Pengikut</span></a>
        </div>
      </div>
      <nav class="wrap tabs">${tabs.map(([k, l]) => `<a href="#/u/${esc(p.username)}/${k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</nav>
    </section>
    <div class="wrap profile-body">${body()}</div>`;
  }
  function profOverview(p, own) {
    const favs = favoritesOf(p.id);
    const slots = [1, 2, 3, 4].map((pos) => {
      const f = favs.find((x) => x.position === pos);
      if (f && getBook(f.book_id)) return `<div class="fav">${cover(getBook(f.book_id))}${own ? `<button class="fav-x" data-action="remove-favorite" data-pos="${pos}" title="Hapus dari favorit">${ic('x')}</button>` : ''}</div>`;
      return own ? `<button class="fav empty-slot" data-action="pick-favorite" data-pos="${pos}">${ic('plus')}<span>Pilih favorit</span></button>` : '<div class="fav empty-slot ghost"></div>';
    }).join('');
    const recent = entriesOf(p.id).slice(0, 8);
    const reviews = entriesOf(p.id).filter((e) => e.review).slice(0, 3);
    const reading = S.where('user_books', (r) => r.user_id === p.id && r.status === 'reading');
    return `<div class="layout">
      <div class="main-col">
        <section>${secHead('Buku favorit', '', 'heart')}<div class="favs">${slots}</div></section>
        <section>${secHead('Baru saja dibaca', `<a class="more" href="#/u/${esc(p.username)}/diary">Diary →</a>`, 'calendar')}
          ${recent.length ? `<div class="grid books eight">${recent.map((e) => tile(getBook(e.book_id), { rating: e.rating, sub: e.liked ? `<span class="heart-on">${ic('heart')}</span>` : '' })).join('')}</div>` : empty(own ? 'Belum ada catatan. Catat buku pertama yang kamu selesaikan!' : 'Belum ada catatan bacaan.', '', '', 'calendar', own ? `<button class="btn primary sm" data-action="open-log">${ic('plus')}Catat bacaan</button>` : '')}</section>
        <section>${secHead('Ulasan terbaru', `<a class="more" href="#/u/${esc(p.username)}/ulasan">Semua →</a>`, 'message')}
          ${reviews.length ? `<div class="reviews">${reviews.map((e) => reviewCard(e)).join('')}</div>` : empty('Belum menulis ulasan.', '', '', 'message')}</section>
      </div>
      <aside class="side-col">
        ${goalWidget(p)}
        ${reading.length ? `<div class="card">${secHead('Sedang dibaca', '', 'book')}${reading.map((r) => { const b = getBook(r.book_id); if (!b) return ''; const pct = Math.min(100, Math.round(((r.progress || 0) / (pagesOf(b) || 300)) * 100)); return `<a href="#/buku/${encodeURIComponent(b.id)}" class="mini-review">${cover(b, { size: 'xs', link: false })}<span><b>${esc(b.title)}</b><small>${esc(b.author)}</small><span class="pbar sm"><span style="width:${pct}%"></span></span><small>${pct}% selesai</small></span></a>`; }).join('')}</div>` : ''}
      </aside></div>`;
  }
  function profDiary(p, own) {
    const entries = entriesOf(p.id);
    if (!entries.length) return empty(own ? 'Diary-mu masih kosong. Catat buku pertama yang kamu selesaikan!' : 'Diary masih kosong.', '', '', 'calendar', own ? `<button class="btn primary sm" data-action="open-log">${ic('plus')}Catat bacaan</button>` : '');
    let lastKey = '';
    const rows = entries.map((e) => {
      const b = getBook(e.book_id); if (!b) return '';
      const d = parseDay(e.read_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const showMonth = key !== lastKey; lastKey = key;
      return `<tr class="${showMonth ? 'month-start' : ''}">
        <td class="d-month">${showMonth ? `<span class="cal"><b>${MON[d.getMonth()]}</b><small>${d.getFullYear()}</small></span>` : ''}</td>
        <td class="d-day">${d.getDate()}</td>
        <td class="d-book"><div>${cover(b, { size: 'xs' })}<span><a href="#/buku/${encodeURIComponent(b.id)}">${esc(b.title)}</a><small class="muted">${esc(b.author)}</small></span></div></td>
        <td class="d-rating"><span class="stars">${starsText(e.rating)}</span></td>
        <td class="d-ic">${e.liked ? `<span class="heart-on">${ic('heart')}</span>` : ''}</td>
        <td class="d-ic hide-sm">${e.is_reread ? ic('repeat') : ''}</td>
        <td class="d-ic">${e.review ? `<a href="#/ulasan/${e.id}" title="Baca ulasan">${ic('message')}</a>` : ''}</td>
        ${own ? `<td class="d-ic"><button class="icon-btn sm" data-action="edit-entry" data-entry="${e.id}" title="Ubah">${ic('edit')}</button></td>` : ''}
      </tr>`;
    }).join('');
    return `<div class="card flush diary-wrap"><table class="diary"><thead><tr><th>Bulan</th><th>Hari</th><th>Buku</th><th>Rating</th><th>Suka</th><th class="hide-sm">Ulang</th><th>Ulasan</th>${own ? '<th></th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function profReviews(p) {
    const r = entriesOf(p.id).filter((e) => e.review);
    return r.length ? `<div class="reviews narrow">${r.map((e) => reviewCard(e)).join('')}</div>` : empty('Belum ada ulasan.', '', '', 'message');
  }
  function profShelf(p, s) {
    const labels = { read: 'Sudah dibaca', reading: 'Sedang dibaca', want: 'Ingin dibaca' };
    const rows = S.where('user_books', (r) => r.user_id === p.id && r.status === s && getBook(r.book_id)).sort((a, b) => ts(b.updated_at) - ts(a.updated_at));
    const counts = Object.fromEntries(Object.keys(labels).map((k) => [k, S.where('user_books', (r) => r.user_id === p.id && r.status === k).length]));
    return `<div class="chips">${Object.entries(labels).map(([k, l]) => `<a class="chip st-${k} ${k === s ? 'on' : ''}" href="#/u/${esc(p.username)}/rak?s=${k}">${l} <b>${counts[k]}</b></a>`).join('')}</div>
      ${rows.length ? `<div class="grid books">${rows.map((r) => {
        const b = getBook(r.book_id);
        const sub = s === 'reading' ? `<span class="pbar sm"><span style="width:${Math.min(100, Math.round(((r.progress || 0) / (pagesOf(b) || 300)) * 100))}%"></span></span>` : (r.liked ? `<span class="heart-on">${ic('heart')}</span>` : '');
        return tile(b, { rating: s === 'read' ? r.rating : null, sub });
      }).join('')}</div>` : empty(`Rak “${labels[s]}” masih kosong.`, '#/jelajah', 'Jelajahi buku', 'bookmark')}`;
  }
  function profLists(p, own) {
    const lists = S.where('lists', (l) => l.user_id === p.id).sort(byCreatedDesc);
    return `${own ? `<div class="row-end"><button class="btn primary sm" data-action="open-list-create">${ic('plus')}Daftar baru</button></div>` : ''}
      ${lists.length ? `<div class="lists-grid">${lists.map(listCard).join('')}</div>` : empty('Belum membuat daftar.', '', '', 'list')}`;
  }
  function profLikes(p) {
    const liked = S.where('user_books', (r) => r.user_id === p.id && r.liked && getBook(r.book_id)).sort((a, b) => ts(b.updated_at) - ts(a.updated_at));
    const likedLists = S.where('list_likes', (l) => l.user_id === p.id).map((l) => S.get('lists', l.list_id)).filter(Boolean);
    return `<section>${secHead(`Buku yang disukai <span class="count">${liked.length}</span>`, '', 'heart')}
      ${liked.length ? `<div class="grid books">${liked.map((r) => tile(getBook(r.book_id), { rating: r.rating })).join('')}</div>` : empty('Belum menyukai buku apa pun.', '', '', 'heart')}</section>
      ${likedLists.length ? `<section>${secHead(`Daftar yang disukai <span class="count">${likedLists.length}</span>`, '', 'list')}<div class="lists-grid">${likedLists.map(listCard).join('')}</div></section>` : ''}`;
  }
  function profStats(p, year) {
    const all = entriesOf(p.id);
    const years = [...new Set([new Date().getFullYear(), ...all.map((e) => Number(e.read_date.slice(0, 4)))])].sort((a, b) => b - a);
    const st = window.RB.periodStats(p.id, year, null);
    const own = me() && me().id === p.id;
    const maxM = Math.max(1, ...st.months);
    const gmax = Math.max(1, ...st.genres.map((g) => g[1]));
    const hmax = Math.max(1, ...st.hist);
    return `<div class="stats-head"><h2 class="display xs">Tahun bacaan ${year}</h2><div class="chips">${years.map((y) => `<a class="chip ${y === year ? 'on' : ''}" href="#/u/${esc(p.username)}/statistik?y=${y}">${y}</a>`).join('')}${own ? `<a class="chip accent" href="#/wrap">${ic('gift')}Buka Wrap</a>` : ''}</div></div>
    ${st.count ? `
    <div class="stat-cards">
      <div class="stat c-read"><b>${st.count}</b><span>buku selesai</span></div>
      <div class="stat c-reading"><b>${num(st.pages)}</b><span>halaman dibaca</span></div>
      <div class="stat c-star"><b>${st.avg ? st.avg.toFixed(2) : '–'}</b><span>rata-rata rating</span></div>
      <div class="stat c-like"><b>${st.reviews}</b><span>ulasan ditulis</span></div>
    </div>
    <div class="stats-grid">
      <div class="card"><h3 class="sec-title sm">${ic('chart')}Buku per bulan</h3><div class="mbars">${st.months.map((m, i) => `<div class="mbar"><span class="mv" style="--h:${(m / maxM).toFixed(2)}">${m || ''}</span><small>${MON[i]}</small></div>`).join('')}</div></div>
      <div class="card"><h3 class="sec-title sm">${ic('compass')}Genre favorit</h3><div class="hbars">${st.genres.slice(0, 6).map(([g, n]) => `<div class="hbar"><span class="hb-label">${esc(g)}</span><span class="hb-track"><span style="width:${(n / gmax) * 100}%"></span></span><b>${Math.round(n)}</b></div>`).join('')}</div></div>
      <div class="card"><h3 class="sec-title sm">${ic('sparkle')}Sebaran rating</h3><div class="histo-wrap big"><span class="stars xs">★</span><div class="histo">${st.hist.map((h, i) => `<span class="bar" style="--h:${(h / hmax).toFixed(2)}" title="${h} × ${starsText((i + 1) / 2)}"></span>`).join('')}</div><span class="stars xs">★★★★★</span></div></div>
      <div class="card fun"><h3 class="sec-title sm">${ic('award')}Sorotan</h3>
        ${st.authors[0] ? `<p>Penulis favorit: <b>${esc(st.authors[0][0])}</b> <span class="muted">(${st.authors[0][1]} buku)</span></p>` : ''}
        ${st.longest ? `<p>Buku paling tebal: <a href="#/buku/${encodeURIComponent(st.longest.id)}">${esc(st.longest.title)}</a> <span class="muted">(${num(pagesOf(st.longest))} hal.)</span></p>` : ''}
        ${st.top ? `<p>Rating tertinggimu: <a href="#/buku/${encodeURIComponent(st.top.b.id)}">${esc(st.top.b.title)}</a> <span class="stars">${starsText(st.top.r)}</span></p>` : ''}
        <p>Setara kira-kira <b>${st.hours}</b> jam membaca <span class="muted">(±40 hal./jam)</span>.</p>
      </div>
    </div>` : empty(`Belum ada buku yang dicatat pada ${year}.`, '', '', 'chart')}`;
  }
  function profNetwork(p) {
    const fo = followingIds(p.id).map(getUser).filter(Boolean);
    const fr = followerIds(p.id).map(getUser).filter(Boolean);
    return `<div class="two-col">
      <div class="card">${secHead(`Mengikuti <span class="count">${fo.length}</span>`, '', 'users')}${fo.map(userRow).join('') || '<p class="muted sm">Belum mengikuti siapa pun.</p>'}</div>
      <div class="card">${secHead(`Pengikut <span class="count">${fr.length}</span>`, '', 'users')}${fr.map(userRow).join('') || '<p class="muted sm">Belum ada pengikut.</p>'}</div></div>`;
  }

  /* ===================== daftar ===================== */
  function viewLists(_, q) {
    setTitle('Daftar');
    const tab = q.t || 'populer';
    let lists = S.table('lists').slice();
    if (tab === 'populer') lists.sort((a, b) => listLikes(b.id).length - listLikes(a.id).length || byCreatedDesc(a, b));
    else if (tab === 'milikku' && me()) lists = lists.filter((l) => l.user_id === me().id).sort(byCreatedDesc);
    else lists.sort(byCreatedDesc);
    return `<section class="wrap page-head row-between"><div><p class="eyebrow">${ic('list')} Daftar</p><h1 class="display sm">Kumpulan buku, dikurasi pembaca</h1><p class="muted">Dari “wajib baca” hingga “teman hujan” — temukan atau buat daftarmu sendiri.</p></div>
      <button class="btn primary" data-action="open-list-create">${ic('plus')}Buat daftar</button></section>
      <div class="wrap chips">${[['populer', 'Populer'], ['terbaru', 'Terbaru'], ...(me() ? [['milikku', 'Milikku']] : [])].map(([k, l]) => `<a class="chip ${k === tab ? 'on' : ''}" href="#/daftar?t=${k}">${l}</a>`).join('')}</div>
      <section class="wrap">${lists.length ? `<div class="lists-grid">${lists.map(listCard).join('')}</div>` : empty('Belum ada daftar. Buat daftar pertamamu — misalnya “Novel untuk dibaca di kereta”.', '', '', 'list', '<button class="btn primary sm" data-action="open-list-create">Buat daftar</button>')}</section>`;
  }
  function viewList([id]) {
    const l = S.get('lists', id);
    if (!l) return viewNotFound();
    const u = getUser(l.user_id), m = me(), own = m && u && m.id === u.id;
    setTitle(l.title);
    const items = listItems(l.id);
    const likes = listLikes(l.id);
    const liked = m && likes.some((x) => x.user_id === m.id);
    if (own) onMount(() => bindBookSearch($('#listAdd'), $('#listAddResults'), async (bid) => {
      if (listItems(l.id).some((i) => i.book_id === bid)) { toast('Buku sudah ada di daftar', 'muted'); return; }
      await ensureBook(bid);
      S.insert('list_items', { list_id: l.id, book_id: bid, position: listItems(l.id).length + 1 });
      toast(`Ditambahkan: <b>${esc(getBook(bid).title)}</b>`);
      refresh();
      setTimeout(() => $('#listAdd')?.focus(), 0);
    }));
    return `<section class="wrap list-head">
      <div class="lh-by">${avatar(u, 'sm')}<span>Daftar oleh <a href="#/u/${esc(u?.username)}" class="by">${esc(u?.name)}</a> · ${fmtDate(l.created_at)}</span></div>
      <h1 class="display sm">${esc(l.title)}</h1>
      ${l.description ? `<p class="lh-desc">${esc(l.description)}</p>` : ''}
      <div class="lh-actions">
        <button class="btn ${liked ? 'like-on' : 'ghost'} sm" data-action="like-list" data-list="${l.id}">${ic('heart')}<span>${likes.length} Suka</span></button>
        <button class="btn ghost sm" data-action="copy-link" data-href="#/daftar/${l.id}">${ic('link')}<span>Salin tautan</span></button>
        ${own ? `<button class="btn ghost sm" data-action="edit-list" data-list="${l.id}">${ic('edit')}<span>Ubah</span></button>` : ''}
        ${own || m?.is_admin ? `<button class="btn ghost sm danger" data-action="delete-list" data-list="${l.id}">${ic('trash')}<span>Hapus</span></button>` : ''}
        <span class="muted sm">${items.length} buku${l.is_ranked ? ' · berperingkat' : ''}</span>
      </div>
      ${own ? `<div class="list-add"><div class="search-field">${ic('search')}<input id="listAdd" class="input" placeholder="Tambah buku ke daftar ini (judul/penulis)…" autocomplete="off"></div><div id="listAddResults" class="pick-pop"></div></div>` : ''}
    </section>
    <section class="wrap">${items.length ? `<div class="grid books list-grid">${items.map((it, i) => {
      const b = getBook(it.book_id); if (!b) return '';
      const ctrl = own ? `<div class="item-ctrl"><button data-action="list-move" data-item="${it.id}" data-dir="-1" title="Naik" ${i === 0 ? 'disabled' : ''}>${ic('up')}</button><button data-action="list-move" data-item="${it.id}" data-dir="1" title="Turun" ${i === items.length - 1 ? 'disabled' : ''}>${ic('down')}</button><button data-action="list-remove" data-item="${it.id}" title="Hapus">${ic('x')}</button></div>` : '';
      return tile(b, { rank: l.is_ranked ? i + 1 : null, extra: ctrl, sub: tileTitle(b) });
    }).join('')}</div>` : empty(own ? 'Daftar ini masih kosong. Gunakan kolom di atas untuk menambahkan buku dari mana saja.' : 'Daftar ini masih kosong.', '', '', 'list')}</section>`;
  }

  /* ===================== anggota ===================== */
  function viewMembers(_, q) {
    setTitle('Anggota');
    const query = q.q || '', sort = q.sort || 'populer';
    let list = query ? searchUsers(query) : S.table('profiles').slice();
    const activity = (u) => S.where('diary_entries', (e) => e.user_id === u.id).length;
    if (sort === 'baru') list.sort(byCreatedDesc);
    else if (sort === 'aktif') list.sort((a, b) => activity(b) - activity(a));
    else list.sort((a, b) => followerIds(b.id).length - followerIds(a.id).length || activity(b) - activity(a));
    onMount(() => $('#memberForm').addEventListener('submit', (e) => { e.preventDefault(); go('#/anggota?q=' + encodeURIComponent(e.target.q.value.trim())); }));
    return `<section class="wrap page-head"><p class="eyebrow">${ic('users')} Anggota</p><h1 class="display sm">Pembaca di ruangbaca</h1><p class="muted">${num(S.table('profiles').length)} pembaca asli. Ikuti mereka untuk melihat bacaan dan ulasannya di berandamu.</p>
      <form id="memberForm" class="explore-search narrow">${ic('search')}<input name="q" class="input" value="${esc(query)}" placeholder="Cari nama atau username…"></form></section>
    <div class="wrap chips">${[['populer', 'Paling diikuti'], ['aktif', 'Paling aktif'], ['baru', 'Baru bergabung']].map(([k, l]) => `<a class="chip ${k === sort ? 'on' : ''}" href="#/anggota?sort=${k}${query ? '&q=' + encodeURIComponent(query) : ''}">${l}</a>`).join('')}</div>
    <section class="wrap members">${list.map((u) => {
      const favs = favoritesOf(u.id).map((f) => getBook(f.book_id));
      const reads = S.where('user_books', (r) => r.user_id === u.id && r.status === 'read').length;
      const revs = S.where('diary_entries', (e) => e.user_id === u.id && e.review).length;
      return `<div class="member card" style="--av:${esc(u.avatar_color || '#7fa9b0')}">
        <div class="m-top">${avatar(u, 'lg')}<div><a href="#/u/${esc(u.username)}" class="m-name">${esc(u.name)}</a><span class="muted sm">@${esc(u.username)}</span></div></div>
        <p class="m-bio">${esc(u.bio || 'Belum menulis bio.')}</p>
        <div class="m-favs">${[0, 1, 2, 3].map((i) => (favs[i] ? cover(favs[i], { size: 'xs' }) : '<span class="cover ghost xs"></span>')).join('')}</div>
        <div class="m-foot"><span class="muted sm">${reads} buku · ${revs} ulasan · ${followerIds(u.id).length} pengikut</span>${followBtn(u)}</div></div>`;
    }).join('') || empty(query ? 'Tidak ada anggota yang cocok.' : 'Belum ada anggota. Ajak temanmu bergabung!', query ? '#/anggota' : '', 'Lihat semua', 'users')}</section>`;
  }

  /* ===================== notifikasi ===================== */
  function viewNotifs() {
    const m = me();
    if (!m) { onMount(() => openAuth('login')); return empty('Masuk untuk melihat notifikasi.', '', '', 'bell'); }
    setTitle('Notifikasi');
    const list = S.where('notifications', (n) => n.user_id === m.id).sort(byCreatedDesc);
    const html = list.map((n) => {
      const a = getUser(n.actor_id);
      if (!a) return '';
      let text = '', href = `#/u/${esc(a.username)}`, icon = 'user', cls = 'follow';
      const entry = n.ref_id ? S.get('diary_entries', n.ref_id) : null;
      const bt = entry && getBook(entry.book_id) ? esc(getBook(entry.book_id).title) : 'sebuah buku';
      const listing = n.ref_id ? S.get('listings', n.ref_id) : null;
      const lt = listing && getBook(listing.book_id) ? esc(getBook(listing.book_id).title) : 'buku';
      if (n.type === 'follow') { text = 'mulai mengikutimu'; icon = 'users'; }
      if (n.type === 'like_review') { text = `menyukai ulasanmu tentang <b>${bt}</b>`; href = `#/ulasan/${n.ref_id}`; icon = 'heart'; cls = 'like'; }
      if (n.type === 'comment') { text = `mengomentari ulasanmu tentang <b>${bt}</b>`; href = `#/ulasan/${n.ref_id}`; icon = 'message'; cls = 'comment'; }
      if (n.type === 'like_list') { const l = S.get('lists', n.ref_id); text = `menyukai daftarmu <b>${esc(l?.title || '')}</b>`; href = `#/daftar/${n.ref_id}`; icon = 'list'; cls = 'like'; }
      if (n.type === 'message') { text = `mengirim pesan tentang <b>${lt}</b>`; href = `#/pesan/${n.ref_id}/${a.id}`; icon = 'chat'; cls = 'comment'; }
      if (n.type === 'listing_saved') { text = `menyimpan lapakmu <b>${lt}</b>`; href = `#/preloved/${n.ref_id}`; icon = 'bag'; cls = 'like'; }
      return `<a href="${href}" class="notif ${n.is_read ? '' : 'unread'}">${avatar(a, 'md', false)}<span class="n-ic n-${cls}">${ic(icon)}</span><span class="n-text"><span><b>${esc(a.name)}</b> ${text}</span><small>${timeAgo(n.created_at)}</small></span></a>`;
    }).join('');
    onMount(() => {
      const unread = S.where('notifications', (n) => n.user_id === m.id && !n.is_read);
      if (unread.length) setTimeout(() => { unread.forEach((n) => S.update('notifications', n.id, { is_read: true })); renderHeader('notif'); }, 1200);
    });
    return `<section class="wrap page-head"><p class="eyebrow">${ic('bell')} Notifikasi</p><h1 class="display sm">Kabar untukmu</h1></section>
      <section class="wrap narrow-wrap">${list.length ? `<div class="card flush notifs">${html}</div>` : empty('Belum ada notifikasi. Tulis ulasan dan ikuti pembaca lain untuk mulai berinteraksi.', '#/anggota', 'Temukan anggota', 'bell')}</section>`;
  }

  /* ===================== pengaturan ===================== */
  function viewSettings() {
    const m = me();
    if (!m) { onMount(() => openAuth('login')); return empty('Masuk untuk membuka pengaturan.', '', '', 'settings'); }
    setTitle('Pengaturan');
    const year = new Date().getFullYear();
    const g = goalOf(m.id, year);
    const theme = document.documentElement.dataset.theme;
    onMount(() => {
      const f = $('#profileForm');
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = f.name.value.trim();
        if (name.length < 2) return toast('Nama minimal 2 karakter', 'err');
        if (f.username.value.trim().toLowerCase() !== m.username) {
          const r = S.changeUsername(f.username.value);
          if (r.error) return toast(r.error, 'err');
        }
        S.update('profiles', m.id, { name, bio: f.bio.value.trim().slice(0, 300), location: f.location.value.trim(), website: f.website.value.trim(), avatar_color: f.color.value });
        const target = Number(f.goal.value);
        if (target > 0) setGoal(m.id, year, target);
        FX.burstAt(f.querySelector('.btn.primary'), 'dot');
        toast('Profil diperbarui ✨');
        refresh();
      });
      f.addEventListener('input', (e) => { if (e.target.name === 'color') $('#avPreview').style.setProperty('--av', e.target.value); });
      $('#avatarFile').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          toast('Mengunggah foto…', 'muted');
          const url = await S.uploadImage(file, 'avatar');
          S.update('profiles', m.id, { avatar_url: url });
          toast('Foto profil diperbarui 📸'); refresh();
        } catch (err) { toast(esc(err.message), 'err'); }
      });
      $('#pwForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const pf = e.target;
        if (pf.pw.value !== pf.pw2.value) return toast('Konfirmasi kata sandi tidak cocok', 'err');
        const r = await S.changePassword(pf.old ? pf.old.value : '', pf.pw.value);
        if (r.error) return toast(esc(r.error), 'err');
        pf.reset(); toast('Kata sandi berhasil diganti 🔒');
      });
    });
    const email = S.myEmail();
    return `<section class="wrap page-head"><p class="eyebrow">${ic('settings')} Pengaturan</p><h1 class="display sm">Edit profil & akun</h1></section>
    <section class="wrap settings">
      <form id="profileForm" class="card form">
        <h2 class="sec-title">${ic('user')}Profil</h2>
        <div class="av-pick">
          <label class="av-upload" title="Ganti foto profil"><span id="avPreview" class="av av-xl" style="--av:${esc(m.avatar_color)}">${esc((m.name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase())}${m.avatar_url ? `<img src="${esc(m.avatar_url)}" alt="">` : ''}</span><span class="av-cam">${ic('camera')}</span><input type="file" id="avatarFile" accept="image/*" hidden></label>
          <div><span class="label">Warna avatar</span><div class="swatches">${S.AVATAR_COLORS.map((c) => `<label class="swatch" style="--c:${c}"><input type="radio" name="color" value="${c}" ${c === m.avatar_color ? 'checked' : ''}><span></span></label>`).join('')}</div>
          ${m.avatar_url ? `<button type="button" class="link-btn" data-action="remove-avatar">${ic('trash')}Hapus foto</button>` : '<p class="muted xs">Klik avatar untuk mengunggah foto.</p>'}</div></div>
        <div class="field-row">
          <label class="field"><span>Nama tampilan</span><input class="input" name="name" value="${esc(m.name)}" maxlength="80" required></label>
          <label class="field"><span>Username</span><input class="input" name="username" value="${esc(m.username)}" maxlength="20" pattern="[a-z0-9_.]{3,20}" required></label>
        </div>
        <label class="field"><span>Bio</span><textarea class="input" name="bio" rows="3" maxlength="300" placeholder="Ceritakan sedikit tentang selera bacaanmu…">${esc(m.bio || '')}</textarea></label>
        <div class="field-row">
          <label class="field"><span>Lokasi</span><input class="input" name="location" value="${esc(m.location || '')}" maxlength="80" placeholder="mis. Bandung"></label>
          <label class="field"><span>Situs / media sosial</span><input class="input" name="website" value="${esc(m.website || '')}" maxlength="120" placeholder="instagram.com/kamu"></label>
        </div>
        <label class="field"><span>Target membaca ${year}</span><input class="input" type="number" name="goal" min="1" max="999" value="${g ? g.target : 12}"></label>
        <button class="btn primary">Simpan perubahan</button>
      </form>
      <div class="settings-side">
        <div class="card form">
          <h2 class="sec-title">${ic('shield')}Akun</h2>
          <p class="sm">Masuk dengan: <b>${m.provider === 'google' ? GOOGLE + ' Google' : ic('mail') + ' Email'}</b></p>
          ${email ? `<p class="sm muted">Email: ${esc(email)}</p>` : ''}
          <p class="sm muted">Mode: ${S.online ? 'Online (Supabase) — data tersinkron ke semua perangkat.' : 'Demo — data hanya tersimpan di browser ini.'}</p>
        </div>
        <form id="pwForm" class="card form">
          <h2 class="sec-title">${ic('lock')}Kata sandi</h2>
          ${S.online ? '' : '<label class="field"><span>Kata sandi lama</span><input class="input" type="password" name="old" required autocomplete="current-password"></label>'}
          <label class="field"><span>Kata sandi baru</span><input class="input" type="password" name="pw" required minlength="6" autocomplete="new-password"></label>
          <label class="field"><span>Ulangi kata sandi baru</span><input class="input" type="password" name="pw2" required autocomplete="new-password"></label>
          <button class="btn ghost">Ganti kata sandi</button>
        </form>
        <div class="card form">
          <h2 class="sec-title">${ic(theme === 'dark' ? 'moon' : 'sun')}Tampilan</h2>
          <div class="theme-pick">
            <button class="theme-opt t-light ${theme !== 'dark' ? 'on' : ''}" data-action="set-theme" data-theme="light"><span></span>Linen<small>Terang, adem & netral</small></button>
            <button class="theme-opt t-dark ${theme === 'dark' ? 'on' : ''}" data-action="set-theme" data-theme="dark"><span></span>Senja<small>Gelap lembut untuk malam</small></button>
          </div>
        </div>
        <div class="card form">
          <h2 class="sec-title">${ic('download')}Data</h2>
          <button class="btn ghost" data-action="export">${ic('download')}Ekspor data (JSON)</button>
          ${S.online ? '' : `<button class="btn ghost danger" data-action="reset-db">${ic('trash')}Hapus semua data demo</button>`}
        </div>
      </div>
    </section>`;
  }

  /* ===================== admin ===================== */
  function viewAdmin() {
    const m = me();
    if (!m || !m.is_admin) return `<section class="wrap notfound">${ic('shield')}<h1 class="display sm">Khusus admin</h1><p class="muted">Halaman ini hanya untuk admin ruangbaca. Akun pertama yang mendaftar otomatis menjadi admin.</p><a href="#/" class="btn primary">Kembali</a></section>`;
    setTitle('Admin');
    const weekAgo = Date.now() - 7 * DAY;
    const P = S.table('profiles');
    const stats = [
      ['Pengguna', P.length, `+${P.filter((p) => ts(p.created_at) > weekAgo).length} minggu ini`, 'users'],
      ['Login Google', P.filter((p) => p.provider === 'google').length, `${P.filter((p) => p.provider !== 'google').length} via email`, 'globe'],
      ['Catatan & ulasan', S.table('diary_entries').length, `${S.where('diary_entries', (e) => e.review).length} ulasan`, 'message'],
      ['Lapak preloved', S.where('listings', (l) => l.status !== 'sold').length, `${S.where('listings', (l) => l.status === 'sold').length} terjual`, 'bag'],
      ['Buku di katalog', books().length, `${books().filter((b) => b.source !== 'katalog').length} diimpor pengguna`, 'book'],
      ['Pesan', S.table('messages').length, S.online ? 'yang bisa kamu lihat' : 'total', 'chat'],
    ];
    onMount(async () => {
      const el = $('#adminUsers');
      const r = await S.adminUsers();
      if (!document.contains(el)) return;
      if (r.error) { el.innerHTML = `<p class="form-err">Gagal memuat: ${esc(r.error)}. Pastikan fungsi <code>admin_list_users</code> sudah dibuat (supabase.sql).</p>`; return; }
      const byId = new Map(r.rows.map((x) => [x.id, x]));
      const rows = P.slice().sort(byCreatedDesc).map((p) => { const a = byId.get(p.id) || {}; return `<tr><td><div class="ad-user">${avatar(p, 'sm')}<span><b>${esc(p.name)}</b><small>@${esc(p.username)}${p.is_admin ? ' · admin' : ''}</small></span></div></td><td>${esc(a.email || '—')}</td><td>${(a.provider || p.provider) === 'google' ? GOOGLE + ' Google' : ic('mail') + ' Email'}</td><td>${fmtDate(p.created_at)}</td><td>${a.last_sign_in_at ? timeAgo(a.last_sign_in_at) : '—'}</td><td>${S.where('diary_entries', (e) => e.user_id === p.id).length}</td></tr>`; }).join('');
      el.innerHTML = `<div class="table-wrap"><table class="admin-table"><thead><tr><th>Pengguna</th><th>Email</th><th>Login via</th><th>Bergabung</th><th>Terakhir masuk</th><th>Catatan</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    });
    const recentRev = S.where('diary_entries', (e) => e.review).sort(byCreatedDesc).slice(0, 8);
    const recentList = S.table('listings').slice().sort(byCreatedDesc).slice(0, 8);
    return `<section class="wrap page-head"><p class="eyebrow">${ic('shield')} Admin</p><h1 class="display sm">Dasbor ruangbaca</h1>
      <p class="muted">Pantau siapa saja yang mendaftar (email maupun Google), aktivitas, dan moderasi konten.</p></section>
    <section class="wrap"><div class="admin-stats">${stats.map(([l, v, s, i]) => `<div class="stat-card">${ic(i)}<b>${num(v)}</b><span>${l}</span><small>${s}</small></div>`).join('')}</div></section>
    <section class="wrap">${secHead('Semua pengguna', '', 'users')}<div id="adminUsers" class="card flush"><p class="pad muted">Memuat…</p></div>
      <div class="info-box">${ic('info')}<div><b>Cara lain melihat pengguna:</b> buka <i>Supabase Dashboard → Authentication → Users</i>. Di sana terlihat email, metode login (email/Google), waktu daftar, dan terakhir masuk. Data profil ada di <i>Table Editor → profiles</i>.</div></div></section>
    <section class="wrap two-col">
      <div class="card">${secHead('Ulasan terbaru (moderasi)', '', 'message')}${recentRev.map((e) => { const u = getUser(e.user_id), b = getBook(e.book_id); return `<div class="mod-row"><span><b>${esc(u?.name)}</b> → ${esc(b?.title)}<small>${esc(e.review.slice(0, 90))}</small></span><button class="icon-btn sm" data-action="delete-entry" data-entry="${e.id}" title="Hapus">${ic('trash')}</button></div>`; }).join('') || '<p class="muted sm">Belum ada.</p>'}</div>
      <div class="card">${secHead('Lapak terbaru (moderasi)', '', 'bag')}${recentList.map((l) => { const u = getUser(l.seller_id), b = getBook(l.book_id); return `<div class="mod-row"><span><a href="#/preloved/${l.id}"><b>${esc(b?.title)}</b></a> · ${rupiah(l.price)}<small>${esc(u?.name)} · ${timeAgo(l.created_at)}</small></span><button class="icon-btn sm" data-action="delete-listing" data-id="${l.id}" title="Hapus">${ic('trash')}</button></div>`; }).join('') || '<p class="muted sm">Belum ada.</p>'}</div>
    </section>`;
  }

  function viewNotFound() {
    setTitle('Tidak ditemukan');
    return `<section class="wrap notfound"><p class="display">404</p><h1 class="display sm">Halaman ini seperti bab yang hilang.</h1><p class="muted">Mungkin sudah dihapus, atau tautannya keliru.</p><a href="#/" class="btn primary">Kembali ke beranda</a></section>`;
  }

  /* ===================== modal ===================== */
  let lastFocus = null;
  function openModal(html, { wide = false, cls = '', onOpen } = {}) {
    const root = $('#modalRoot');
    lastFocus = document.activeElement;
    root.innerHTML = `<div class="modal-backdrop" data-action="close-modal"></div><div class="modal ${wide ? 'wide' : ''} ${cls}" role="dialog" aria-modal="true"><button class="modal-x" data-action="close-modal" aria-label="Tutup">${ic('x')}</button>${html}</div>`;
    root.hidden = false;
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => root.classList.add('open'));
    hydrateCovers(root);
    if (onOpen) onOpen(root);
    const f = $('[autofocus]', root);
    if (f) setTimeout(() => f.focus(), 40);
  }
  function closeModal() {
    const root = $('#modalRoot');
    modalCleanup.splice(0).forEach((fn) => { try { fn(); } catch (e) { /* abaikan */ } });
    if (root.hidden) return;
    root.classList.remove('open');
    root.hidden = true;
    root.innerHTML = '';
    document.body.classList.remove('no-scroll');
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    if (dirty) refresh();
  }
  function confirmModal(title, msg, okLabel, onYes, danger = true) {
    openModal(`<div class="confirm"><h2 class="modal-title">${title}</h2><p class="muted">${msg}</p><div class="modal-actions"><button class="btn ghost" data-action="close-modal">Batal</button><button class="btn ${danger ? 'danger-solid' : 'primary'}" id="confirmYes">${okLabel}</button></div></div>`, {
      onOpen: (root) => $('#confirmYes', root).addEventListener('click', () => { closeModal(); onYes(); }),
    });
  }

  /* ---------- autentikasi ---------- */
  function openAuth(tab = 'login') {
    const pop = popularBooks().slice(0, 9);
    openModal(`<div class="auth">
      <div class="auth-side">
        <div class="auth-covers">${pop.map((b) => cover(b, { link: false })).join('')}</div>
        <div class="auth-quote"><span class="logo-mark">${ic('book')}</span><p>“Rumah untuk setiap halaman yang pernah kamu baca.”</p></div>
      </div>
      <div class="auth-main">
        <div class="seg"><button data-action="auth-tab" data-tab="login" class="${tab === 'login' ? 'on' : ''}">Masuk</button><button data-action="auth-tab" data-tab="register" class="${tab === 'register' ? 'on' : ''}">Daftar</button></div>
        <button class="btn google full" data-action="google-login">${GOOGLE}<span>Lanjutkan dengan Google</span></button>
        <div class="or"><span>atau dengan email</span></div>
        <form id="loginForm" class="form" ${tab === 'login' ? '' : 'hidden'} novalidate>
          <label class="field"><span>${S.online ? 'Email' : 'Email atau username'}</span><input class="input" name="identifier" autocomplete="username" ${tab === 'login' ? 'autofocus' : ''} required></label>
          <label class="field"><span>Kata sandi</span><span class="pw"><input class="input" type="password" name="password" autocomplete="current-password" required><button type="button" class="pw-toggle" data-action="pw-toggle" aria-label="Tampilkan kata sandi">${ic('eye')}</button></span></label>
          <p class="form-err" id="loginErr"></p>
          <button class="btn primary full">Masuk</button>
        </form>
        <form id="registerForm" class="form" ${tab === 'register' ? '' : 'hidden'} novalidate>
          <div class="field-row">
            <label class="field"><span>Nama</span><input class="input" name="name" maxlength="80" ${tab === 'register' ? 'autofocus' : ''} required placeholder="Nama kamu"></label>
            <label class="field"><span>Username</span><input class="input" name="username" maxlength="20" required placeholder="mis. dewi.baca"><small class="hint" id="unameHint"></small></label>
          </div>
          <label class="field"><span>Email</span><input class="input" type="email" name="email" autocomplete="email" required placeholder="kamu@email.com"></label>
          <div class="field-row">
            <label class="field"><span>Kata sandi</span><input class="input" type="password" name="password" minlength="6" required autocomplete="new-password"></label>
            <label class="field"><span>Ulangi</span><input class="input" type="password" name="password2" required autocomplete="new-password"></label>
          </div>
          <div class="pw-meter"><span id="pwMeter"></span></div>
          <p class="form-err" id="regErr"></p>
          <button class="btn primary full">Buat akun</button>
        </form>
        <p class="auth-note">${S.online ? `${ic('shield')} Akun aman dengan Supabase Auth.` : `${ic('info')} Mode demo: akun tersimpan di browser ini. Login Google aktif setelah dihubungkan ke Supabase.`}</p>
      </div></div>`, {
      wide: true,
      onOpen: (root) => {
        $('#loginForm', root).addEventListener('submit', async (e) => {
          e.preventDefault();
          const f = e.target;
          const btn = $('.btn.primary', f); btn.disabled = true;
          const r = await S.signIn({ identifier: f.identifier.value, password: f.password.value });
          btn.disabled = false;
          if (r.error) {
            $('#loginErr').textContent = r.error;
            f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
            return;
          }
          afterLogin(`Selamat datang kembali, ${esc(firstName(me()))}! 📚`);
        });
        const rf = $('#registerForm', root);
        rf.username.addEventListener('input', () => {
          const v = rf.username.value.trim().toLowerCase();
          const h = $('#unameHint');
          if (!v) { h.textContent = ''; h.className = 'hint'; return; }
          if (!S.USERNAME_RE.test(v)) { h.textContent = '3–20 karakter: huruf kecil, angka, _ atau .'; h.className = 'hint err'; return; }
          const taken = S.first('profiles', (x) => x.username === v);
          h.textContent = taken ? 'Username sudah dipakai' : 'Username tersedia ✓';
          h.className = 'hint ' + (taken ? 'err' : 'ok');
        });
        rf.password.addEventListener('input', () => {
          const v = rf.password.value;
          const score = [v.length >= 6, v.length >= 10, /[A-Z]/.test(v) && /[a-z]/.test(v), /\d/.test(v), /[^A-Za-z0-9]/.test(v)].filter(Boolean).length;
          const mtr = $('#pwMeter');
          mtr.style.width = `${(score / 5) * 100}%`;
          mtr.dataset.level = score <= 1 ? 'weak' : score <= 3 ? 'ok' : 'strong';
        });
        rf.addEventListener('submit', async (e) => {
          e.preventDefault();
          const err = $('#regErr');
          const name = rf.name.value.trim();
          if (name.length < 2) return (err.textContent = 'Nama minimal 2 karakter.');
          if (rf.password.value !== rf.password2.value) return (err.textContent = 'Konfirmasi kata sandi tidak cocok.');
          const btn = $('.btn.primary', rf); btn.disabled = true;
          const r = await S.signUp({ email: rf.email.value, password: rf.password.value, username: rf.username.value, name });
          btn.disabled = false;
          if (r.error) return (err.textContent = r.error);
          if (r.needConfirm) {
            $('.auth-main', root).innerHTML = `<div class="confirm-mail">${ic('mail')}<h2 class="modal-title">Cek email kamu</h2><p class="muted">Kami mengirim tautan konfirmasi ke <b>${esc(rf.email.value)}</b>. Klik tautannya, lalu kembali ke sini untuk masuk.</p><button class="btn primary" data-action="auth-tab" data-tab="login">Ke halaman masuk</button></div>`;
            return;
          }
          afterLogin(`Akun dibuat. Selamat bergabung, ${esc(firstName(me()))}! 🎉`, true);
          setTimeout(openOnboarding, 380);
        });
      },
    });
  }
  function afterLogin(msg, celebrate = false) { closeModal(); toast(msg); if (celebrate) FX.confetti(); render(true); }
  function requireAuth() {
    if (me()) return true;
    openAuth('login');
    toast('Masuk dulu untuk melanjutkan', 'muted');
    return false;
  }
  function setGoal(uid, year, target) {
    const g = goalOf(uid, year);
    if (g) S.update('reading_goals', g.id, { target }); else S.insert('reading_goals', { user_id: uid, year, target });
  }
  function openOnboarding() {
    const ranked = books().filter((b) => b.source === 'katalog').sort((a, b) => (a.rank || 999) - (b.rank || 999));
    const pop = [...ranked.filter((b) => b.hot).slice(0, 10), ...ranked.filter((b) => !b.hot)].slice(0, 18);
    openModal(`<div class="onboard"><p class="eyebrow">${ic('sparkle')} Langkah pertama</p><h2 class="modal-title">Buku mana yang sudah pernah kamu baca?</h2>
      <p class="muted">Ketuk sampul untuk menandai. Ini membantu menyusun rekomendasi & Wrap kamu.</p>
      <div class="onboard-grid">${pop.map((b) => `<button class="ob-pick" data-action="onboard-toggle" data-book="${esc(b.id)}">${cover(b, { link: false })}<span class="ob-check">${ic('check')}</span></button>`).join('')}</div>
      <div class="modal-actions"><span class="muted sm" id="obCount">0 dipilih</span><button class="btn primary" data-action="close-modal">Selesai</button></div></div>`, { wide: true });
  }

  /* ---------- pencarian buku (lokal + dunia) di dalam form ---------- */
  function bindBookSearch(input, out, onPick, { always = false } = {}) {
    if (!input) return;
    let seq = 0, timer = null;
    const item = (b, world) => `<button type="button" class="pick" data-pick="${esc(b.id)}">${cover(b, { size: 'xs', link: false })}<span><b>${esc(b.title)}</b><small>${esc(b.author)}${b.year ? ' · ' + b.year : ''}${world ? ` · <i class="src">${b.source === 'googlebooks' ? 'Google Books' : 'Open Library'}</i>` : ''}</small></span></button>`;
    const draw = () => {
      const q = input.value.trim();
      const my = ++seq;
      if (!q && !always) { out.innerHTML = ''; out.classList.remove('open'); return; }
      const local = searchBooks(q).sort((a, b) => communityScore(b) - communityScore(a) || (a.rank || 999) - (b.rank || 999)).slice(0, q ? 6 : 8);
      out.innerHTML = local.map((b) => item(b)).join('') + (q.length >= 3 ? `<div class="pick-world" data-world-slot><p class="sp-label">${ic('globe')} Mencari di katalog dunia…</p></div>` : '') + (!local.length && q.length < 3 ? '<p class="muted sm pad">Ketik minimal 3 huruf, atau ISBN, untuk mencari di katalog dunia.</p>' : '')
        + `<div class="pick-extra"><button type="button" data-extra="scan">${ic('barcode')}Scan ISBN</button><button type="button" data-extra="add">${ic('plus')}Tidak ketemu? Tambah buku</button></div>`;
      out.classList.add('open');
      hydrateCovers(out);
      clearTimeout(timer);
      if (q.length >= 3) timer = setTimeout(() => {
        window.API.searchWorld(q, { limit: 10 }).then((items) => {
          if (my !== seq) return;
          const slot = $('[data-world-slot]', out); if (!slot) return;
          const have = new Set(local.map((b) => norm(b.title)));
          const fresh = remember(items.filter((b) => !have.has(norm(b.title)) && !getBook(b.id))).slice(0, 8);
          slot.innerHTML = fresh.length ? `<p class="sp-label">${ic('globe')} Katalog dunia</p>${fresh.map((b) => item(b, true)).join('')}` : (local.length ? '' : '<p class="muted sm pad">Tidak ditemukan.</p>');
          hydrateCovers(slot);
        }).catch(() => { const slot = $('[data-world-slot]', out); if (slot && my === seq) slot.innerHTML = '<p class="muted xs pad">Katalog dunia tidak terjangkau (offline).</p>'; });
      }, 380);
    };
    input.addEventListener('input', draw);
    input.addEventListener('focus', draw);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const f = $('[data-pick]', out); if (f) pick(f.dataset.pick); } });
    const pick = async (id) => {
      try { await ensureBook(id); onPick(id); }
      catch (err) { toast('Gagal mengambil data buku. Coba lagi.', 'err'); }
    };
    out.addEventListener('click', (e) => {
      const p = e.target.closest('[data-pick]'); if (p) { pick(p.dataset.pick); return; }
      const x = e.target.closest('[data-extra]'); if (!x) return;
      if (x.dataset.extra === 'scan') scanToBook(onPick);
      else openAddBook({ title: input.value.trim(), onDone: onPick });
    });
    if (always) draw();
  }

  /* ---------- tambah buku manual & scan ISBN ---------- */
  const addBookCta = (q = '') => `<div class="add-cta">${ic('book')}<div><b>Bukumu tidak ada di daftar?</b><small>Tambahkan sendiri — lengkap dengan ISBN, penerbit, dan foto sampul — agar bisa dicatat, diulas, dan dijual di ruangbaca.</small></div><button class="btn primary sm" data-action="add-book" data-title="${esc(q)}">${ic('plus')}Tambah buku</button></div>`;
  const modalCleanup = [];

  function openAddBook({ title = '', isbn = '', onDone = null } = {}) {
    if (!requireAuth()) return;
    const isIsbn = window.API.cleanIsbn(title);
    if (isIsbn) { isbn = isIsbn; title = ''; }
    const G = window.RB_CATALOG.GENRES;
    let coverUrl = '';
    openModal(`<div class="addbook">
      <p class="eyebrow">${ic('plus')} Tambah ke katalog</p>
      <h2 class="modal-title">Buku baru</h2>
      <p class="muted sm">Isi ISBN lalu tekan <b>Isi otomatis</b> — data diambil dari Open Library &amp; Google Books. Kalau tidak ada, isi manual saja.</p>
      <form id="addBookForm" class="form" novalidate>
        <div class="isbn-row">
          <label class="field"><span>ISBN <i class="muted">(opsional)</i></span><input class="input" name="isbn" value="${esc(isbn)}" inputmode="numeric" placeholder="978-602-…"></label>
          <button type="button" class="btn ghost" id="isbnFill">${ic('globe')}Isi otomatis</button>
          <button type="button" class="btn ghost" id="isbnScan" title="Scan barcode">${ic('barcode')}</button>
        </div>
        <div class="addbook-grid">
          <label class="ab-cover" title="Unggah foto sampul"><span id="abCoverPrev" class="cover ghost"><span class="ab-cam">${ic('camera')}<small>Foto sampul</small></span></span><input type="file" id="abCoverFile" accept="image/*" hidden></label>
          <div class="form">
            <label class="field"><span>Judul</span><input class="input" name="title" value="${esc(title)}" required maxlength="200" autofocus></label>
            <label class="field"><span>Penulis</span><input class="input" name="author" required maxlength="160" placeholder="mis. Brian Khrisna"></label>
            <div class="field-row three">
              <label class="field"><span>Tahun terbit</span><input class="input" name="year" type="number" min="1000" max="${new Date().getFullYear() + 1}"></label>
              <label class="field"><span>Halaman</span><input class="input" name="pages" type="number" min="1" max="20000"></label>
              <label class="field"><span>Bahasa</span><select class="input" name="language"><option value="id">Indonesia</option><option value="en">Inggris</option><option value="ja">Jepang</option><option value="ko">Korea</option><option value="">Lainnya</option></select></label>
            </div>
            <label class="field"><span>Penerbit</span><input class="input" name="publisher" maxlength="120" placeholder="mis. Gramedia Pustaka Utama"></label>
          </div>
        </div>
        <span class="label">Genre (pilih maks. 3)</span>
        <div class="chips">${G.map((g) => `<label class="chip check-chip"><input type="checkbox" name="genres" value="${esc(g)}"><span>${esc(g)}</span></label>`).join('')}</div>
        <label class="field"><span>Sinopsis</span><textarea class="input" name="synopsis" rows="4" maxlength="2000" placeholder="Ceritakan singkat isi buku ini…"></textarea></label>
        <p class="form-err" id="abErr"></p>
        <div class="modal-actions"><button type="button" class="btn ghost" data-action="close-modal">Batal</button><button class="btn primary">${ic('check')}Simpan buku</button></div>
      </form></div>`, {
      wide: true,
      onOpen: (root) => {
        const f = $('#addBookForm', root);
        const setCover = (url) => { coverUrl = url || ''; const p = $('#abCoverPrev', root); p.className = 'cover'; p.innerHTML = url ? imgTag(url) : ''; };
        const fill = (b) => {
          if (!b) return;
          if (b.title) f.title.value = b.title;
          if (b.author && b.author !== 'Tanpa nama') f.author.value = b.author;
          if (b.year) f.year.value = b.year;
          if (b.pages) f.pages.value = b.pages;
          if (b.publisher) f.publisher.value = b.publisher;
          if (b.synopsis) f.synopsis.value = b.synopsis;
          if (b.language) f.language.value = /^(id|ind)$/.test(b.language) ? 'id' : ['en', 'ja', 'ko'].includes(b.language) ? b.language : '';
          if (b.isbn && !f.isbn.value) f.isbn.value = b.isbn;
          (b.genres || []).forEach((g) => { const c = $(`input[name=genres][value="${CSS.escape(g)}"]`, f); if (c) c.checked = true; });
          if (b.cover_url) setCover(b.cover_url);
        };
        const lookup = async () => {
          const code = window.API.cleanIsbn(f.isbn.value);
          if (!code) { $('#abErr', root).textContent = 'ISBN tidak valid. Periksa lagi 10 atau 13 digitnya.'; return; }
          $('#abErr', root).textContent = '';
          const ex = localByIsbn(code);
          if (ex) { closeModal(); toast(`Buku ini sudah ada: <b>${esc(ex.title)}</b>`); if (onDone) onDone(ex.id); else go(`#/buku/${encodeURIComponent(ex.id)}`); return; }
          const btn = $('#isbnFill', root); btn.disabled = true; btn.innerHTML = '<span class="spinner sm"></span>Mencari…';
          try {
            const res = await window.API.isbnLookup(code);
            const hit = res[0] && localFromWorld(res[0]);
            if (hit) { closeModal(); toast(`Buku ini sudah ada: <b>${esc(hit.title)}</b>`); if (onDone) onDone(hit.id); else go(`#/buku/${encodeURIComponent(hit.id)}`); return; }
            if (res.length) { fill(res[0]); f.isbn.value = code; toast('Data buku ditemukan — ISBN cocok persis ✨'); }
            else toast('ISBN ini belum terdaftar di Open Library maupun Google Books — isi manual, ya.', 'muted');
          } catch (e) { toast('Katalog dunia tidak terjangkau. Isi manual dulu, ya.', 'muted'); }
          btn.disabled = false; btn.innerHTML = `${ic('globe')}Isi otomatis`;
        };
        $('#isbnFill', root).addEventListener('click', lookup);
        $('#isbnScan', root).addEventListener('click', () => {
          const snapshot = Object.fromEntries(new FormData(f));
          openScanner((code) => openAddBook({ title: snapshot.title || '', isbn: code, onDone }));
        });
        if (isbn) setTimeout(lookup, 50);
        $('#abCoverFile', root).addEventListener('change', async (e) => {
          const file = e.target.files[0]; if (!file) return;
          try { toast('Mengunggah sampul…', 'muted'); setCover(await S.uploadImage(file, 'sampul')); } catch (err) { toast(esc(err.message), 'err'); }
        });
        f.addEventListener('change', (e) => {
          if (e.target.name === 'genres' && $$('input[name=genres]:checked', f).length > 3) { e.target.checked = false; toast('Maksimal 3 genre', 'muted'); }
        });
        f.addEventListener('submit', (e) => {
          e.preventDefault();
          const err = $('#abErr', root);
          const t = f.title.value.trim(), a = f.author.value.trim();
          if (t.length < 1) return (err.textContent = 'Judul wajib diisi.');
          if (a.length < 2) return (err.textContent = 'Nama penulis wajib diisi.');
          const code = f.isbn.value.trim() ? window.API.cleanIsbn(f.isbn.value) : null;
          if (f.isbn.value.trim() && !code) return (err.textContent = 'ISBN tidak valid (cek digitnya) — atau kosongkan saja.');
          const dup = (code && localByIsbn(code)) || books().find((b) => norm(b.title) === norm(t) && norm(b.author) === norm(a));
          if (dup) { closeModal(); toast(`Buku ini sudah ada di katalog: <b>${esc(dup.title)}</b>`); if (onDone) onDone(dup.id); else go(`#/buku/${encodeURIComponent(dup.id)}`); return; }
          const id = 'u-' + window.RB_CATALOG.slug(t).slice(0, 40) + '-' + Math.random().toString(36).slice(2, 6);
          const genresSel = $$('input[name=genres]:checked', f).map((x) => x.value);
          S.upsertBook({
            id, title: t, author: a, year: Number(f.year.value) || null, pages: Number(f.pages.value) || null,
            genres: genresSel.length ? genresSel : ['Fiksi'], synopsis: f.synopsis.value.trim(), cover_url: coverUrl || null,
            ol_key: null, isbn: code, publisher: f.publisher.value.trim() || null, language: f.language.value || null,
            hot: false, trend_note: null, source: 'pengguna', created_by: me().id,
          });
          closeModal();
          FX.confetti();
          toast(`<b>${esc(t)}</b> ditambahkan ke katalog 📚`);
          if (onDone) onDone(id); else go(`#/buku/${encodeURIComponent(id)}`);
        });
      },
    });
  }

  function openScanner(onCode) {
    const supported = 'BarcodeDetector' in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    openModal(`<div class="scanner">
      <h2 class="modal-title">${ic('barcode')} Scan ISBN</h2>
      <p class="muted sm">Arahkan kamera ke barcode di sampul belakang buku (yang diawali 978 / 979).</p>
      ${supported ? '<div class="scan-view"><video id="scanVideo" playsinline muted></video><span class="scan-line"></span></div><p class="muted xs" id="scanStatus">Menyalakan kamera…</p>' : `<div class="empty slim">${ic('info')}<p>Browser ini belum mendukung scan barcode langsung (coba Chrome di Android). Ketik ISBN-nya saja di bawah.</p></div>`}
      <form id="scanManual" class="isbn-row"><label class="field"><span>Atau ketik ISBN</span><input class="input" name="isbn" inputmode="numeric" placeholder="9786020…" ${supported ? '' : 'autofocus'}></label><button class="btn primary">Cari</button></form>
    </div>`, {
      onOpen: async (root) => {
        const done = (code) => { closeModal(); onCode(code); };
        $('#scanManual', root).addEventListener('submit', (e) => {
          e.preventDefault();
          const code = window.API.cleanIsbn(e.target.isbn.value);
          if (!code) { toast('ISBN tidak valid', 'err'); return; }
          done(code);
        });
        if (!supported) return;
        let stream = null, timer = null;
        modalCleanup.push(() => { clearInterval(timer); if (stream) stream.getTracks().forEach((t) => t.stop()); });
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          const v = $('#scanVideo', root);
          if (!v) { stream.getTracks().forEach((t) => t.stop()); return; }
          v.srcObject = stream; await v.play();
          $('#scanStatus', root).textContent = 'Mencari barcode…';
          const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a'] });
          timer = setInterval(async () => {
            try {
              const codes = await det.detect(v);
              const hit = codes.map((c) => window.API.cleanIsbn(c.rawValue)).find(Boolean);
              if (hit) { FX.burstAt(v, 'book', 12); done(hit); }
            } catch (e) { /* frame belum siap */ }
          }, 350);
        } catch (e) {
          const st = $('#scanStatus', root); if (st) st.textContent = 'Kamera tidak bisa dibuka (izin ditolak?). Ketik ISBN di bawah.';
        }
      },
    });
  }
  /** cari buku di ruangbaca berdasarkan ISBN (10/13 disamakan) */
  function localByIsbn(code) { return books().find((b) => window.API.sameIsbn(b.isbn || window.API.metaOf(b).isbn, code)); }
  /** hasil katalog dunia yang sebenarnya sudah ada di ruangbaca (karya Open Library yang sama, atau judul+penulis sama) */
  function localFromWorld(w) {
    if (!w) return null;
    if (getBook(w.id)) return getBook(w.id);
    return books().find((b) => (w.ol_key && window.API.metaOf(b).olKey === w.ol_key) || (window.API.titleMatch(b.title, w.title) && norm(b.author).split(' ').some((x) => x.length > 2 && norm(w.author).includes(x))));
  }
  async function scanToBook(onPick) {
    openScanner(async (code) => {
      const local = localByIsbn(code);
      if (local) { onPick(local.id); return; }
      toast(`Mencari ISBN ${code}…`, 'muted');
      try {
        const res = await window.API.isbnLookup(code);
        if (res.length) {
          const hit = localFromWorld(res[0]);
          if (hit) { onPick(hit.id); return; }
          remember(res); await ensureBook(res[0].id); onPick(res[0].id); return;
        }
        toast(`ISBN ${code} tidak ditemukan di katalog dunia. Tambahkan bukunya, yuk.`, 'muted');
      } catch (e) { toast('Katalog dunia tidak terjangkau. Isi manual dulu, ya.', 'muted'); }
      openAddBook({ isbn: code, onDone: onPick });
    });
  }

  /* ---------- catat bacaan ---------- */
  function openLog(bookId = null, entryId = null) {
    if (!requireAuth()) return;
    const m = me();
    if (!bookId && !entryId) {
      openModal(`<h2 class="modal-title">${ic('plus')} Catat bacaan</h2><p class="muted">Buku apa yang baru kamu selesaikan? Cari dari ruangbaca atau katalog dunia.</p>
        <div class="search-field">${ic('search')}<input id="logSearch" class="input" placeholder="Ketik judul atau penulis…" autofocus autocomplete="off"></div>
        <div id="logResults" class="pick-list"></div>`, {
        onOpen: (root) => bindBookSearch($('#logSearch', root), $('#logResults', root), (bid) => openLog(bid), { always: true }),
      });
      return;
    }
    const entry = entryId ? S.get('diary_entries', entryId) : null;
    const b = getBook(entry ? entry.book_id : bookId);
    if (!b) { ensureBook(bookId).then(() => openLog(bookId)).catch(() => toast('Buku tidak ditemukan', 'err')); return; }
    const sh = shelfOf(m.id, b.id);
    const prev = S.where('diary_entries', (e) => e.user_id === m.id && e.book_id === b.id && (!entry || e.id !== entry.id));
    const rating = entry ? entry.rating : sh?.rating;
    const liked = entry ? entry.liked : sh?.liked;
    openModal(`<div class="log">
      <div class="log-cover">${cover(b, { link: false })}</div>
      <form id="logForm" class="log-form form">
        <p class="eyebrow">${entry ? 'Ubah catatan' : 'Aku membaca…'}</p>
        <h2 class="modal-title">${esc(b.title)} <span class="year">${b.year || ''}</span></h2>
        <p class="muted sm">${esc(b.author)}</p>
        <div class="log-grid">
          <label class="field"><span>Selesai dibaca</span><input type="date" name="read_date" class="input" value="${entry ? entry.read_date : todayISO()}" max="${todayISO()}" required></label>
          <label class="check"><input type="checkbox" name="reread" ${entry ? (entry.is_reread ? 'checked' : '') : prev.length ? 'checked' : ''}><span>Aku pernah membaca buku ini sebelumnya</span></label>
        </div>
        <label class="field"><span>Ulasan <i class="muted">(opsional)</i></span><textarea name="review" class="input" rows="5" maxlength="5000" placeholder="Apa yang kamu rasakan setelah menutup halaman terakhir?">${esc(entry?.review || '')}</textarea></label>
        <label class="check"><input type="checkbox" name="spoiler" ${entry?.contains_spoiler ? 'checked' : ''}><span>Ulasanku mengandung spoiler</span></label>
        <div class="log-foot">
          <div><span class="label">Rating</span>${starInput(rating || 0)}</div>
          <button type="button" class="like-toggle ${liked ? 'on' : ''}" data-action="like-toggle-local" aria-pressed="${!!liked}">${ic('heart')}<span>Suka</span></button>
          <div class="log-btns">${entry ? `<button type="button" class="btn ghost danger" data-action="delete-entry" data-entry="${entry.id}">${ic('trash')}</button>` : ''}<button class="btn primary">${entry ? 'Simpan' : 'Catat'}</button></div>
        </div>
      </form></div>`, {
      wide: true,
      onOpen: (root) => $('#logForm', root).addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target;
        const r = Number($('[data-star-input]', f).dataset.value) || null;
        const lk = $('.like-toggle', f).classList.contains('on');
        const row = { read_date: f.read_date.value || todayISO(), rating: r, liked: lk, review: f.review.value.trim(), contains_spoiler: f.spoiler.checked, is_reread: f.reread.checked };
        if (entry) S.update('diary_entries', entry.id, row);
        else S.insert('diary_entries', { user_id: m.id, book_id: b.id, ...row });
        setShelf(m.id, b.id, { status: 'read', rating: r ?? sh?.rating ?? null, liked: lk, progress: 0 });
        FX.burstAt($('.btn.primary', f), 'book', 14);
        closeModal();
        const year = new Date().getFullYear();
        const g = goalOf(m.id, year);
        const count = yearEntries(m.id, year).length;
        if (!entry && g && count === g.target) { FX.confetti(); toast(`🎉 Target ${year} tercapai! ${count} buku — luar biasa!`, 'big'); }
        else toast(entry ? 'Catatan diperbarui' : `Tercatat: <b>${esc(b.title)}</b> ${r ? `<span class="stars">${starsText(r)}</span>` : ''}`);
        refresh();
      }),
    });
  }

  /* ---------- daftar ---------- */
  function openAddToList(bookId) {
    if (!requireAuth()) return;
    const m = me(), b = getBook(bookId);
    const mine = S.where('lists', (l) => l.user_id === m.id).sort(byCreatedDesc);
    openModal(`<h2 class="modal-title">${ic('list')} Tambahkan ke daftar</h2><p class="muted sm">${esc(b.title)}</p>
      <div class="pick-list">${mine.map((l) => { const has = listItems(l.id).some((i) => i.book_id === bookId); return `<button class="pick list-pick ${has ? 'on' : ''}" data-action="list-toggle-book" data-list="${l.id}" data-book="${esc(bookId)}"><span class="pick-check">${ic('check')}</span><span><b>${esc(l.title)}</b><small>${listItems(l.id).length} buku</small></span></button>`; }).join('') || '<p class="muted sm">Kamu belum punya daftar.</p>'}</div>
      <button class="btn ghost full" data-action="open-list-create" data-book="${esc(bookId)}">${ic('plus')}Buat daftar baru</button>`);
  }
  function openListForm(listId = null, initialBook = null) {
    if (!requireAuth()) return;
    const l = listId ? S.get('lists', listId) : null;
    openModal(`<h2 class="modal-title">${l ? 'Ubah daftar' : 'Daftar baru'}</h2>
      <form id="listForm" class="form">
        <label class="field"><span>Judul</span><input class="input" name="title" required maxlength="80" value="${esc(l?.title || '')}" placeholder="mis. Novel untuk dibaca di kereta" autofocus></label>
        <label class="field"><span>Deskripsi</span><textarea class="input" name="description" rows="3" maxlength="500" placeholder="Ceritakan tema daftar ini…">${esc(l?.description || '')}</textarea></label>
        <label class="check"><input type="checkbox" name="ranked" ${l?.is_ranked ? 'checked' : ''}><span>Daftar berperingkat (tampilkan nomor urut)</span></label>
        <div class="modal-actions"><button type="button" class="btn ghost" data-action="close-modal">Batal</button><button class="btn primary">Simpan</button></div>
      </form>`, {
      onOpen: (root) => $('#listForm', root).addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target;
        const row = { title: f.title.value.trim(), description: f.description.value.trim(), is_ranked: f.ranked.checked };
        if (!row.title) return;
        let id = listId;
        if (l) S.update('lists', l.id, row);
        else {
          id = S.insert('lists', { user_id: me().id, ...row }).id;
          if (initialBook) S.insert('list_items', { list_id: id, book_id: initialBook, position: 1 });
        }
        closeModal();
        toast(l ? 'Daftar diperbarui' : 'Daftar dibuat 📚');
        go(`#/daftar/${id}`);
      }),
    });
  }
  function renumber(listId) { listItems(listId).forEach((it, i) => { if (it.position !== i + 1) S.update('list_items', it.id, { position: i + 1 }); }); }
  function openFavPicker(pos) {
    openModal(`<h2 class="modal-title">${ic('heart')} Pilih buku favorit</h2><p class="muted sm">Slot #${pos} — dari ruangbaca atau katalog dunia</p>
      <div class="search-field">${ic('search')}<input id="favSearch" class="input" placeholder="Cari judul atau penulis…" autofocus autocomplete="off"></div><div id="favResults" class="pick-list"></div>`, {
      onOpen: (root) => bindBookSearch($('#favSearch', root), $('#favResults', root), (bid) => {
        const m = me();
        S.remove('favorites', (f) => f.user_id === m.id && (f.position === pos || f.book_id === bid));
        S.insert('favorites', { user_id: m.id, book_id: bid, position: pos });
        closeModal();
        toast(`<b>${esc(getBook(bid).title)}</b> jadi favoritmu ♥`, 'like');
        refresh();
      }, { always: true }),
    });
  }

  /* ===================== toast & tema ===================== */
  function toast(msg, type = 'ok') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = msg;
    $('#toasts').append(el);
    setTimeout(() => el.classList.add('out'), type === 'big' ? 4200 : 2600);
    setTimeout(() => el.remove(), type === 'big' ? 4700 : 3100);
  }
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    store.set('ruangbaca.theme', t);
    const m = $('meta[name="theme-color"]');
    if (m) m.content = t === 'dark' ? '#161c1e' : '#f7f5f0';
  }
  /**
   * Ganti tema dengan mulus: seluruh halaman memudar bersamaan (View Transitions API),
   * tanpa render ulang halaman — jadi tidak ada elemen yang berubah sendiri-sendiri.
   */
  function switchTheme(t) {
    const root = document.documentElement;
    if (root.dataset.theme === t) return;
    const swap = () => {
      applyTheme(t);
      renderHeader(currentNav);
      $$('.theme-opt').forEach((b) => b.classList.toggle('on', b.dataset.theme === t));
    };
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduce) {
      root.classList.add('theme-vt');
      const vt = document.startViewTransition(swap);
      vt.finished.finally(() => root.classList.remove('theme-vt'));
    } else {
      root.classList.add('theme-fade');
      swap();
      setTimeout(() => root.classList.remove('theme-fade'), 650);
    }
  }
  async function copyText(text, msg) {
    try { await navigator.clipboard.writeText(text); toast(msg || 'Tautan disalin 🔗'); }
    catch (e) { window.prompt('Salin tautan ini:', text); }
  }
  const baseUrl = () => location.href.split('#')[0];

  /* ===================== aksi ===================== */
  function shelfToggle(bid, kind, el) {
    if (!requireAuth()) return;
    const doIt = () => {
      const m = me(), sh = shelfOf(m.id, bid), b = getBook(bid);
      const t = `<b>${esc(b.title)}</b>`;
      if (kind === 'like') {
        const v = !sh?.liked;
        setShelf(m.id, bid, { liked: v });
        if (v) FX.burstAt(el, 'heart', 14);
        toast(v ? `${ic('heart')} Kamu menyukai ${t}` : `Batal menyukai ${t}`, v ? 'like' : 'muted');
      } else {
        const v = sh?.status === kind ? null : kind;
        setShelf(m.id, bid, { status: v, ...(v === 'reading' ? { progress: sh?.progress || 0 } : {}) });
        if (v) FX.burstAt(el, kind === 'read' ? 'dot' : 'book', 10);
        const msgs = { read: `${ic('check')} ${t} ditandai sudah dibaca`, reading: `${ic('book')} Selamat membaca ${t}!`, want: `${ic('bookmark')} ${t} masuk rak “Ingin dibaca”` };
        toast(v ? msgs[v] : `${t} dihapus dari rak`, v || 'muted');
      }
      refresh();
    };
    if (getBook(bid)) doIt(); else ensureBook(bid).then(doIt).catch(() => toast('Gagal memuat buku', 'err'));
  }

  const ACTIONS = {
    'close-modal': closeModal,
    'add-book': (el) => openAddBook({ title: el.dataset.title || '' }),
    'scan-isbn': () => openScanner((code) => go('#/jelajah?q=' + code)),
    'open-auth': (el) => openAuth(el.dataset.tab),
    'auth-tab': (el) => {
      if (!$('#loginForm')) { openAuth(el.dataset.tab); return; }
      const tab = el.dataset.tab;
      $$('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
      $('#loginForm').hidden = tab !== 'login';
      $('#registerForm').hidden = tab !== 'register';
      $(`#${tab === 'login' ? 'loginForm' : 'registerForm'} input`).focus();
    },
    'google-login': async () => {
      const r = await S.signInGoogle();
      if (r.error) toast(esc(r.error), 'muted');
    },
    'pw-toggle': (el) => { const i = el.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; },
    logout: async () => { await S.signOut(); toast('Sampai jumpa lagi! 👋', 'muted'); go('#/'); },
    theme: () => switchTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'),
    'set-theme': (el) => switchTheme(el.dataset.theme),
    menu: (el) => { const pop = el.nextElementSibling; pop.hidden = !pop.hidden; },
    'feed-scope': (el) => { store.set('ruangbaca.feed', el.dataset.scope); refresh(); },
    'hide-banner': () => { store.set('ruangbaca.hideBanner', '1'); $('#modeBanner').hidden = true; },
    'open-log': (el) => openLog(el.dataset.book || null),
    'edit-entry': (el) => openLog(null, el.dataset.entry),
    'delete-entry': (el) => {
      const e = S.get('diary_entries', el.dataset.entry);
      if (!e) return;
      confirmModal('Hapus catatan?', 'Catatan diary, ulasan, suka, dan komentarnya akan dihapus permanen.', 'Hapus', () => {
        S.remove('review_likes', (x) => x.entry_id === e.id);
        S.remove('comments', (x) => x.entry_id === e.id);
        S.remove('diary_entries', (x) => x.id === e.id);
        toast('Catatan dihapus', 'muted');
        if (location.hash.startsWith('#/ulasan/')) go(`#/u/${me().username}/diary`); else refresh();
      });
    },
    'like-toggle-local': (el) => { el.classList.toggle('on'); el.setAttribute('aria-pressed', el.classList.contains('on')); if (el.classList.contains('on')) FX.burstAt(el, 'heart', 10); },
    'toggle-read': (el) => shelfToggle(el.dataset.book, 'read', el),
    'toggle-reading': (el) => shelfToggle(el.dataset.book, 'reading', el),
    'toggle-want': (el) => shelfToggle(el.dataset.book, 'want', el),
    'toggle-like': (el) => shelfToggle(el.dataset.book, 'like', el),
    'add-to-list': (el) => openAddToList(el.dataset.book),
    'list-toggle-book': (el) => {
      const lid = el.dataset.list, bid = el.dataset.book;
      const ex = S.first('list_items', (i) => i.list_id === lid && i.book_id === bid);
      if (ex) { S.remove('list_items', (i) => i.id === ex.id); renumber(lid); el.classList.remove('on'); }
      else { S.insert('list_items', { list_id: lid, book_id: bid, position: listItems(lid).length + 1 }); el.classList.add('on'); FX.burstAt(el.querySelector('.pick-check'), 'dot', 8); }
      $('small', el).textContent = `${listItems(lid).length} buku`;
      dirty = true;
    },
    'open-list-create': (el) => openListForm(null, el.dataset.book || null),
    'edit-list': (el) => openListForm(el.dataset.list),
    'delete-list': (el) => {
      const id = el.dataset.list;
      confirmModal('Hapus daftar?', 'Daftar ini beserta isinya akan dihapus permanen.', 'Hapus', () => {
        S.remove('list_items', (i) => i.list_id === id);
        S.remove('list_likes', (i) => i.list_id === id);
        S.remove('lists', (l) => l.id === id);
        toast('Daftar dihapus', 'muted');
        go('#/daftar');
      });
    },
    'like-list': (el) => {
      if (!requireAuth()) return;
      const id = el.dataset.list, m = me();
      const ex = S.first('list_likes', (l) => l.list_id === id && l.user_id === m.id);
      if (ex) S.remove('list_likes', (l) => l.id === ex.id);
      else { S.insert('list_likes', { user_id: m.id, list_id: id }); notify(S.get('lists', id).user_id, 'like_list', id); FX.burstAt(el, 'heart', 12); }
      refresh();
    },
    'list-move': (el) => {
      const it = S.get('list_items', el.dataset.item);
      const items = listItems(it.list_id);
      const i = items.findIndex((x) => x.id === it.id), j = i + Number(el.dataset.dir);
      if (j < 0 || j >= items.length) return;
      const a = items[i].position, b = items[j].position;
      S.update('list_items', items[i].id, { position: b });
      S.update('list_items', items[j].id, { position: a });
      refresh();
    },
    'list-remove': (el) => { const it = S.get('list_items', el.dataset.item); S.remove('list_items', (x) => x.id === it.id); renumber(it.list_id); toast('Dihapus dari daftar', 'muted'); refresh(); },
    'copy-link': (el) => copyText(baseUrl() + el.dataset.href),
    share: (el) => copyText(`${baseUrl()}#/buku/${encodeURIComponent(el.dataset.book)}`),
    follow: (el) => {
      if (!requireAuth()) return;
      const id = el.dataset.user, m = me(), t = getUser(id);
      if (isFollowing(m.id, id)) { S.remove('follows', (f) => f.follower_id === m.id && f.following_id === id); toast(`Berhenti mengikuti ${esc(t.name)}`, 'muted'); }
      else { S.insert('follows', { follower_id: m.id, following_id: id }); notify(id, 'follow'); FX.burstAt(el, 'dot', 12); toast(`Kamu mengikuti <b>${esc(t.name)}</b>`); }
      refresh();
    },
    'like-review': (el) => {
      if (!requireAuth()) return;
      const id = el.dataset.entry, m = me();
      const ex = S.first('review_likes', (l) => l.entry_id === id && l.user_id === m.id);
      if (ex) S.remove('review_likes', (l) => l.id === ex.id);
      else { S.insert('review_likes', { user_id: m.id, entry_id: id }); notify(S.get('diary_entries', id).user_id, 'like_review', id); FX.burstAt(el, 'heart', 12); }
      refresh();
    },
    reveal: (el) => el.closest('.review-text').classList.remove('spoiler'),
    'delete-comment': (el) => { S.remove('comments', (c) => c.id === el.dataset.id); toast('Komentar dihapus', 'muted'); refresh(); },
    'pick-favorite': (el) => openFavPicker(Number(el.dataset.pos)),
    'remove-favorite': (el) => { const m = me(); S.remove('favorites', (f) => f.user_id === m.id && f.position === Number(el.dataset.pos)); refresh(); },
    'remove-avatar': () => { S.update('profiles', me().id, { avatar_url: null }); refresh(); },
    'edit-goal': () => {
      if (!requireAuth()) return;
      const year = new Date().getFullYear(), g = goalOf(me().id, year);
      openModal(`<h2 class="modal-title">${ic('target')} Tantangan membaca ${year}</h2><p class="muted sm">Berapa buku yang ingin kamu selesaikan tahun ini?</p>
        <form id="goalForm" class="form goal-form"><div class="goal-input"><button type="button" class="icon-btn" data-step="-1">−</button><input class="input" type="number" name="target" min="1" max="999" value="${g ? g.target : 12}" autofocus><button type="button" class="icon-btn" data-step="1">+</button></div>
        <div class="chips center">${[6, 12, 24, 52].map((n) => `<button type="button" class="chip" data-set="${n}">${n} buku</button>`).join('')}</div>
        <button class="btn primary full">Simpan target</button></form>`, {
        onOpen: (root) => {
          const f = $('#goalForm', root);
          f.addEventListener('click', (e) => {
            const s = e.target.closest('[data-step]'), c = e.target.closest('[data-set]');
            if (s) f.target.value = Math.max(1, Number(f.target.value) + Number(s.dataset.step));
            if (c) f.target.value = c.dataset.set;
          });
          f.addEventListener('submit', (e) => { e.preventDefault(); setGoal(me().id, year, Math.max(1, Number(f.target.value) || 12)); closeModal(); toast('Target disimpan. Semangat! 💪'); refresh(); });
        },
      });
    },
    'onboard-toggle': (el) => {
      const bid = el.dataset.book;
      el.classList.toggle('on');
      setShelf(me().id, bid, { status: el.classList.contains('on') ? 'read' : null });
      if (el.classList.contains('on')) FX.burstAt(el, 'dot', 8);
      $('#obCount').textContent = `${$$('.ob-pick.on').length} dipilih`;
      dirty = true;
    },
    export: () => {
      const blob = new Blob([S.dump()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ruangbaca-${todayISO()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('Data diekspor');
    },
    'reset-db': () => confirmModal('Hapus semua data demo?', 'Semua akun, catatan, ulasan, dan lapak di browser ini akan dihapus.', 'Hapus semua', () => { S.resetDemo(); toast('Data demo dihapus', 'muted'); go('#/'); }),
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!e.target.closest('.menu')) $$('.menu-pop').forEach((p) => { p.hidden = true; });
    if (!e.target.closest('.search')) closeSearchPop();
    if (!e.target.closest('.list-add, .pick-host')) $$('.pick-pop').forEach((p) => p.classList.remove('open'));
    if (!el || el.disabled) return;
    const fn = ACTIONS[el.dataset.action];
    if (fn) { e.preventDefault(); fn(el, e); }
  });

  /* ---------- input bintang ---------- */
  const starVal = (el, x) => { const r = el.getBoundingClientRect(); return Math.min(5, Math.max(0.5, Math.ceil(((x - r.left) / r.width) * 10) / 2)); };
  function paintStars(el, v) {
    $('.si-fg', el).style.width = `${(v / 5) * 100}%`;
    const lbl = el.parentElement.querySelector('.si-label');
    if (lbl) lbl.textContent = v ? v.toFixed(1) : '–';
  }
  function commitStars(el, v) {
    el.dataset.value = v; el.setAttribute('aria-valuenow', v); paintStars(el, v);
    if (v) { const r = el.getBoundingClientRect(); FX.burst(r.left + (r.width * v) / 5 - 12, r.top + r.height / 2, 'star', 10); }
    if (el.dataset.book && me()) {
      const bid = el.dataset.book, sh = shelfOf(me().id, bid);
      setShelf(me().id, bid, { rating: v || null, ...(v && sh?.status !== 'read' ? { status: 'read' } : {}) });
      toast(v ? `Rating disimpan <span class="stars">${starsText(v)}</span>` : 'Rating dihapus', v ? 'ok' : 'muted');
      setTimeout(refresh, 250);
    }
  }
  document.addEventListener('pointermove', (e) => { const el = e.target.closest('[data-star-input]'); if (el && e.pointerType === 'mouse') paintStars(el, starVal(el, e.clientX)); });
  document.addEventListener('pointerout', (e) => { const el = e.target.closest('[data-star-input]'); if (el && !el.contains(e.relatedTarget)) paintStars(el, Number(el.dataset.value)); });
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-star-input]');
    if (!el) return;
    const v = starVal(el, e.clientX);
    commitStars(el, v === Number(el.dataset.value) ? 0 : v);
  });
  document.addEventListener('keydown', (e) => {
    const el = e.target.closest && e.target.closest('[data-star-input]');
    if (!el) return;
    const cur = Number(el.dataset.value);
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); commitStars(el, Math.min(5, cur + 0.5)); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); commitStars(el, Math.max(0, cur - 0.5)); }
  });

  /* ---------- progres membaca ---------- */
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-progress]');
    if (!el) return;
    const total = Number(el.dataset.total), v = Number(el.value), pct = Math.round((v / total) * 100);
    const card = el.closest('.progress-card');
    $(`#pl-${hashStr(el.dataset.progress)}`, card).innerHTML = `hal. <b>${v}</b> / ${total} · ${pct}%`;
    $('.pbar span', card).style.width = pct + '%';
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-progress]');
    if (!el || !me()) return;
    const bid = el.dataset.progress, v = Number(el.value), b = getBook(bid);
    setShelf(me().id, bid, { progress: v });
    if (v >= Number(el.dataset.total)) { toast(`Halaman terakhir! Catat <b>${esc(b.title)}</b> sebagai selesai?`); openLog(bid); }
    else toast(`Progres disimpan: hal. ${v}`, 'reading');
  });

  /* ---------- pencarian header ---------- */
  const sInput = $('#searchInput'), sPop = $('#searchPop');
  function closeSearchPop() { sPop.classList.remove('open'); }
  let sTimer = null, sSeq = 0;
  sInput.addEventListener('input', () => {
    const q = sInput.value.trim();
    const my = ++sSeq;
    if (!q) return closeSearchPop();
    const bs = searchBooks(q).slice(0, 4), us = searchUsers(q).slice(0, 3);
    sPop.innerHTML = (bs.length ? `<p class="sp-label">Di ruangbaca</p>${bs.map((b) => `<a href="#/buku/${encodeURIComponent(b.id)}" class="pick">${cover(b, { size: 'xs', link: false })}<span><b>${esc(b.title)}</b><small>${esc(b.author)}${b.year ? ' · ' + b.year : ''}</small></span></a>`).join('')}` : '')
      + (us.length ? `<p class="sp-label">Anggota</p>${us.map((u) => `<a href="#/u/${esc(u.username)}" class="pick">${avatar(u, 'sm', false)}<span><b>${esc(u.name)}</b><small>@${esc(u.username)}</small></span></a>`).join('')}` : '')
      + (q.length >= 3 ? `<div data-sp-world><p class="sp-label">${ic('globe')} Katalog dunia…</p></div>` : '')
      + `<a class="sp-all" href="#/jelajah?q=${encodeURIComponent(q)}">Lihat semua hasil untuk “${esc(q)}” →</a>`;
    sPop.classList.add('open');
    hydrateCovers(sPop);
    clearTimeout(sTimer);
    if (q.length >= 3) sTimer = setTimeout(() => window.API.searchWorld(q, { limit: 8 }).then((items) => {
      if (my !== sSeq) return;
      const slot = $('[data-sp-world]', sPop); if (!slot) return;
      const fresh = remember(items.filter((b) => !getBook(b.id) && !bs.some((x) => norm(x.title) === norm(b.title)))).slice(0, 4);
      slot.innerHTML = fresh.length ? `<p class="sp-label">${ic('globe')} Katalog dunia</p>${fresh.map((b) => `<a href="#/buku/${encodeURIComponent(b.id)}" class="pick">${cover(b, { size: 'xs', link: false })}<span><b>${esc(b.title)}</b><small>${esc(b.author)}${b.year ? ' · ' + b.year : ''}</small></span></a>`).join('')}` : '';
      hydrateCovers(slot);
    }).catch(() => { const slot = $('[data-sp-world]', sPop); if (slot) slot.innerHTML = ''; }), 350);
  });
  $('#searchForm').addEventListener('submit', (e) => { e.preventDefault(); const q = sInput.value.trim(); sInput.blur(); go('#/jelajah' + (q ? '?q=' + encodeURIComponent(q) : '')); });
  sPop.addEventListener('click', (e) => { if (e.target.closest('a')) { sInput.value = ''; closeSearchPop(); } });

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if (e.key === 'Escape') {
      if (window.RB.Wrap && window.RB.Wrap.isOpen()) return;
      closeModal(); closeSearchPop(); $$('.menu-pop').forEach((p) => { p.hidden = true; }); return;
    }
    if (typing || e.ctrlKey || e.metaKey || e.altKey || !$('#modalRoot').hidden) return;
    if (e.key === '/') { e.preventDefault(); sInput.focus(); }
    if (e.key.toLowerCase() === 'l') { e.preventDefault(); openLog(); }
  });

  /* ===================== rute ===================== */
  route(/^\/$/, viewHome, 'home');
  route(/^\/jelajah$/, viewExplore, 'jelajah');
  route(/^\/trending$/, viewTrending, 'trending');
  route(/^\/penulis\/(.+)$/, viewAuthor, 'jelajah');
  route(/^\/penerbit\/(.+)$/, viewPublisher, 'jelajah');
  route(/^\/buku\/(.+)$/, viewBook, 'jelajah');
  route(/^\/daftar$/, viewLists, 'daftar');
  route(/^\/daftar\/([\w-]+)$/, viewList, 'daftar');
  route(/^\/anggota$/, viewMembers, 'anggota');
  route(/^\/u\/([a-z0-9_.]+)(?:\/([a-z]+))?$/, viewProfile, 'profil');
  route(/^\/ulasan\/([\w-]+)$/, viewReview, '');
  route(/^\/notifikasi$/, viewNotifs, 'notif');
  route(/^\/pengaturan$/, viewSettings, 'profil');
  route(/^\/admin$/, viewAdmin, 'profil');

  /* ===================== ekspor untuk modul lain ===================== */
  window.RB = {
    $, $$, esc, ic, GOOGLE, pad, todayISO, parseDay, ts, MONTHS, MON, fmtDate, num, rupiah, timeAgo, starsText, firstName, norm, paras, hashStr, DAY,
    me, books, getBook, getUser, userByName, shelfOf, entriesOf, reviewLikes, followingIds, followerIds, bookStats, pagesOf, coverVars,
    cover, tile, tileTitle, avatar, followBtn, empty, secHead, skeletonRow, reviewCard,
    route, render, refresh, go, setTitle, onMount, openModal, closeModal, confirmModal, toast, requireAuth, notify,
    ensureBook, bindBookSearch, hydrateCovers, ACTIONS, remember, markDirty: () => { dirty = true; }, renderHeader,
  };

  /* ===================== mulai ===================== */
  async function boot() {
    applyTheme(store.get('ruangbaca.theme') || 'light');
    try { await S.init(); }
    catch (e) {
      console.error(e);
      $('#splash').innerHTML = `<div class="splash-err">${ic('info')}<h2>Gagal terhubung ke server</h2><p>${esc(e.message)}</p><p class="muted sm">Periksa koneksi internet atau pengaturan di <code>js/config.js</code>.</p><button class="btn primary" onclick="location.reload()">Coba lagi</button></div>`;
      return;
    }
    S.on((type, d) => {
      if (type === 'error') toast(`Gagal sinkron: ${esc(d.label)}${d.error && d.error.message ? ' — ' + esc(d.error.message) : ''}`, 'err');
      if (type === 'auth') render(true);
      if (type === 'change' && d.remote) {
        if (d.table === 'messages' && d.type === 'INSERT' && me() && d.row && d.row.recipient_id === me().id && !location.hash.includes(d.row.sender_id)) toast(`${ic('chat')} Pesan baru dari <b>${esc(getUser(d.row.sender_id)?.name || 'seseorang')}</b>`);
        scheduleRemoteRefresh();
      }
    });
    window.addEventListener('hashchange', () => { closeModal(); render(); });
    render();
    $('#splash').classList.add('gone');
    setTimeout(() => $('#splash')?.remove(), 600);
    if (!S.online && !S.storageOk) toast('Browser memblokir penyimpanan lokal — data hanya bertahan selama tab terbuka.', 'muted');
  }
  let rTimer = null;
  function scheduleRemoteRefresh() {
    clearTimeout(rTimer);
    rTimer = setTimeout(() => {
      const busy = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || !$('#modalRoot').hidden || (window.RB.Wrap && window.RB.Wrap.isOpen());
      if (busy) { dirty = true; renderHeader(routes.find(([re]) => re.test(parseHash().path))?.[2] || ''); window.RB.onRemoteWhileBusy?.(); }
      else refresh();
    }, 300);
  }
  window.addEventListener('DOMContentLoaded', boot);
})();
