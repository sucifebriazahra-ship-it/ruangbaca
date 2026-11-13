/* =========================================================================
   ruangbaca — lapisan data
   -------------------------------------------------------------------------
   Dua mode, satu antarmuka:
   • DEMO   : tanpa server. Data & akun disimpan di localStorage browser ini.
   • ONLINE : Supabase (Postgres + Auth + Storage + Realtime). Aktif otomatis
              bila js/config.js diisi. Login email & Google, data dibagi ke
              semua pengguna, update langsung (realtime).
   Semua pembacaan bersifat sinkron dari cache memori; penulisan langsung
   diterapkan ke cache (optimistic) lalu dikirim berurutan ke server.
   ========================================================================= */
(function (global) {
  'use strict';

  const CFG = global.RUANGBACA_CONFIG || {};
  const ONLINE = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const KEY = 'ruangbaca.v2';
  const SESSION = 'ruangbaca.v2.session';

  const TABLES = [
    'profiles', 'books', 'user_books', 'diary_entries', 'review_likes', 'comments',
    'lists', 'list_items', 'list_likes', 'follows', 'favorites', 'reading_goals',
    'notifications', 'listings', 'listing_saves', 'messages',
  ];

  const uuid = () => {
    try { if (global.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* lanjut */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  };
  const now = () => new Date().toISOString();

  // hash kata sandi untuk MODE DEMO saja (mode online memakai Supabase Auth / bcrypt)
  function cyrb53(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
  }
  const hashPassword = (pw) => 'rb2$' + cyrb53('ruangbaca::' + pw, 11) + cyrb53(pw + '::garam', 29);

  const AVATAR_COLORS = ['#5e8c93', '#8e9a4b', '#d6a648', '#d98995', '#7a9bb5', '#a493bf', '#6fa58a', '#c28e6a'];
  const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

  let data = emptyData();
  let auth = [];               // mode demo: akun lokal {id,email,username,password_hash}
  let client = null;
  let chain = Promise.resolve();
  const listeners = new Set();
  let saveTimer = null;
  let storageOk = true;

  function emptyData() { const d = {}; TABLES.forEach((t) => { d[t] = []; }); return d; }
  function emit(type, detail) { listeners.forEach((fn) => { try { fn(type, detail); } catch (e) { console.error(e); } }); }
  function normalize(t, r) {
    if (!r) return r;
    if ('rating' in r && r.rating !== null && r.rating !== undefined) r.rating = Number(r.rating);
    if (t === 'listings' && r.price !== null) r.price = Number(r.price);
    return r;
  }
  const clean = (row) => { const o = {}; Object.keys(row).forEach((k) => { if (k[0] !== '_') o[k] = row[k]; }); return o; };

  /* ---------- persistensi demo ---------- */
  function saveDemo() {
    if (ONLINE || !storageOk) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify({ v: 2, data, auth })); }
      catch (e) { storageOk = false; emit('error', { label: 'Penyimpanan browser penuh atau diblokir', error: e }); }
    }, 60);
  }
  function loadDemo() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const o = JSON.parse(raw); data = Object.assign(emptyData(), o.data || {}); auth = o.auth || []; }
    } catch (e) { storageOk = false; }
    mergeCatalog();
  }
  function mergeCatalog() {
    const have = new Set(data.books.map((b) => b.id));
    (global.RB_CATALOG?.BOOKS || []).forEach((b) => { if (!have.has(b.id)) data.books.push({ ...b, _local: !ONLINE ? false : true }); });
    // sinkronkan info kurasi (peringkat, "lagi ramai", bahasa) bila katalog diperbarui
    const cat = new Map((global.RB_CATALOG?.BOOKS || []).map((b) => [b.id, b]));
    data.books.forEach((b) => {
      const c = cat.get(b.id);
      if (!c) return;
      b.rank = c.rank; b.hot = !!c.hot; b.fav = !!c.fav; b.intl = !!c.intl; b.trend_note = c.trend_note; b.language = b.language || c.language; if (c.cover_url) b.cover_url = c.cover_url;
      if (!b.synopsis && c.synopsis) b.synopsis = c.synopsis;
      if (!b.year && c.year) b.year = c.year;
    });
  }

  /* ---------- Supabase ---------- */
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('Gagal memuat ' + src));
      document.head.append(s);
    });
  }
  async function fetchAll(t) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const { data: rows, error } = await client.from(t).select('*').range(from, from + 999);
      if (error) { console.warn('muat', t, error); break; }
      out.push(...rows.map((r) => normalize(t, r)));
      if (!rows || rows.length < 1000) break;
    }
    return out;
  }
  async function loadAll(only) {
    const list = only || TABLES;
    const res = await Promise.all(list.map((t) => fetchAll(t)));
    list.forEach((t, i) => { data[t] = res[i]; });
    if (list.includes('books')) mergeCatalog();
  }
  function remote(label, fn) {
    if (!client) return;
    chain = chain.then(async () => {
      try {
        const r = await fn();
        if (r && r.error) { console.error(label, r.error); emit('error', { label, error: r.error }); }
      } catch (e) { console.error(label, e); emit('error', { label, error: e }); }
    });
  }
  function ensureBookRemote(bookId) {
    const b = data.books.find((x) => x.id === bookId);
    if (!b || !b._local || !Store.userId) return;
    b._local = false;
    const row = clean({ ...b, created_by: Store.userId });
    delete row.rank;
    remote('Simpan buku', () => client.from('books').insert(row));
  }
  function subscribeRealtime() {
    try {
      client.channel('ruangbaca-live')
        .on('postgres_changes', { event: '*', schema: 'public' }, (p) => {
          const t = p.table;
          if (!data[t]) return;
          if (p.eventType === 'DELETE') {
            const id = p.old && p.old.id;
            data[t] = data[t].filter((r) => r.id !== id);
          } else {
            const row = normalize(t, { ...p.new });
            const i = data[t].findIndex((r) => r.id === row.id);
            if (i >= 0) data[t][i] = { ...data[t][i], ...row, _local: false }; else data[t].push(row);
          }
          emit('change', { table: t, type: p.eventType, row: p.new || p.old, remote: true });
        })
        .subscribe();
    } catch (e) { console.warn('realtime', e); }
  }

  /* ---------- kompres gambar ---------- */
  function compress(file, max = 1200, quality = 0.82) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? res({ blob: b, dataUrl: c.toDataURL('image/jpeg', quality) }) : rej(new Error('Gagal memproses gambar'))), 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('File bukan gambar yang valid')); };
      img.src = url;
    });
  }

  /* =================== API publik =================== */
  const Store = {
    mode: ONLINE ? 'online' : 'demo',
    online: ONLINE,
    userId: null,
    uuid, now, USERNAME_RE, AVATAR_COLORS,

    async init() {
      if (ONLINE) {
        await loadScript(CDN);
        client = global.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
        const { data: s } = await client.auth.getSession();
        this.userId = s && s.session ? s.session.user.id : null;
        await loadAll();
        client.auth.onAuthStateChange(async (event, session) => {
          const id = session ? session.user.id : null;
          if (id === this.userId && event !== 'USER_UPDATED') return;
          this.userId = id;
          await loadAll(['profiles', 'notifications', 'messages', 'reading_goals']);
          emit('auth', { event });
        });
        subscribeRealtime();
      } else {
        loadDemo();
        const id = (() => { try { return localStorage.getItem(SESSION); } catch (e) { return null; } })();
        this.userId = id && data.profiles.some((p) => p.id === id) ? id : null;
      }
    },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    /* ----- baca ----- */
    table(t) { return data[t]; },
    get(t, id) { return data[t].find((r) => r.id === id); },
    first(t, fn) { return data[t].find(fn); },
    where(t, fn) { return data[t].filter(fn); },
    get me() { return this.userId ? data.profiles.find((p) => p.id === this.userId) || null : null; },

    /* ----- tulis ----- */
    insert(t, row) {
      const r = { id: uuid(), ...(t === 'books' ? {} : { created_at: now() }), ...row };
      data[t].push(r);
      if (ONLINE) {
        if (t === 'books') { r._local = !this.userId; if (this.userId) { r.created_by = this.userId; const row2 = clean(r); delete row2.rank; remote('Simpan buku', () => client.from('books').insert(row2)); } }
        else {
          if (r.book_id) ensureBookRemote(r.book_id);
          remote('Simpan ' + t, () => client.from(t).insert(clean(r)));
        }
      } else saveDemo();
      emit('change', { table: t, type: 'INSERT', row: r });
      return r;
    },
    update(t, id, patch) {
      const r = this.get(t, id);
      if (!r) return null;
      Object.assign(r, patch);
      if (ONLINE) remote('Perbarui ' + t, () => client.from(t).update(clean(patch)).eq('id', id));
      else saveDemo();
      emit('change', { table: t, type: 'UPDATE', row: r });
      return r;
    },
    remove(t, fn) {
      const gone = data[t].filter(fn);
      if (!gone.length) return 0;
      const ids = new Set(gone.map((r) => r.id));
      data[t] = data[t].filter((r) => !ids.has(r.id));
      if (ONLINE) remote('Hapus ' + t, () => client.from(t).delete().in('id', [...ids]));
      else saveDemo();
      emit('change', { table: t, type: 'DELETE' });
      return gone.length;
    },
    /** tambah buku dari katalog dunia (tanpa duplikat) */
    upsertBook(book) {
      const ex = this.get('books', book.id);
      if (ex) { Object.keys(book).forEach((k) => { if ((ex[k] === null || ex[k] === undefined || ex[k] === '') && book[k]) ex[k] = book[k]; }); saveDemo(); return ex; }
      return this.insert('books', { ...book, created_at: now() });
    },
    flush() { return chain; },

    /* ----- autentikasi ----- */
    async signUp({ email, password, username, name }) {
      username = (username || '').trim().toLowerCase();
      email = (email || '').trim().toLowerCase();
      if (!USERNAME_RE.test(username)) return { error: 'Username 3–20 karakter: huruf kecil, angka, _ atau .' };
      if (data.profiles.some((p) => p.username === username)) return { error: 'Username sudah dipakai.' };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Format email tidak valid.' };
      if ((password || '').length < 6) return { error: 'Kata sandi minimal 6 karakter.' };
      if (ONLINE) {
        const { data: d, error } = await client.auth.signUp({
          email, password,
          options: { data: { username, name }, emailRedirectTo: location.href.split('#')[0] },
        });
        if (error) return { error: translateAuthError(error.message) };
        if (!d.session) return { needConfirm: true };
        this.userId = d.session.user.id;
        await loadAll(['profiles', 'reading_goals', 'notifications', 'messages']);
        return { ok: true };
      }
      if (auth.some((a) => a.email === email)) return { error: 'Email sudah terdaftar.' };
      const id = uuid();
      auth.push({ id, email, username, password_hash: hashPassword(password), provider: 'email', created_at: now(), last_sign_in_at: now() });
      data.profiles.push({
        id, username, name: (name || username).trim(), bio: '', location: '', website: '',
        avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)], avatar_url: null,
        provider: 'email', is_admin: data.profiles.length === 0, created_at: now(),
      });
      data.reading_goals.push({ id: uuid(), user_id: id, year: new Date().getFullYear(), target: 12 });
      this.userId = id;
      try { localStorage.setItem(SESSION, id); } catch (e) { /* abaikan */ }
      saveDemo();
      return { ok: true };
    },
    async signIn({ identifier, password }) {
      identifier = (identifier || '').trim().toLowerCase().replace(/^@/, '');
      if (ONLINE) {
        if (!identifier.includes('@')) return { error: 'Di mode online, masuk menggunakan email.' };
        const { data: d, error } = await client.auth.signInWithPassword({ email: identifier, password });
        if (error) return { error: translateAuthError(error.message) };
        this.userId = d.session.user.id;
        await loadAll(['profiles', 'notifications', 'messages', 'reading_goals']);
        return { ok: true };
      }
      const a = auth.find((x) => x.email === identifier || x.username === identifier);
      if (!a || a.password_hash !== hashPassword(password)) return { error: 'Email/username atau kata sandi salah.' };
      a.last_sign_in_at = now();
      this.userId = a.id;
      try { localStorage.setItem(SESSION, a.id); } catch (e) { /* abaikan */ }
      saveDemo();
      return { ok: true };
    },
    async signInGoogle() {
      if (!ONLINE) return { error: 'Login Google aktif setelah ruangbaca dihubungkan ke Supabase (lihat README → Mode Online).' };
      const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href.split('#')[0] } });
      return error ? { error: error.message } : { ok: true };
    },
    async signOut() {
      if (ONLINE) await client.auth.signOut();
      else { try { localStorage.removeItem(SESSION); } catch (e) { /* abaikan */ } }
      this.userId = null;
      if (ONLINE) { data.notifications = []; data.messages = []; }
    },
    async changePassword(oldPw, newPw) {
      if (newPw.length < 6) return { error: 'Kata sandi baru minimal 6 karakter.' };
      if (ONLINE) {
        const { error } = await client.auth.updateUser({ password: newPw });
        return error ? { error: translateAuthError(error.message) } : { ok: true };
      }
      const a = auth.find((x) => x.id === this.userId);
      if (!a || a.password_hash !== hashPassword(oldPw)) return { error: 'Kata sandi lama salah.' };
      a.password_hash = hashPassword(newPw); saveDemo();
      return { ok: true };
    },
    changeUsername(username) {
      username = username.trim().toLowerCase();
      if (!USERNAME_RE.test(username)) return { error: 'Username 3–20 karakter: huruf kecil, angka, _ atau .' };
      if (data.profiles.some((p) => p.username === username && p.id !== this.userId)) return { error: 'Username sudah dipakai.' };
      if (!ONLINE) { const a = auth.find((x) => x.id === this.userId); if (a) a.username = username; }
      this.update('profiles', this.userId, { username });
      return { ok: true };
    },
    myEmail() { if (ONLINE) return null; const a = auth.find((x) => x.id === this.userId); return a ? a.email : null; },

    /* ----- admin ----- */
    async adminUsers() {
      if (ONLINE) {
        const { data: rows, error } = await client.rpc('admin_list_users');
        if (error) return { error: error.message };
        return { rows };
      }
      return { rows: auth.map((a) => ({ id: a.id, email: a.email, provider: a.provider, created_at: a.created_at, last_sign_in_at: a.last_sign_in_at })) };
    },

    /* ----- unggah gambar ----- */
    async uploadImage(file, folder = 'umum') {
      if (!file || !/^image\//.test(file.type)) throw new Error('Pilih file gambar (JPG/PNG/WebP).');
      if (ONLINE) {
        const { blob } = await compress(file, 1400, 0.85);
        const path = `${this.userId}/${folder}/${uuid()}.jpg`;
        const { error } = await client.storage.from('media').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
        if (error) throw new Error(error.message);
        return client.storage.from('media').getPublicUrl(path).data.publicUrl;
      }
      const { dataUrl } = await compress(file, 900, 0.72);
      return dataUrl;
    },

    /* ----- utilitas demo ----- */
    dump() { return JSON.stringify({ mode: this.mode, data: Object.fromEntries(TABLES.map((t) => [t, data[t].map(clean)])) }, null, 2); },
    resetDemo() { if (ONLINE) return; data = emptyData(); auth = []; mergeCatalog(); this.userId = null; try { localStorage.removeItem(KEY); localStorage.removeItem(SESSION); } catch (e) { /* abaikan */ } },
    get storageOk() { return storageOk; },
  };

  function translateAuthError(m) {
    const map = [
      [/invalid login credentials/i, 'Email atau kata sandi salah.'],
      [/email not confirmed/i, 'Email belum dikonfirmasi. Cek kotak masuk email kamu.'],
      [/already registered|already been registered/i, 'Email sudah terdaftar.'],
      [/password should be at least/i, 'Kata sandi terlalu pendek.'],
      [/rate limit/i, 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.'],
    ];
    for (const [re, t] of map) if (re.test(m)) return t;
    return m;
  }

  global.Store = Store;
})(window);
