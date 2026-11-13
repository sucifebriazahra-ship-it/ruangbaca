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
  /* tema latar tiap slide: gradasi + gumpalan warna yang bergerak + motif + butiran kertas.
     "dark" = teks terang. Warna & motif diatur di CSS (.wp-slide.th-…) */
  const DARK = new Set(['intro', 'top', 'persona', 'summary']);
  const SITE = 'ruangbacaku.my.id';

  /** buku untuk tumpukan sampul: buku terbaik dulu, lalu yang sampulnya sudah ada */
  function summaryBooks(st) {
    const seen = new Set(), out = [];
    const push = (b) => { if (b && !seen.has(b.id)) { seen.add(b.id); out.push(b); } };
    if (st.top) push(st.top.b);
    st.books.filter((b) => window.API.coverOf(b)).forEach(push);
    st.books.forEach(push);
    return out;
  }
  const slideBg = (s) => `<div class="wp-bg" aria-hidden="true">${s.art ? `<div class="wp-art" style="background-image:url('${esc(s.art)}')"></div>` : ''}<i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i><div class="wp-motif"></div><div class="wp-grain"></div></div>`;

  function buildSlides(st, user) {
    const period = st.month === null ? `${st.year}` : `${MONTHS[st.month]} ${st.year}`;
    const name = esc(RB.firstName(user));
    const own = me() && me().id === user.id;
    const you = own ? 'Kamu' : name;
    const slides = [];
    // sampul yang diburamkan sebagai latar di beberapa slide
    const ART = { count: st.books[0], authors: st.authors[0] && st.authors[0][2][0], top: st.top && st.top.b, summary: (st.top && st.top.b) || st.books[0] };
    const add = (t, html) => slides.push({ t, html, art: ART[t] ? window.API.coverOf(ART[t]) : null });
    const coverWall = st.books.slice(-14).map((b, i) => `<span class="wc" style="--i:${i}">${cover(b, { link: false })}</span>`).join('');

    add('intro', `<div class="ws ws-intro"><div class="w-in d1 w-logo">${ic('book')} ruangbaca</div>
      <p class="w-in d2 w-kicker">Reading Wrap</p><h2 class="w-in d3 w-huge">${period}</h2>
      <p class="w-in d4 w-sub">Hai ${name}! Yuk lihat perjalanan bacaan${own ? 'mu' : ''} ${st.month === null ? 'setahun ini' : 'bulan ini'} ✨</p>
      <div class="w-in d5 w-wall">${coverWall}</div></div>`);

    add('count', `<div class="ws"><p class="w-in d1 w-kicker">${st.month === null ? 'Tahun ini' : 'Bulan ini'} ${you.toLowerCase() === 'kamu' ? 'kamu' : name} menyelesaikan</p>
      <div class="w-in d2 w-count"><b data-count="${st.count}">0</b><span>buku</span></div>
      <div class="w-in d3 w-fan">${st.books.slice(0, 7).map((b, i) => `<span style="--i:${i};--n:${Math.min(7, st.books.length)}">${cover(b, { link: false })}</span>`).join('')}</div>
      <p class="w-in d4 w-pill">${st.liked ? `<b>${st.liked}</b> di antaranya bikin ${own ? 'kamu' : name} jatuh hati <span class="w-heart">♥</span>` : 'Setiap halaman berarti ✨'}${st.rereads ? ` · ${st.rereads}× baca ulang` : ''}</p></div>`);

    add('pages', `<div class="ws"><p class="w-in d1 w-kicker">Totalnya</p>
      <div class="w-in d2 w-count"><b data-count="${st.pages}">0</b><span>halaman</span></div>
      <p class="w-in d3 w-big">≈ <b data-count="${st.hours}">0</b> jam membaca</p>
      <p class="w-in d4 w-sub">${st.hours >= 2 ? `Setara menonton sekitar ${Math.max(1, Math.round(st.hours / 2))} film bioskop 🎬 — tapi jauh lebih seru.` : 'Sedikit demi sedikit, lama-lama jadi bukit 📚'}</p>
      ${st.longest ? `<p class="w-in d5 w-note">Buku paling tebal: <b>${esc(st.longest.title)}</b> (${num(pagesOf(st.longest))} hal.)</p>` : ''}</div>`);

    if (st.genres.length) {
      const tot = st.genres.reduce((s, g) => s + g[1], 0);
      add('genres', `<div class="ws"><p class="w-in d1 w-kicker">Genre yang lagi ${own ? 'kamu' : name} suka</p>
        <h2 class="w-in d2 w-title">${esc(st.genres[0][0])}</h2>
        <div class="w-bars">${st.genres.slice(0, 5).map(([g, v], i) => `<div class="w-in d${3 + i} wb"><span class="wb-l">${i + 1}. ${esc(g)}</span><span class="wb-t"><i style="--w:${Math.round((v / st.genres[0][1]) * 100)}%"></i></span><span class="wb-v">${Math.round((v / tot) * 100)}%</span></div>`).join('')}</div>
        ${st.reviewGenres.length ? `<p class="w-in d8 w-note">${ic('message')} Genre yang paling sering ${own ? 'kamu' : name} ulas: <b>${esc(st.reviewGenres[0][0])}</b></p>` : ''}</div>`);
    }

    if (st.authors.length) {
      const [top, n, bks] = st.authors[0];
      add('authors', `<div class="ws"><p class="w-in d1 w-kicker">Penulis favorit${own ? 'mu' : ''}</p>
        <h2 class="w-in d2 w-title">${esc(top)}</h2>
        <p class="w-in d3 w-sub">${n} buku ${st.month === null ? 'tahun ini' : 'bulan ini'}</p>
        <div class="w-in d4 w-row">${bks.slice(0, 4).map((b) => cover(b, { link: false })).join('')}</div>
        ${st.authors.length > 1 ? `<ol class="w-in d5 w-list">${st.authors.slice(1, 5).map(([a, c]) => `<li><b>${esc(a)}</b><span>${c} buku</span></li>`).join('')}</ol>` : ''}
        <p class="w-in d6 w-note">${st.distinctAuthors} penulis berbeda menemani${own ? 'mu' : ''}.</p></div>`);
    }

    if (st.top) {
      const ex = st.top.e.review ? st.top.e.review.slice(0, 160) + (st.top.e.review.length > 160 ? '…' : '') : '';
      add('top', `<div class="ws ws-top"><p class="w-in d1 w-kicker">Bintang ${st.month === null ? 'tahun' : 'bulan'} ini</p>
        <div class="w-in d2 w-hero-cover">${cover(st.top.b, { link: false })}</div>
        <h2 class="w-in d3 w-title sm">${esc(st.top.b.title)}</h2><p class="w-in d4 w-sub">${esc(st.top.b.author)}</p>
        <p class="w-in d5 w-stars">${starsText(st.top.r)}</p>
        ${ex ? `<blockquote class="w-in d6">“${esc(ex)}”</blockquote>` : ''}</div>`);
    }

    if (st.month === null) {
      const max = Math.max(1, ...st.months);
      add('rhythm', `<div class="ws"><p class="w-in d1 w-kicker">Ritme baca${own ? 'mu' : ''}</p>
        <h2 class="w-in d2 w-title sm">Paling rajin di bulan ${MONTHS[st.busiestMonth]}</h2>
        <div class="w-in d3 w-chart">${st.months.map((v, i) => `<span class="${i === st.busiestMonth ? 'hi' : ''}" style="--h:${(v / max).toFixed(2)};--i:${i}"><i>${v || ''}</i><small>${MON[i]}</small></span>`).join('')}</div>
        <p class="w-in d4 w-note">Hari favorit menyelesaikan buku: <b>${DAYS[st.busiestDay]}</b></p></div>`);
    } else {
      const max = Math.max(1, ...st.weeks);
      add('rhythm', `<div class="ws"><p class="w-in d1 w-kicker">Ritme baca${own ? 'mu' : ''}</p>
        <h2 class="w-in d2 w-title sm">Hari favorit: ${DAYS[st.busiestDay]}</h2>
        <div class="w-in d3 w-chart weeks">${st.weeks.map((v, i) => `<span class="${v === max && v ? 'hi' : ''}" style="--h:${(v / max).toFixed(2)};--i:${i}"><i>${v || ''}</i><small>Minggu ${i + 1}</small></span>`).join('')}</div>
        <p class="w-in d4 w-note">${st.avg ? `Rata-rata rating: <b>${st.avg.toFixed(1)} ★</b>` : 'Belum ada rating bulan ini.'}</p></div>`);
    }

    if (st.reviews) {
      add('reviews', `<div class="ws"><p class="w-in d1 w-kicker">${you} tidak hanya membaca — ${own ? 'kamu' : 'dia'} bercerita</p>
        <div class="w-in d2 w-count"><b data-count="${st.reviews}">0</b><span>ulasan</span></div>
        <div class="w-in d3 w-trio"><span><b data-count="${st.words}">0</b><small>kata ditulis</small></span><span><b data-count="${st.likesReceived}">0</b><small>suka diterima</small></span></div>
        ${st.bestReview ? `<blockquote class="w-in d4">“${esc(st.bestReview.review.slice(0, 150))}${st.bestReview.review.length > 150 ? '…' : ''}”<cite>— tentang ${esc(getBook(st.bestReview.book_id).title)}</cite></blockquote>` : ''}</div>`);
    }

    add('persona', `<div class="ws ws-persona"><p class="w-in d1 w-kicker">Persona baca${own ? 'mu' : ''}</p>
      <div class="w-in d2 w-emoji">${st.persona[2]}</div>
      <h2 class="w-in d3 w-title">${st.persona[0]}</h2>
      <p class="w-in d4 w-sub">${st.persona[1]}</p>
      ${st.genres.length > 1 ? `<p class="w-in d5 w-note">dengan sentuhan ${esc(st.genres[1][0])}${st.genres[2] ? ' & ' + esc(st.genres[2][0]) : ''}</p>` : ''}</div>`);

    const stack = summaryBooks(st).slice(0, 3);
    add('summary', `<div class="ws ws-summary">
      <div class="wt-wrap w-in d1"><div class="w-ticket">
        <div class="wt-top">
          <div class="wt-head"><span class="wt-brand">${ic('book')} ruangbaca</span><span class="wt-tag">Reading Wrap</span></div>
          <div class="wt-hero">
            <div class="wt-stack n${stack.length}">${stack.map((b, i) => `<span style="--i:${i}">${cover(b, { link: false })}</span>`).join('')}</div>
            <div class="wt-title${st.month === null ? '' : ' long'}"><small>${st.month === null ? 'Tahun bacaan' : 'Bulan bacaan'}</small><b>${period}</b>
              <span class="wt-user">${RB.avatar(user, 'sm', false)}<span>${esc(user.name)}</span></span></div>
          </div>
        </div>
        <div class="wt-cut" aria-hidden="true"></div>
        <div class="wt-body">
          <div class="wt-nums"><span><b>${st.count}</b><small>buku</small></span><span><b>${num(st.pages)}</b><small>halaman</small></span><span><b>${num(st.hours)}</b><small>jam baca</small></span></div>
          <dl class="wt-rows">
            <div><dt>Genre teratas</dt><dd>${st.genres[0] ? esc(st.genres[0][0]) : '–'}</dd></div>
            <div><dt>Penulis favorit</dt><dd>${st.authors[0] ? esc(st.authors[0][0]) : '–'}</dd></div>
            <div><dt>Buku terbaik</dt><dd>${st.top ? esc(st.top.b.title) : '–'}</dd></div>
            <div><dt>Rating rata-rata</dt><dd>${st.avg ? st.avg.toFixed(1) + ' <i>★</i>' : '–'}</dd></div>
          </dl>
          <div class="wt-persona"><span class="wt-emoji">${st.persona[2]}</span><span><small>Persona baca</small><b>${st.persona[0]}</b></span></div>
          <div class="wt-foot"><span class="wt-barcode" aria-hidden="true"></span><small>${SITE}</small></div>
        </div>
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
        <div class="wp-slides">${slides.map((s, i) => `<section class="wp-slide th-${s.t}${DARK.has(s.t) ? ' dark' : ''}" data-i="${i}">${slideBg(s)}${s.html}</section>`).join('')}</div>
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
      $$('.wp-slide', root).forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.toggle('past', k < i); if (k === i) root.classList.toggle('on-dark', s.classList.contains('dark')); });
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
    const ink = '#26343b', paper = '#fffaf2';
    // latar: malam teal dengan cahaya warna-warni & bintik bintang
    const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, '#1d3439'); g.addColorStop(0.55, '#2b4c53'); g.addColorStop(1, '#3d2f45');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const glow = (x, y, r, col) => { const rg = ctx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
    glow(940, 180, 520, 'rgba(247,145,169,.55)'); glow(80, 900, 560, 'rgba(186,214,218,.38)'); glow(900, 1780, 600, 'rgba(255,231,151,.42)');
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 90; i++) { ctx.globalAlpha = 0.25 + rnd() * 0.6; ctx.fillStyle = i % 9 ? '#ffffff' : '#ffe797'; ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, 1 + rnd() * 2.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;

    // tiket (digambar di kanvas terpisah supaya lubang sobekannya benar-benar bolong)
    const TX = 70, TY = 130, TW = W - 140, TH = 1620, CUT = TY + 800;
    const t = document.createElement('canvas'); t.width = W; t.height = H;
    const tc = t.getContext('2d');
    tc.fillStyle = paper; rr(tc, TX, TY, TW, TH, 46); tc.fill();
    const tg = tc.createLinearGradient(0, TY, 0, CUT);
    tg.addColorStop(0, '#ffdbdf'); tg.addColorStop(0.6, '#fff1e4'); tg.addColorStop(1, paper);
    tc.save(); rr(tc, TX, TY, TW, CUT - TY, 46); tc.clip(); tc.fillStyle = tg; tc.fillRect(TX, TY, TW, CUT - TY); tc.restore();
    tc.globalCompositeOperation = 'destination-out';
    [TX, TX + TW].forEach((x) => { tc.beginPath(); tc.arc(x, CUT, 38, 0, Math.PI * 2); tc.fill(); });
    tc.globalCompositeOperation = 'source-over';
    tc.strokeStyle = 'rgba(38,52,59,.28)'; tc.lineWidth = 4; tc.setLineDash([16, 14]);
    tc.beginPath(); tc.moveTo(TX + 60, CUT); tc.lineTo(TX + TW - 60, CUT); tc.stroke(); tc.setLineDash([]);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24; ctx.drawImage(t, 0, 0); ctx.restore();

    // kepala tiket
    ctx.fillStyle = ink; ctx.font = `600 44px ${serif}`; ctx.fillText('ruangbaca', TX + 60, TY + 92);
    ctx.font = `800 24px ${sans}`; const tag = 'READING WRAP'; const tw = ctx.measureText(tag).width + 48;
    ctx.fillStyle = ink; rr(ctx, TX + TW - 60 - tw, TY + 52, tw, 54, 27); ctx.fill();
    ctx.fillStyle = '#ffe797'; ctx.fillText(tag, TX + TW - 36 - tw, TY + 88);

    // tumpukan sampul
    const books = summaryBooks(st).slice(0, 3);
    const imgs = await Promise.all(books.map((b) => loadImg(window.API.coverOf(b))));
    const cw = 230, ch = 345, cx = W / 2, cy = TY + 175;
    const order = books.length === 3 ? [1, 2, 0] : books.map((_, i) => i);
    order.forEach((i) => {
      const b = books[i];
      const k = books.length === 3 ? [0, -1, 1][i] : books.length === 2 ? [-0.6, 0.6][i] : 0;
      ctx.save(); ctx.translate(cx + k * 190, cy + ch / 2 + Math.abs(k) * 28); ctx.rotate(k * 0.16);
      const s = i === 0 ? 1.08 : 0.94; ctx.scale(s, s);
      ctx.shadowColor = 'rgba(38,52,59,.35)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 18;
      rr(ctx, -cw / 2, -ch / 2, cw, ch, 12); ctx.fillStyle = RB.coverVars(b).p[1]; ctx.fill(); ctx.shadowColor = 'transparent';
      rr(ctx, -cw / 2, -ch / 2, cw, ch, 12); ctx.clip();
      if (imgs[i]) ctx.drawImage(imgs[i], -cw / 2, -ch / 2, cw, ch);
      else { ctx.fillStyle = RB.coverVars(b).p[2]; ctx.font = `600 28px ${serif}`; wrapText(ctx, b.title, -cw / 2 + 20, -ch / 2 + 54, cw - 36, 32, 6); }
      ctx.restore();
    });

    // periode & nama
    const period = st.month === null ? `${st.year}` : `${MONTHS[st.month]} ${st.year}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9a6a74'; ctx.font = `800 26px ${sans}`; ctx.fillText((st.month === null ? 'TAHUN BACAAN' : 'BULAN BACAAN'), W / 2, TY + 620);
    ctx.fillStyle = ink; ctx.font = `600 ${period.length > 8 ? 104 : 136}px ${serif}`; ctx.fillText(period, W / 2, TY + 730);
    ctx.fillStyle = '#4a575e'; ctx.font = `600 36px ${sans}`; ctx.fillText(user.name, W / 2, TY + 776);

    // angka besar
    const nums = [[String(st.count), 'BUKU'], [num(st.pages), 'HALAMAN'], [num(st.hours), 'JAM BACA']];
    const colW = (TW - 120) / 3;
    nums.forEach(([v, k], i) => {
      const x = TX + 60 + colW * i + colW / 2;
      ctx.fillStyle = ink; ctx.font = `600 92px ${serif}`; ctx.fillText(v, x, CUT + 150);
      ctx.fillStyle = '#7d878c'; ctx.font = `800 24px ${sans}`; ctx.fillText(k, x, CUT + 196);
      if (i) { ctx.fillStyle = 'rgba(38,52,59,.12)'; ctx.fillRect(TX + 60 + colW * i - 1, CUT + 80, 2, 130); }
    });
    ctx.textAlign = 'left';

    // baris info 2×2
    const rows = [['GENRE TERATAS', st.genres[0] ? st.genres[0][0] : '–'], ['PENULIS FAVORIT', st.authors[0] ? st.authors[0][0] : '–'],
      ['BUKU TERBAIK', st.top ? st.top.b.title : '–'], ['RATING RATA-RATA', st.avg ? st.avg.toFixed(1) + ' ★' : '–']];
    rows.forEach(([k, v], i) => {
      const x = TX + 60 + (i % 2) * ((TW - 120) / 2 + 10), y = CUT + 260 + Math.floor(i / 2) * 130, w = (TW - 120) / 2 - 10;
      ctx.fillStyle = 'rgba(224,242,244,.7)'; rr(ctx, x, y, w, 112, 24); ctx.fill();
      ctx.fillStyle = '#6d8a8f'; ctx.font = `800 21px ${sans}`; ctx.fillText(k, x + 28, y + 42);
      ctx.fillStyle = ink; ctx.font = `600 34px ${serif}`;
      ctx.save(); ctx.beginPath(); ctx.rect(x + 20, y + 48, w - 40, 60); ctx.clip();
      let s = v; if (ctx.measureText(s).width > w - 56) { while (ctx.measureText(s + '…').width > w - 56 && s.length > 3) s = s.includes(' ') ? s.slice(0, s.lastIndexOf(' ')) : s.slice(0, -1); s = s.replace(/[\s,.:;–-]+$/, '') + '…'; }
      ctx.fillText(s, x + 28, y + 90); ctx.restore();
    });

    // persona
    const py = CUT + 530;
    const pg = ctx.createLinearGradient(TX + 60, 0, TX + TW - 60, 0); pg.addColorStop(0, '#26343b'); pg.addColorStop(1, '#4e3a52');
    ctx.fillStyle = pg; rr(ctx, TX + 60, py, TW - 120, 150, 34); ctx.fill();
    ctx.font = `76px ${sans}`; ctx.fillText(st.persona[2], TX + 96, py + 102);
    ctx.fillStyle = '#ffdbdf'; ctx.font = `800 22px ${sans}`; ctx.fillText('PERSONA BACA', TX + 210, py + 58);
    ctx.fillStyle = '#ffffff'; ctx.font = `600 48px ${serif}`; ctx.fillText(st.persona[0], TX + 210, py + 114);

    // kode batang & alamat
    const by = CUT + 712;
    let bx = TX + 60; seed = 3;
    while (bx < TX + 470) { const w = 2 + Math.floor(rnd() * 3) * 2; ctx.fillStyle = ink; ctx.fillRect(bx, by, w, 50); bx += w + 3 + Math.floor(rnd() * 3) * 2; }
    ctx.textAlign = 'right'; ctx.fillStyle = '#4a575e'; ctx.font = `700 30px ${sans}`; ctx.fillText(SITE, TX + TW - 60, by + 36); ctx.textAlign = 'left';

    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `500 30px ${sans}`;
    ctx.fillText('Catat, nilai, dan bagikan bacaanmu ✦', W / 2, TY + TH + 96); ctx.textAlign = 'left';
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
