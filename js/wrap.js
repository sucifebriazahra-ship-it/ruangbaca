/* =========================================================================
   ruangbaca — Reading Wrap (ala Spotify Wrapped), bulanan & tahunan
   Cerita layar penuh: total buku, halaman, genre favorit, genre yang paling
   sering diulas, penulis favorit, buku terbaik, ritme baca, ulasan, persona,
   dan kartu ringkasan yang bisa diunduh / dibagikan.
   ========================================================================= */
(() => {
  'use strict';
  const RB = window.RB, S = window.Store;
  const { $, $$, esc, ic, MONTHS, MON, num, parseDay, starsText, getBook, getUser, me, pagesOf, cover, entriesOf, reviewLikes } = RB;

  const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const PERSONA = {
    'Romansa': ['Si Hati Lembut', 'Kamu percaya setiap cerita layak berakhir bahagia — atau setidaknya membuatmu menangis dengan indah.', '💗'],
    'Fantasi': ['Penjelajah Dunia Lain', 'Peta imajiner, naga, dan sihir adalah rumah keduamu.', '🐉'],
    'Fiksi Ilmiah': ['Navigator Masa Depan', 'Kamu membaca tentang esok hari sebelum ia tiba.', '🚀'],
    'Misteri & Thriller': ['Detektif Tengah Malam', 'Kamu tak bisa tidur sebelum tahu siapa pelakunya.', '🔍'],
    'Horor': ['Pemberani Berselimut', 'Takut, tapi tetap membalik halaman berikutnya.', '🕯️'],
    'Sastra Indonesia': ['Penjaga Kata Nusantara', 'Kamu merawat cerita-cerita dari tanah sendiri.', '🌾'],
    'Sastra Dunia': ['Pengelana Lintas Bahasa', 'Paspormu penuh cap dari halaman-halaman dunia.', '🌏'],
    'Klasik': ['Jiwa Klasik', 'Kamu tahu kalimat yang baik tak pernah usang.', '🕰️'],
    'Young Adult': ['Selamanya Tujuh Belas', 'Debar pertama, persahabatan, dan pencarian jati diri — selalu menarik.', '🌟'],
    'Fiksi Sejarah': ['Penjelajah Waktu', 'Kamu berjalan-jalan di masa lalu lewat mata para tokohnya.', '📜'],
    'Pengembangan Diri': ['Arsitek Kebiasaan', '1% lebih baik setiap hari — dan kamu benar-benar menjalaninya.', '🌱'],
    'Psikologi': ['Pembaca Pikiran', 'Kamu ingin tahu kenapa manusia melakukan apa yang mereka lakukan.', '🧠'],
    'Bisnis & Keuangan': ['Ahli Strategi', 'Angka, keputusan, dan peluang adalah teman membacamu.', '📈'],
    'Filsafat': ['Perenung Teras', 'Satu kalimat bisa kamu pikirkan selama seminggu.', '🏛️'],
    'Memoar': ['Pendengar Kisah Nyata', 'Hidup orang lain adalah guru terbaikmu.', '🎙️'],
    'Sejarah': ['Kurator Zaman', 'Kamu mengumpulkan peristiwa seperti mengoleksi perangko.', '🗺️'],
    'Sains': ['Si Penasaran', 'Pertanyaan “kenapa?” tidak pernah habis di kepalamu.', '🔭'],
    'Puisi': ['Penyair Diam-Diam', 'Kamu membaca pelan-pelan, mencicipi setiap kata.', '🪶'],
    'Komik & Manga': ['Pemburu Panel', 'Setiap panel adalah petualangan baru.', '💥'],
    'Fiksi': ['Pencerita Sejati', 'Kamu jatuh cinta pada cerita, apa pun bentuknya.', '📖'],
    'Non-Fiksi': ['Pencari Fakta', 'Kamu membaca untuk memahami dunia apa adanya.', '🧭'],
  };

  /* ---------- statistik periode (dipakai juga di halaman Statistik profil) ---------- */
  function periodStats(uid, year, month = null) {
    const es = entriesOf(uid).filter((e) => { const d = parseDay(e.read_date); return d.getFullYear() === year && (month === null || d.getMonth() === month); })
      .filter((e) => getBook(e.book_id)).sort((a, b) => a.read_date.localeCompare(b.read_date));
    const bs = es.map((e) => getBook(e.book_id));
    const pages = bs.reduce((s, b) => s + (pagesOf(b) || 0), 0);
    const rated = es.filter((e) => e.rating);
    const avg = rated.length ? rated.reduce((s, e) => s + e.rating, 0) / rated.length : 0;
    const months = Array(12).fill(0), weekdays = Array(7).fill(0);
    const daysInMonth = month !== null ? new Date(year, month + 1, 0).getDate() : 0;
    const weeks = Array(month !== null ? Math.ceil(daysInMonth / 7) : 0).fill(0);
    es.forEach((e) => { const d = parseDay(e.read_date); months[d.getMonth()]++; weekdays[d.getDay()]++; if (month !== null) weeks[Math.min(weeks.length - 1, Math.floor((d.getDate() - 1) / 7))]++; });
    const g = {}, rg = {}, a = {};
    es.forEach((e) => {
      const b = getBook(e.book_id);
      (b.genres || []).forEach((x) => {
        g[x] = (g[x] || 0) + 1 + (e.review ? 1 : 0) + (e.rating >= 4 ? 0.5 : 0) + (e.liked ? 0.5 : 0);
        if (e.review) rg[x] = (rg[x] || 0) + 1;
      });
      if (!a[b.author]) a[b.author] = { n: 0, r: 0, rc: 0, books: [] };
      a[b.author].n++; if (e.rating) { a[b.author].r += e.rating; a[b.author].rc++; }
      if (!a[b.author].books.includes(b)) a[b.author].books.push(b);
    });
    const genres = Object.entries(g).sort((x, y) => y[1] - x[1]);
    const reviewGenres = Object.entries(rg).sort((x, y) => y[1] - x[1]);
    const authorsFull = Object.entries(a).sort((x, y) => y[1].n - x[1].n || (y[1].rc ? y[1].r / y[1].rc : 0) - (x[1].rc ? x[1].r / x[1].rc : 0));
    const authors = authorsFull.map(([k, v]) => [k, v.n, v.books]);
    const hist = Array(10).fill(0); rated.forEach((e) => { hist[Math.round(e.rating * 2) - 1]++; });
    const topE = rated.slice().sort((x, y) => y.rating - x.rating || (y.liked ? 1 : 0) - (x.liked ? 1 : 0) || y.read_date.localeCompare(x.read_date))[0];
    const reviews = es.filter((e) => e.review);
    const words = reviews.reduce((s, e) => s + e.review.split(/\s+/).filter(Boolean).length, 0);
    const likesReceived = reviews.reduce((s, e) => s + reviewLikes(e.id).length, 0);
    const bestReview = reviews.slice().sort((x, y) => reviewLikes(y.id).length - reviewLikes(x.id).length || y.review.length - x.review.length)[0];
    const longest = bs.slice().sort((x, y) => (pagesOf(y) || 0) - (pagesOf(x) || 0))[0];
    const topGenre = genres[0] ? genres[0][0] : null;
    return {
      year, month, es, books: bs, count: es.length, pages, hours: Math.round(pages / 40), avg, months, weekdays, weeks, genres, reviewGenres, authors, hist,
      top: topE ? { b: getBook(topE.book_id), r: topE.rating, e: topE } : null,
      reviews: reviews.length, words, likesReceived, bestReview, longest: longest && pagesOf(longest) ? longest : null,
      rereads: es.filter((e) => e.is_reread).length, liked: es.filter((e) => e.liked).length,
      distinctAuthors: Object.keys(a).length, persona: PERSONA[topGenre] || ['Pembaca Serba Bisa', 'Selera bacamu luas dan penuh kejutan.', '📚'], topGenre,
      busiestMonth: months.indexOf(Math.max(...months)), busiestDay: weekdays.indexOf(Math.max(...weekdays)),
    };
  }
  RB.periodStats = periodStats;

  /* ---------- halaman hub Wrap ---------- */
  function viewWrapHub(_, q) {
    const m = me();
    const target = q.u ? RB.userByName(q.u) : m;
    if (!target) { if (!m) { RB.onMount(() => RB.ACTIONS['open-auth']({ dataset: { tab: 'login' } })); return `<section class="wrap">${RB.empty('Masuk untuk melihat Reading Wrap kamu.', '', '', 'gift')}</section>`; } return RB.empty('Pengguna tidak ditemukan.', '#/', 'Beranda', 'gift'); }
    const own = m && m.id === target.id;
    RB.setTitle(own ? 'Reading Wrap' : `Wrap ${target.name}`);
    const now = new Date();
    const all = entriesOf(target.id);
    const years = [...new Set([now.getFullYear(), ...all.map((e) => Number(e.read_date.slice(0, 4)))])].sort((a, b) => b - a);
    const year = Number(q.y) || now.getFullYear();
    const ys = periodStats(target.id, year, null);
    const uq = q.u ? `&u=${encodeURIComponent(q.u)}` : '';
    return `
    <section class="wrap-hub-head">
      <div class="wrap whh-inner">
        <p class="eyebrow">${ic('gift')} Reading Wrap</p>
        <h1 class="display">${own ? 'Perjalanan bacaanmu,' : `Perjalanan bacaan ${esc(RB.firstName(target))},`}<br><em>dirangkum.</em></h1>
        <p class="muted">Genre yang lagi ${own ? 'kamu' : 'dia'} suka, penulis favorit, buku terbaik, dan persona baca — per bulan dan per tahun.</p>
        <div class="chips">${years.map((y) => `<a class="chip ${y === year ? 'on' : ''}" href="#/wrap?y=${y}${uq}">${y}</a>`).join('')}</div>
      </div>
      <div class="whh-blobs" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    </section>
    <section class="wrap">
      <button class="wrap-year ${ys.count ? '' : 'disabled'}" ${ys.count ? `data-action="wrap-open" data-user="${target.id}" data-year="${year}"` : 'disabled'}>
        <span class="wy-text"><small>Wrap tahunan</small><b>${year}</b><span>${ys.count ? `${ys.count} buku · ${num(ys.pages)} halaman · ${ys.genres[0] ? esc(ys.genres[0][0]) : ''}` : 'Belum ada catatan di tahun ini'}</span></span>
        <span class="wy-covers">${ys.books.slice(-5).map((b) => cover(b, { link: false })).join('')}</span>
        ${ys.count ? `<span class="wy-play">${ic('right')}</span>` : ''}
      </button>
      <h2 class="sec-title wm-title">${ic('calendar')}Wrap bulanan ${year}</h2>
      <div class="wrap-months">${MONTHS.map((name, i) => {
        const future = year === now.getFullYear() && i > now.getMonth();
        const st = future ? null : periodStats(target.id, year, i);
        const n = st ? st.count : 0;
        return `<button class="wrap-pick ${n ? 'has' : ''} ${year === now.getFullYear() && i === now.getMonth() ? 'current' : ''}" ${n ? `data-action="wrap-open" data-user="${target.id}" data-year="${year}" data-month="${i}"` : 'disabled'} style="--i:${i}">
          <span class="wp-name">${name}</span>
          <span class="wp-count">${future ? '—' : n ? `<b>${n}</b> buku` : 'kosong'}</span>
          ${n ? `<span class="wp-covers">${st.books.slice(0, 3).map((b) => cover(b, { link: false, size: 'xs' })).join('')}</span><span class="wp-genre">${st.genres[0] ? esc(st.genres[0][0]) : ''}</span>` : ''}
        </button>`;
      }).join('')}</div>
      ${own && !all.length ? `<div class="empty">${ic('gift')}<p>Wrap muncul setelah kamu mencatat buku yang selesai dibaca. Yuk mulai!</p><button class="btn primary sm" data-action="open-log">${ic('plus')}Catat bacaan</button></div>` : ''}
    </section>`;
  }

  /* ---------- pemutar cerita ---------- */
  let player = null;
  const BG = [
    'linear-gradient(160deg,#e0f2f4 0%,#bad6da 100%)',
    'linear-gradient(160deg,#ffdbdf 0%,#fff1f2 60%,#ffe797 140%)',
    'linear-gradient(165deg,#fff6d5 0%,#ffe797 100%)',
    'linear-gradient(160deg,#f2f3d6 0%,#dddd7b 120%)',
    'linear-gradient(160deg,#e0f2f4 0%,#ffdbdf 100%)',
    'linear-gradient(170deg,#bad6da 0%,#e0f2f4 100%)',
    'linear-gradient(160deg,#ffe797 -20%,#ffdbdf 100%)',
    'linear-gradient(160deg,#dddd7b -30%,#e0f2f4 90%)',
    'linear-gradient(160deg,#2f4a50 0%,#5e8c93 100%)',
    'linear-gradient(160deg,#e0f2f4 0%,#ffdbdf 45%,#ffe797 100%)',
  ];

  function buildSlides(st, user) {
    const period = st.month === null ? `${st.year}` : `${MONTHS[st.month]} ${st.year}`;
    const name = esc(RB.firstName(user));
    const own = me() && me().id === user.id;
    const you = own ? 'Kamu' : name;
    const slides = [];
    const coverWall = st.books.slice(-14).map((b, i) => `<span class="wc" style="--i:${i}">${cover(b, { link: false })}</span>`).join('');

    slides.push(`<div class="ws ws-intro"><div class="w-in d1 w-logo">${ic('book')} ruangbaca</div>
      <p class="w-in d2 w-kicker">Reading Wrap</p><h2 class="w-in d3 w-huge">${period}</h2>
      <p class="w-in d4 w-sub">Hai ${name}! Yuk lihat perjalanan bacaan${own ? 'mu' : ''} ${st.month === null ? 'setahun ini' : 'bulan ini'} ✨</p>
      <div class="w-in d5 w-wall">${coverWall}</div></div>`);

    slides.push(`<div class="ws"><p class="w-in d1 w-kicker">${st.month === null ? 'Tahun ini' : 'Bulan ini'} ${you.toLowerCase() === 'kamu' ? 'kamu' : name} menyelesaikan</p>
      <div class="w-in d2 w-count"><b data-count="${st.count}">0</b><span>buku</span></div>
      <div class="w-in d3 w-fan">${st.books.slice(0, 7).map((b, i) => `<span style="--i:${i};--n:${Math.min(7, st.books.length)}">${cover(b, { link: false })}</span>`).join('')}</div>
      <p class="w-in d4 w-sub">${st.liked ? `${st.liked} di antaranya bikin ${own ? 'kamu' : name} jatuh hati ♥` : 'Setiap halaman berarti.'}${st.rereads ? ` ${st.rereads} kali baca ulang.` : ''}</p></div>`);

    slides.push(`<div class="ws"><p class="w-in d1 w-kicker">Totalnya</p>
      <div class="w-in d2 w-count"><b data-count="${st.pages}">0</b><span>halaman</span></div>
      <p class="w-in d3 w-big">≈ <b data-count="${st.hours}">0</b> jam membaca</p>
      <p class="w-in d4 w-sub">${st.hours >= 2 ? `Setara menonton sekitar ${Math.max(1, Math.round(st.hours / 2))} film bioskop 🎬 — tapi jauh lebih seru.` : 'Sedikit demi sedikit, lama-lama jadi bukit 📚'}</p>
      ${st.longest ? `<p class="w-in d5 w-note">Buku paling tebal: <b>${esc(st.longest.title)}</b> (${num(pagesOf(st.longest))} hal.)</p>` : ''}</div>`);

    if (st.genres.length) {
      const tot = st.genres.reduce((s, g) => s + g[1], 0);
      slides.push(`<div class="ws"><p class="w-in d1 w-kicker">Genre yang lagi ${own ? 'kamu' : name} suka</p>
        <h2 class="w-in d2 w-title">${esc(st.genres[0][0])}</h2>
        <div class="w-bars">${st.genres.slice(0, 5).map(([g, v], i) => `<div class="w-in d${3 + i} wb"><span class="wb-l">${i + 1}. ${esc(g)}</span><span class="wb-t"><i style="--w:${Math.round((v / st.genres[0][1]) * 100)}%"></i></span><span class="wb-v">${Math.round((v / tot) * 100)}%</span></div>`).join('')}</div>
        ${st.reviewGenres.length ? `<p class="w-in d8 w-note">${ic('message')} Genre yang paling sering ${own ? 'kamu' : name} ulas: <b>${esc(st.reviewGenres[0][0])}</b></p>` : ''}</div>`);
    }

    if (st.authors.length) {
      const [top, n, bks] = st.authors[0];
      slides.push(`<div class="ws"><p class="w-in d1 w-kicker">Penulis favorit${own ? 'mu' : ''}</p>
        <h2 class="w-in d2 w-title">${esc(top)}</h2>
        <p class="w-in d3 w-sub">${n} buku ${st.month === null ? 'tahun ini' : 'bulan ini'}</p>
        <div class="w-in d4 w-row">${bks.slice(0, 4).map((b) => cover(b, { link: false })).join('')}</div>
        ${st.authors.length > 1 ? `<ol class="w-in d5 w-list">${st.authors.slice(1, 5).map(([a, c]) => `<li><b>${esc(a)}</b><span>${c} buku</span></li>`).join('')}</ol>` : ''}
        <p class="w-in d6 w-note">${st.distinctAuthors} penulis berbeda menemani${own ? 'mu' : ''}.</p></div>`);
    }

    if (st.top) {
      const ex = st.top.e.review ? st.top.e.review.slice(0, 160) + (st.top.e.review.length > 160 ? '…' : '') : '';
      slides.push(`<div class="ws ws-top"><p class="w-in d1 w-kicker">Bintang ${st.month === null ? 'tahun' : 'bulan'} ini</p>
        <div class="w-in d2 w-hero-cover">${cover(st.top.b, { link: false })}</div>
        <h2 class="w-in d3 w-title sm">${esc(st.top.b.title)}</h2><p class="w-in d4 w-sub">${esc(st.top.b.author)}</p>
        <p class="w-in d5 w-stars">${starsText(st.top.r)}</p>
        ${ex ? `<blockquote class="w-in d6">“${esc(ex)}”</blockquote>` : ''}</div>`);
    }

    if (st.month === null) {
      const max = Math.max(1, ...st.months);
      slides.push(`<div class="ws"><p class="w-in d1 w-kicker">Ritme baca${own ? 'mu' : ''}</p>
        <h2 class="w-in d2 w-title sm">Paling rajin di bulan ${MONTHS[st.busiestMonth]}</h2>
        <div class="w-in d3 w-chart">${st.months.map((v, i) => `<span class="${i === st.busiestMonth ? 'hi' : ''}" style="--h:${(v / max).toFixed(2)};--i:${i}"><i>${v || ''}</i><small>${MON[i]}</small></span>`).join('')}</div>
        <p class="w-in d4 w-note">Hari favorit menyelesaikan buku: <b>${DAYS[st.busiestDay]}</b></p></div>`);
    } else {
      const max = Math.max(1, ...st.weeks);
      slides.push(`<div class="ws"><p class="w-in d1 w-kicker">Ritme baca${own ? 'mu' : ''}</p>
        <h2 class="w-in d2 w-title sm">Hari favorit: ${DAYS[st.busiestDay]}</h2>
        <div class="w-in d3 w-chart weeks">${st.weeks.map((v, i) => `<span class="${v === max && v ? 'hi' : ''}" style="--h:${(v / max).toFixed(2)};--i:${i}"><i>${v || ''}</i><small>Minggu ${i + 1}</small></span>`).join('')}</div>
        <p class="w-in d4 w-note">${st.avg ? `Rata-rata rating: <b>${st.avg.toFixed(1)} ★</b>` : 'Belum ada rating bulan ini.'}</p></div>`);
    }

    if (st.reviews) {
      slides.push(`<div class="ws"><p class="w-in d1 w-kicker">${you} tidak hanya membaca — ${own ? 'kamu' : 'dia'} bercerita</p>
        <div class="w-in d2 w-count"><b data-count="${st.reviews}">0</b><span>ulasan</span></div>
        <div class="w-in d3 w-trio"><span><b data-count="${st.words}">0</b><small>kata ditulis</small></span><span><b data-count="${st.likesReceived}">0</b><small>suka diterima</small></span></div>
        ${st.bestReview ? `<blockquote class="w-in d4">“${esc(st.bestReview.review.slice(0, 150))}${st.bestReview.review.length > 150 ? '…' : ''}”<cite>— tentang ${esc(getBook(st.bestReview.book_id).title)}</cite></blockquote>` : ''}</div>`);
    }

    slides.push(`<div class="ws ws-persona"><p class="w-in d1 w-kicker">Persona baca${own ? 'mu' : ''}</p>
      <div class="w-in d2 w-emoji">${st.persona[2]}</div>
      <h2 class="w-in d3 w-title">${st.persona[0]}</h2>
      <p class="w-in d4 w-sub">${st.persona[1]}</p>
      ${st.genres.length > 1 ? `<p class="w-in d5 w-note">dengan sentuhan ${esc(st.genres[1][0])}${st.genres[2] ? ' & ' + esc(st.genres[2][0]) : ''}</p>` : ''}</div>`);

    slides.push(`<div class="ws ws-summary"><div class="w-card w-in d1">
        <div class="wcard-head">${ic('book')} ruangbaca · Wrap ${period}</div>
        <div class="wcard-user">${RB.avatar(user, 'md', false)}<b>${esc(user.name)}</b></div>
        <div class="wcard-covers">${st.books.slice(0, 5).map((b) => cover(b, { link: false })).join('')}</div>
        <div class="wcard-grid">
          <span><small>Buku</small><b>${st.count}</b></span><span><small>Halaman</small><b>${num(st.pages)}</b></span>
          <span><small>Genre teratas</small><b>${st.genres[0] ? esc(st.genres[0][0]) : '–'}</b></span><span><small>Penulis favorit</small><b>${st.authors[0] ? esc(st.authors[0][0]) : '–'}</b></span>
          <span><small>Rating rata-rata</small><b>${st.avg ? st.avg.toFixed(1) + ' ★' : '–'}</b></span><span><small>Persona</small><b>${st.persona[0]}</b></span>
        </div></div>
      <div class="w-in d3 w-actions"><button class="btn primary" data-wrap="download">${ic('download')}Unduh gambar</button><button class="btn ghost" data-wrap="share">${ic('link')}Bagikan</button><button class="btn ghost" data-wrap="close">Selesai</button></div></div>`);
    return slides;
  }

  function open({ userId, year, month = null }) {
    const user = getUser(userId);
    if (!user) return;
    const st = periodStats(userId, year, month);
    if (!st.count) { RB.toast('Belum ada catatan di periode ini.', 'muted'); return; }
    const slides = buildSlides(st, user);
    const root = document.createElement('div');
    root.className = 'wrap-player';
    root.innerHTML = `<div class="wp-stage">
        <div class="wp-bars">${slides.map(() => '<span><i></i></span>').join('')}</div>
        <button class="wp-close" data-wrap="close" aria-label="Tutup">${ic('x')}</button>
        <button class="wp-pause" data-wrap="pause" aria-label="Jeda"><span>❚❚</span></button>
        <div class="wp-slides">${slides.map((s, i) => `<section class="wp-slide" style="background:${BG[i % BG.length]}" data-i="${i}">${s}</section>`).join('')}</div>
        <button class="wp-nav prev" data-wrap="prev" aria-label="Sebelumnya"></button><button class="wp-nav next" data-wrap="next" aria-label="Berikutnya"></button>
        <div class="wp-hint">Ketuk kanan/kiri untuk pindah · tahan untuk jeda</div>
      </div>`;
    document.body.append(root);
    document.body.classList.add('no-scroll');
    RB.hydrateCovers(root);
    requestAnimationFrame(() => root.classList.add('open'));
    const DUR = 6500;
    player = { root, i: -1, n: slides.length, t0: 0, paused: false, elapsed: 0, raf: 0, st, user };
    const bars = $$('.wp-bars span i', root);
    const show = (i) => {
      if (i < 0) i = 0;
      if (i >= player.n) { close(); return; }
      player.i = i; player.elapsed = 0; player.t0 = performance.now();
      $$('.wp-slide', root).forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.toggle('past', k < i); });
      bars.forEach((b, k) => { b.style.width = k < i ? '100%' : '0%'; });
      $$('.wp-slide.on [data-count]', root).forEach(countUp);
      if (i === player.n - 1) window.FX.confetti();
    };
    const tick = (t) => {
      if (!player) return;
      if (!player.paused) {
        const p = (player.elapsed + (t - player.t0)) / DUR;
        bars[player.i].style.width = Math.min(100, p * 100) + '%';
        if (p >= 1 && player.i < player.n - 1) show(player.i + 1);
      }
      player.raf = requestAnimationFrame(tick);
    };
    const pause = (v) => { if (!player) return; if (v && !player.paused) { player.elapsed += performance.now() - player.t0; player.paused = true; } else if (!v && player.paused) { player.t0 = performance.now(); player.paused = false; } root.classList.toggle('paused', player.paused); };
    player.show = show; player.pause = pause;
    let holdT = null, held = false;
    root.addEventListener('pointerdown', (e) => { if (e.target.closest('[data-wrap="download"],[data-wrap="share"],[data-wrap="close"],[data-wrap="pause"]')) return; held = false; holdT = setTimeout(() => { held = true; pause(true); }, 260); });
    root.addEventListener('pointerup', () => { clearTimeout(holdT); if (held) pause(false); });
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-wrap]');
      if (!a || held) { held = false; return; }
      const k = a.dataset.wrap;
      if (k === 'close') close();
      if (k === 'next') show(player.i + 1);
      if (k === 'prev') show(player.i - 1);
      if (k === 'pause') pause(!player.paused);
      if (k === 'download') shareImage(false);
      if (k === 'share') shareImage(true);
    });
    show(0);
    player.raf = requestAnimationFrame(tick);
  }
  function close() {
    if (!player) return;
    cancelAnimationFrame(player.raf);
    const r = player.root;
    r.classList.remove('open');
    setTimeout(() => r.remove(), 300);
    document.body.classList.remove('no-scroll');
    player = null;
  }
  function countUp(el) {
    const target = Number(el.dataset.count) || 0;
    const t0 = performance.now(), dur = 1100;
    const step = (t) => { const p = Math.min(1, (t - t0) / dur); el.textContent = num(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  document.addEventListener('keydown', (e) => {
    if (!player) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') player.show(player.i + 1);
    if (e.key === 'ArrowLeft') player.show(player.i - 1);
    if (e.key === ' ') { e.preventDefault(); player.pause(!player.paused); }
  });

  /* ---------- kartu gambar (1080×1920) ---------- */
  function loadImg(src) {
    return new Promise((res) => {
      if (!src) return res(null);
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => res(im); im.onerror = () => res(null);
      im.src = src;
      setTimeout(() => res(null), 5000);
    });
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function wrapText(ctx, text, x, y, maxW, lh, maxLines = 2) {
    const words = String(text).split(' '); let line = '', lines = 0;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(lines === maxLines - 1 ? line + '…' : line, x, y); line = words[i]; y += lh; lines++; if (lines >= maxLines) return y; }
      else line = test;
    }
    ctx.fillText(line, x, y); return y + lh;
  }
  async function renderCard() {
    const { st, user } = player;
    const W = 1080, H = 1920;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    try { await document.fonts.ready; } catch (e) { /* abaikan */ }
    const serif = '"Fraunces", Georgia, serif', sans = '"Plus Jakarta Sans", system-ui, sans-serif';
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#e0f2f4'); g.addColorStop(0.5, '#ffdbdf'); g.addColorStop(1, '#ffe797');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    [['#bad6da', 900, 260, 260], ['#dddd7b', 140, 1500, 220], ['#f791a9', 980, 1700, 180]].forEach(([col, x, y, r]) => { ctx.globalAlpha = 0.35; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
    const ink = '#26343b';
    ctx.fillStyle = ink; ctx.font = `600 44px ${serif}`; ctx.fillText('ruangbaca', 90, 140);
    ctx.font = `700 30px ${sans}`; ctx.fillStyle = '#4e7f87';
    ctx.fillText('READING WRAP', 90, 230);
    const period = st.month === null ? `${st.year}` : `${MONTHS[st.month]} ${st.year}`;
    ctx.fillStyle = ink; ctx.font = `600 120px ${serif}`; ctx.fillText(period, 84, 360);
    ctx.font = `500 40px ${sans}`; ctx.fillStyle = '#4a575e'; ctx.fillText(user.name, 90, 430);
    const imgs = await Promise.all(st.books.slice(0, 5).map((b) => loadImg(window.API.coverOf(b))));
    const nb = Math.min(5, st.books.length);
    const cw = 170, ch = 255, gap = 22, x0 = (W - (cw * nb + gap * (nb - 1))) / 2;
    st.books.slice(0, 5).forEach((b, i) => {
      const x = x0 + i * (cw + gap), y = 500;
      ctx.save(); ctx.shadowColor = 'rgba(38,52,59,.25)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
      rr(ctx, x, y, cw, ch, 10); ctx.fillStyle = RB.coverVars(b).p[1]; ctx.fill(); ctx.restore();
      ctx.save(); rr(ctx, x, y, cw, ch, 10); ctx.clip();
      if (imgs[i]) ctx.drawImage(imgs[i], x, y, cw, ch);
      else { ctx.fillStyle = RB.coverVars(b).p[2]; ctx.font = `600 24px ${serif}`; wrapText(ctx, b.title, x + 16, y + 44, cw - 30, 28, 5); }
      ctx.restore();
    });
    const cells = [['Buku', String(st.count)], ['Halaman', num(st.pages)], ['Jam membaca', `≈ ${st.hours}`], ['Rating rata-rata', st.avg ? st.avg.toFixed(1) + ' ★' : '–']];
    cells.forEach(([k, v], i) => {
      const x = 90 + (i % 2) * 460, y = 870 + Math.floor(i / 2) * 200;
      ctx.fillStyle = 'rgba(255,255,255,.62)'; rr(ctx, x, y, 440, 170, 28); ctx.fill();
      ctx.fillStyle = '#7d878c'; ctx.font = `600 28px ${sans}`; ctx.fillText(k.toUpperCase(), x + 34, y + 58);
      ctx.fillStyle = ink; ctx.font = `600 66px ${serif}`; ctx.fillText(v, x + 34, y + 135);
    });
    let y = 1330;
    ctx.fillStyle = '#7d878c'; ctx.font = `700 28px ${sans}`; ctx.fillText('GENRE TERATAS', 90, y);
    ctx.fillText('PENULIS FAVORIT', 560, y);
    ctx.fillStyle = ink; ctx.font = `500 36px ${sans}`;
    st.genres.slice(0, 3).forEach(([gname], i) => ctx.fillText(`${i + 1}. ${gname}`, 90, y + 60 + i * 52));
    st.authors.slice(0, 3).forEach(([a], i) => { ctx.save(); ctx.beginPath(); ctx.rect(560, y + 20 + i * 52, 440, 60); ctx.clip(); ctx.fillText(`${i + 1}. ${a}`, 560, y + 60 + i * 52); ctx.restore(); });
    y = 1610;
    ctx.fillStyle = '#26343b'; rr(ctx, 90, y, 900, 180, 34); ctx.fill();
    ctx.fillStyle = '#e0f2f4'; ctx.font = `700 26px ${sans}`; ctx.fillText('PERSONA BACA', 134, y + 62);
    ctx.fillStyle = '#ffffff'; ctx.font = `600 54px ${serif}`; ctx.fillText(`${st.persona[2]} ${st.persona[0]}`, 134, y + 132);
    ctx.fillStyle = '#4a575e'; ctx.font = `500 26px ${sans}`; ctx.fillText('ruangbaca — catat, nilai, dan bagikan bacaanmu', 90, 1870);
    return new Promise((res) => {
      try { c.toBlob((b) => res(b), 'image/png'); }
      catch (e) {
        // sampul dari domain lain tanpa izin CORS: gambar ulang tanpa foto sampul
        res(null);
      }
    });
  }
  async function shareImage(share) {
    if (!player) return;
    RB.toast('Menyiapkan gambar…', 'muted');
    let blob = await renderCard();
    if (!blob) { const saved = window.API.coverOf; window.API.coverOf = () => null; blob = await renderCard(); window.API.coverOf = saved; }
    if (!blob) { RB.toast('Gagal membuat gambar.', 'err'); return; }
    const name = `ruangbaca-wrap-${player.st.month === null ? player.st.year : player.st.year + '-' + RB.pad(player.st.month + 1)}.png`;
    const file = new File([blob], name, { type: 'image/png' });
    if (share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Reading Wrap ruangbaca', text: 'Rangkuman bacaanku di ruangbaca 📚' }); return; } catch (e) { /* dibatalkan */ }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    RB.toast(share ? 'Perangkat tidak mendukung berbagi langsung — gambar diunduh.' : 'Gambar Wrap diunduh 🎉');
  }

  RB.ACTIONS['wrap-open'] = (el) => open({ userId: el.dataset.user, year: Number(el.dataset.year), month: el.dataset.month !== undefined ? Number(el.dataset.month) : null });
  RB.Wrap = { open, close, isOpen: () => !!player, periodStats };
  RB.route(/^\/wrap$/, viewWrapHub, 'profil');
})();
