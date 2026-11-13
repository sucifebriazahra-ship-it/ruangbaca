/* =========================================================================
   ruangbaca — Preloved (jual-beli buku bekas) + pesan langsung
   ========================================================================= */
(() => {
  'use strict';
  const RB = window.RB, S = window.Store;
  const { $, $$, esc, ic, rupiah, timeAgo, fmtDate, ts, me, getBook, getUser, cover, avatar, followBtn, empty, secHead, toast, go, refresh, onMount, setTitle, requireAuth, notify, confirmModal } = RB;

  const COND = {
    baru: { label: 'Baru', desc: 'Masih bersegel atau belum pernah dibuka.' },
    seperti_baru: { label: 'Seperti baru', desc: 'Dibaca sekali dengan hati-hati, tanpa cacat terlihat.' },
    sangat_baik: { label: 'Sangat baik', desc: 'Ada tanda pemakaian ringan, halaman bersih dan rapat.' },
    baik: { label: 'Baik', desc: 'Tanda pemakaian terlihat (sampul lecet / halaman menguning ringan).' },
    cukup: { label: 'Cukup', desc: 'Cacat jelas tapi utuh dan nyaman dibaca. Cocok untuk harga hemat.' },
  };
  const DEFECTS = ['Masih bersegel', 'Halaman menguning', 'Ada coretan / stabilo', 'Sampul lecet', 'Ujung halaman terlipat', 'Ada nama pemilik', 'Bertanda tangan penulis', 'Bonus pembatas buku'];
  const SHIPPING = ['COD / ketemuan', 'Kirim via ekspedisi', 'Ambil di tempat'];
  const STATUS = { available: 'Tersedia', reserved: 'Dipesan', sold: 'Terjual' };

  const listing = (id) => S.get('listings', id);
  const savesOf = (lid) => S.where('listing_saves', (s) => s.listing_id === lid);
  const photoOf = (l) => (l.photos && l.photos[0]) || null;
  const waLink = (num, text) => {
    let n = String(num || '').replace(/\D/g, '');
    if (n.startsWith('0')) n = '62' + n.slice(1);
    return n.length >= 9 ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
  };

  /* ---------- komponen ---------- */
  function listingCard(l) {
    const b = getBook(l.book_id), u = getUser(l.seller_id);
    if (!b || !u) return '';
    const m = me();
    const saved = m && savesOf(l.id).some((s) => s.user_id === m.id);
    const photo = photoOf(l);
    return `<div class="listing-card ${l.status}">
      <a href="#/preloved/${l.id}" class="lc-photo">${photo ? `<img src="${esc(photo)}" alt="Foto ${esc(b.title)}" loading="lazy">` : cover(b, { link: false })}
        <span class="cond cond-${l.condition}">${COND[l.condition]?.label || l.condition}</span>
        ${l.status !== 'available' ? `<span class="status-badge s-${l.status}">${STATUS[l.status]}</span>` : ''}</a>
      ${m && m.id !== l.seller_id ? `<button class="save-btn ${saved ? 'on' : ''}" data-action="save-listing" data-id="${l.id}" title="${saved ? 'Tersimpan' : 'Simpan'}">${ic('heart')}</button>` : ''}
      <a href="#/preloved/${l.id}" class="lc-info">
        <span class="lc-price"><b>${rupiah(l.price)}</b>${l.negotiable ? '<i>Nego</i>' : ''}</span>
        <span class="lc-title">${esc(b.title)}</span>
        <span class="muted xs">${esc(b.author)}</span>
        <span class="lc-foot">${avatar(u, 'xs', false)}<span>${esc(RB.firstName(u))}</span>${l.city ? `<span class="dot">·</span>${ic('pin')}<span>${esc(l.city)}</span>` : ''}</span>
      </a></div>`;
  }
  function listingMini(l) {
    const b = getBook(l.book_id);
    if (!b) return '';
    const photo = photoOf(l);
    return `<a href="#/preloved/${l.id}" class="lm">${photo ? `<span class="lm-ph"><img src="${esc(photo)}" alt="" loading="lazy"></span>` : `<span class="lm-ph">${cover(b, { link: false, size: 'xs' })}</span>`}<span class="lm-body"><b>${esc(b.title)}</b><small>${COND[l.condition]?.label || ''}${l.city ? ' · ' + esc(l.city) : ''}</small><span class="lm-price">${rupiah(l.price)}${l.status !== 'available' ? ` <i class="s-${l.status}">${STATUS[l.status]}</i>` : ''}</span></span></a>`;
  }

  /* ---------- lapak ---------- */
  function viewPreloved(_, q) {
    setTitle('Preloved');
    const query = q.q || '', cond = q.kondisi || '', sort = q.sort || 'baru', city = q.kota || '', all = q.semua === '1';
    let list = S.table('listings').filter((l) => (all ? true : l.status !== 'sold') && getBook(l.book_id));
    if (query) { const n = RB.norm(query); list = list.filter((l) => { const b = getBook(l.book_id); return RB.norm(`${b.title} ${b.author} ${l.description || ''}`).includes(n); }); }
    if (cond) list = list.filter((l) => l.condition === cond);
    if (city) { const n = RB.norm(city); list = list.filter((l) => RB.norm(l.city).includes(n)); }
    const sorters = { baru: (a, b) => ts(b.created_at) - ts(a.created_at), murah: (a, b) => a.price - b.price, mahal: (a, b) => b.price - a.price, populer: (a, b) => savesOf(b.id).length - savesOf(a.id).length };
    list.sort((a, b) => (a.status === 'available' ? 0 : 1) - (b.status === 'available' ? 0 : 1) || (sorters[sort] || sorters.baru)(a, b));
    const avail = S.where('listings', (l) => l.status === 'available').length;
    const sellers = new Set(S.table('listings').map((l) => l.seller_id)).size;
    const href = (o) => '#/preloved?' + new URLSearchParams(Object.entries({ q: query, kondisi: cond, sort, kota: city, semua: all ? '1' : '', ...o }).filter(([, v]) => v)).toString();
    onMount(() => {
      $('#plForm').addEventListener('submit', (e) => { e.preventDefault(); go(href({ q: e.target.q.value.trim(), kota: e.target.kota.value.trim() })); });
      $('#plSort').addEventListener('change', (e) => go(href({ sort: e.target.value })));
    });
    return `
    <section class="wrap pl-hero">
      <div><p class="eyebrow">${ic('bag')} Preloved</p><h1 class="display sm">Buku bekas, cerita baru.</h1>
        <p class="muted">Jual buku yang sudah selesai kamu baca dengan foto dan kondisi aslinya, atau temukan harta karun dari sesama pembaca.</p>
        <div class="pl-cta"><a href="#/jual" class="btn primary">${ic('tag')}Jual buku</a>${me() ? `<a href="#/pesan" class="btn ghost">${ic('chat')}Pesan saya</a>` : ''}</div></div>
      <div class="pl-stats"><div><b>${RB.num(avail)}</b><span>buku tersedia</span></div><div><b>${RB.num(sellers)}</b><span>penjual</span></div></div>
    </section>
    <section class="wrap safety">${[['camera', 'Foto asli', 'Setiap lapak wajib menyertakan foto buku yang sebenarnya.'], ['shield', 'Kondisi jujur', 'Penjual mencantumkan tingkat kondisi & catatan cacat.'], ['chat', 'Chat langsung', 'Tanya-tanya dulu lewat pesan ruangbaca sebelum membayar.']].map(([i, t, d]) => `<div class="safe-item">${ic(i)}<span><b>${t}</b><small>${d}</small></span></div>`).join('')}</section>
    <section class="wrap pl-filters">
      <form id="plForm" class="pl-form">
        <div class="explore-search">${ic('search')}<input name="q" class="input" value="${esc(query)}" placeholder="Cari judul atau penulis…"></div>
        <div class="explore-search city">${ic('pin')}<input name="kota" class="input" value="${esc(city)}" placeholder="Kota"></div>
        <button class="btn ghost">Cari</button>
      </form>
      <label class="sort"><span class="muted sm">Urutkan</span><select id="plSort" class="input sm">${[['baru', 'Terbaru'], ['murah', 'Harga terendah'], ['mahal', 'Harga tertinggi'], ['populer', 'Paling disimpan']].map(([v, l]) => `<option value="${v}" ${v === sort ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    </section>
    <div class="wrap chips scroll">${[['', 'Semua kondisi'], ...Object.entries(COND).map(([k, v]) => [k, v.label])].map(([k, l]) => `<a class="chip ${k === cond ? 'on' : ''}" href="${href({ kondisi: k })}">${l}</a>`).join('')}<a class="chip ${all ? 'on' : ''}" href="${href({ semua: all ? '' : '1' })}">Tampilkan yang terjual</a></div>
    <section class="wrap">${list.length ? `<div class="listing-grid">${list.map(listingCard).join('')}</div>` : empty(query || cond || city ? 'Tidak ada lapak yang cocok dengan filter ini.' : 'Belum ada buku yang dijual. Jadilah penjual pertama di ruangbaca!', '#/jual', 'Jual buku', 'bag')}</section>`;
  }

  function viewListing([id]) {
    const l = listing(id);
    if (!l) return RB.empty('Lapak ini sudah tidak ada.', '#/preloved', 'Kembali ke Preloved', 'bag');
    const b = getBook(l.book_id), u = getUser(l.seller_id), m = me();
    if (!b || !u) return RB.empty('Lapak ini tidak lengkap.', '#/preloved', 'Kembali', 'bag');
    setTitle(`${b.title} — ${rupiah(l.price)}`);
    const own = m && m.id === u.id;
    const saves = savesOf(l.id);
    const saved = m && saves.some((s) => s.user_id === m.id);
    const photos = l.photos && l.photos.length ? l.photos : [];
    const wa = l.whatsapp ? waLink(l.whatsapp, `Halo ${RB.firstName(u)}, saya tertarik dengan buku "${b.title}" (${rupiah(l.price)}) di ruangbaca: ${location.href}`) : null;
    const others = S.where('listings', (x) => x.seller_id === u.id && x.id !== l.id && x.status !== 'sold').slice(0, 4);
    const sameBook = S.where('listings', (x) => x.book_id === b.id && x.id !== l.id && x.status !== 'sold').slice(0, 4);
    const sold = S.where('listings', (x) => x.seller_id === u.id && x.status === 'sold').length;
    const joined = new Date(u.created_at);
    return `
    <section class="wrap listing-page">
      <div class="gallery">
        <div class="gal-main" id="galMain">${photos.length ? `<img src="${esc(photos[0])}" alt="Foto ${esc(b.title)}">` : cover(b, { link: false, size: 'lg' })}
          <span class="cond big cond-${l.condition}">${COND[l.condition]?.label}</span>
          ${l.status !== 'available' ? `<span class="status-badge big s-${l.status}">${STATUS[l.status]}</span>` : ''}</div>
        ${photos.length > 1 ? `<div class="gal-thumbs">${photos.map((p, i) => `<button class="gal-t ${i === 0 ? 'on' : ''}" data-action="gal-show" data-src="${esc(p)}"><img src="${esc(p)}" alt="Foto ${i + 1}"></button>`).join('')}</div>` : ''}
        <p class="muted xs">${ic('camera')} ${photos.length} foto asli dari penjual</p>
      </div>
      <div class="listing-info">
        <p class="eyebrow">${ic('bag')} Preloved · ${timeAgo(l.created_at)}</p>
        <h1 class="book-title sm"><a href="#/buku/${encodeURIComponent(b.id)}">${esc(b.title)}</a></h1>
        <p class="book-author">oleh ${esc(b.author)}${b.year ? ` · ${b.year}` : ''}</p>
        <div class="price-row"><b class="big-price">${rupiah(l.price)}</b>${l.negotiable ? '<span class="nego-chip">Bisa nego</span>' : '<span class="nego-chip fixed">Harga pas</span>'}</div>
        <div class="cond-card cond-${l.condition}"><span class="label">Kondisi</span><b>${COND[l.condition]?.label}</b><p>${COND[l.condition]?.desc}</p>
          ${l.defects && l.defects.length ? `<div class="defects">${l.defects.map((d) => `<span>${esc(d)}</span>`).join('')}</div>` : ''}</div>
        ${l.description ? `<div class="pl-desc"><span class="label">Catatan penjual</span>${RB.paras(l.description)}</div>` : ''}
        <div class="pl-meta">
          ${l.city ? `<span>${ic('pin')}${esc(l.city)}</span>` : ''}
          ${(l.shipping || []).map((s) => `<span>${ic('truck')}${esc(s)}</span>`).join('')}
          <span>${ic('heart')}${saves.length} disimpan</span>
        </div>
        <div class="pl-actions">
          ${own ? `
            <a href="#/jual/${l.id}" class="btn ghost">${ic('edit')}Ubah</a>
            <label class="status-sel"><span class="muted sm">Status</span><select class="input sm" data-listing-status="${l.id}">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === l.status ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
            <button class="btn ghost danger" data-action="delete-listing" data-id="${l.id}">${ic('trash')}Hapus</button>`
          : `
            <a href="#/pesan/${l.id}/${u.id}" class="btn primary" data-action="${m ? '' : 'need-login'}">${ic('chat')}Chat penjual</a>
            ${wa ? `<a href="${wa}" target="_blank" rel="noopener" class="btn wa">${ic('phone')}WhatsApp</a>` : ''}
            <button class="btn ${saved ? 'like-on' : 'ghost'}" data-action="save-listing" data-id="${l.id}">${ic('heart')}${saved ? 'Tersimpan' : 'Simpan'}</button>`}
          <button class="btn ghost" data-action="copy-link" data-href="#/preloved/${l.id}">${ic('link')}</button>
        </div>
        <div class="seller card">
          ${avatar(u, 'lg')}
          <div class="seller-info"><a href="#/u/${esc(u.username)}" class="m-name">${esc(u.name)}</a><span class="muted sm">@${esc(u.username)} · bergabung ${RB.MONTHS[joined.getMonth()]} ${joined.getFullYear()}</span>
            <span class="sm">${S.where('listings', (x) => x.seller_id === u.id && x.status !== 'sold').length} lapak aktif · ${sold} terjual</span></div>
          ${followBtn(u)}
        </div>
        <p class="muted xs tip">${ic('shield')} Tips aman: cek foto & kondisi, tanyakan detail lewat chat, dan utamakan COD di tempat ramai atau rekening bersama.</p>
      </div>
    </section>
    ${sameBook.length ? `<section class="wrap">${secHead('Penjual lain untuk buku ini', '', 'tag')}<div class="listing-grid">${sameBook.map(listingCard).join('')}</div></section>` : ''}
    ${others.length ? `<section class="wrap">${secHead(`Lapak lain dari ${esc(RB.firstName(u))}`, `<a class="more" href="#/u/${esc(u.username)}/lapak">Semua →</a>`, 'bag')}<div class="listing-grid">${others.map(listingCard).join('')}</div></section>` : ''}`;
  }

  /* ---------- form jual ---------- */
  const drafts = {};
  function viewSell([id], q) {
    const m = me();
    if (!m) { onMount(() => RB.ACTIONS['open-auth']({ dataset: { tab: 'login' } })); return `<section class="wrap">${empty('Masuk dulu untuk menjual buku di Preloved.', '', '', 'bag', '<button class="btn primary sm" data-action="open-auth" data-tab="login">Masuk</button>')}</section>`; }
    const ex = id ? listing(id) : null;
    if (id && (!ex || ex.seller_id !== m.id)) return RB.empty('Lapak tidak ditemukan atau bukan milikmu.', '#/preloved', 'Kembali', 'bag');
    const key = id || 'new';
    if (!drafts[key]) drafts[key] = ex ? JSON.parse(JSON.stringify(ex)) : { book_id: q.book || null, photos: [], condition: 'sangat_baik', defects: [], price: '', negotiable: true, city: m.location || '', shipping: ['COD / ketemuan'], whatsapp: '', description: '' };
    const d = drafts[key];
    setTitle(ex ? 'Ubah lapak' : 'Jual buku');
    if (d.book_id && !getBook(d.book_id)) RB.ensureBook(d.book_id).then(() => refresh()).catch(() => { d.book_id = null; refresh(); });
    const b = d.book_id ? getBook(d.book_id) : null;
    onMount(() => bindSellForm(key, ex));
    return `<section class="wrap page-head"><p class="eyebrow">${ic('tag')} Preloved</p><h1 class="display sm">${ex ? 'Ubah lapak' : 'Jual buku bekasmu'}</h1><p class="muted">Foto asli + kondisi jujur = pembeli percaya. Lapakmu akan tampil di Preloved dan di halaman bukunya.</p></section>
    <section class="wrap sell">
      <form id="sellForm" class="sell-form" novalidate>
        <div class="card form">
          <h2 class="sec-title"><span class="step">1</span>Buku apa yang dijual?</h2>
          <div id="sellBook">${b ? `<div class="sel-book">${cover(b, { size: 'sm', link: false })}<span><b>${esc(b.title)}</b><small>${esc(b.author)}${b.year ? ' · ' + b.year : ''}</small></span><button type="button" class="btn ghost sm" data-action="sell-change-book">Ganti</button></div>` : `<div class="pick-host"><div class="search-field">${ic('search')}<input id="sellSearch" class="input" placeholder="Cari judul/penulis — dari katalog ruangbaca atau dunia…" autocomplete="off"></div><div id="sellResults" class="pick-pop"></div></div>`}</div>
        </div>
        <div class="card form">
          <h2 class="sec-title"><span class="step">2</span>Foto asli buku <i class="muted">(1–5 foto)</i></h2>
          <div class="photo-grid" id="photoGrid">${photoGrid(d)}</div>
          <p class="muted xs">Tips: foto sampul depan, punggung, dan bagian yang cacat (jika ada) dengan cahaya terang.</p>
        </div>
        <div class="card form">
          <h2 class="sec-title"><span class="step">3</span>Kondisi buku</h2>
          <div class="cond-grid">${Object.entries(COND).map(([k, v]) => `<label class="cond-opt cond-${k}"><input type="radio" name="condition" value="${k}" ${d.condition === k ? 'checked' : ''}><span><b>${v.label}</b><small>${v.desc}</small></span></label>`).join('')}</div>
          <span class="label">Detail kondisi (opsional)</span>
          <div class="chips">${DEFECTS.map((x) => `<label class="chip check-chip"><input type="checkbox" name="defects" value="${esc(x)}" ${d.defects.includes(x) ? 'checked' : ''}><span>${esc(x)}</span></label>`).join('')}</div>
          <label class="field"><span>Catatan untuk pembeli</span><textarea class="input" name="description" rows="3" maxlength="1000" placeholder="mis. Dibaca sekali, disimpan di rak tertutup. Ada sedikit lipatan di halaman 40.">${esc(d.description)}</textarea></label>
        </div>
        <div class="card form">
          <h2 class="sec-title"><span class="step">4</span>Harga & pengiriman</h2>
          <div class="field-row">
            <label class="field"><span>Harga</span><span class="price-input"><i>Rp</i><input class="input" name="price" inputmode="numeric" value="${d.price ? Number(d.price).toLocaleString('id-ID') : ''}" placeholder="45.000" required></span></label>
            <label class="field"><span>Kota</span><input class="input" name="city" value="${esc(d.city)}" maxlength="60" placeholder="mis. Bandung" required></label>
          </div>
          <label class="check"><input type="checkbox" name="negotiable" ${d.negotiable ? 'checked' : ''}><span>Harga bisa dinego</span></label>
          <span class="label">Cara serah terima</span>
          <div class="chips">${SHIPPING.map((x) => `<label class="chip check-chip"><input type="checkbox" name="shipping" value="${esc(x)}" ${d.shipping.includes(x) ? 'checked' : ''}><span>${esc(x)}</span></label>`).join('')}</div>
          <label class="field"><span>Nomor WhatsApp <i class="muted">(opsional — tampil di lapak)</i></span><input class="input" name="whatsapp" inputmode="tel" value="${esc(d.whatsapp || '')}" placeholder="08xxxxxxxxxx"></label>
        </div>
        <p class="form-err" id="sellErr"></p>
        <div class="sell-submit"><a href="${ex ? `#/preloved/${ex.id}` : '#/preloved'}" class="btn ghost">Batal</a><button class="btn primary lg">${ic('tag')}${ex ? 'Simpan perubahan' : 'Pasang lapak'}</button></div>
      </form>
      <aside class="sell-preview"><span class="label">Pratinjau</span><div id="sellPreview">${previewCard(d)}</div></aside>
    </section>`;
  }
  function photoGrid(d) {
    return d.photos.map((p, i) => `<div class="ph"><img src="${esc(p)}" alt="Foto ${i + 1}">${i === 0 ? '<span class="ph-main">Utama</span>' : ''}<button type="button" class="ph-x" data-action="sell-photo-remove" data-i="${i}" title="Hapus">${ic('x')}</button></div>`).join('')
      + (d.photos.length < 5 ? `<label class="ph add">${ic('camera')}<span>Tambah foto</span><input type="file" id="photoInput" accept="image/*" multiple hidden></label>` : '');
  }
  function previewCard(d) {
    const b = d.book_id && getBook(d.book_id);
    if (!b) return '<div class="empty slim"><p>Pilih buku untuk melihat pratinjau.</p></div>';
    const fake = { id: 'preview', book_id: b.id, seller_id: me().id, price: Number(d.price) || 0, negotiable: d.negotiable, condition: d.condition, city: d.city, photos: d.photos, status: 'available' };
    return listingCard(fake).replace(/href="#\/preloved\/preview"/g, '').replace(/<button class="save-btn[^]*?<\/button>/, '');
  }
  function bindSellForm(key, ex) {
    const d = drafts[key];
    const f = $('#sellForm');
    if (!f) return;
    const upd = () => { $('#sellPreview').innerHTML = previewCard(d); RB.hydrateCovers($('#sellPreview')); };
    const search = $('#sellSearch');
    if (search) RB.bindBookSearch(search, $('#sellResults'), (bid) => { d.book_id = bid; refresh(); });
    const bindPhotos = () => {
      const inp = $('#photoInput');
      if (!inp) return;
      inp.addEventListener('change', async (e) => {
        const files = [...e.target.files].slice(0, 5 - d.photos.length);
        for (const file of files) {
          try {
            $('#photoGrid').insertAdjacentHTML('beforeend', '<div class="ph loading"><span class="spinner"></span></div>');
            const url = await S.uploadImage(file, 'preloved');
            d.photos.push(url);
          } catch (err) { toast(esc(err.message), 'err'); }
        }
        $('#photoGrid').innerHTML = photoGrid(d);
        bindPhotos(); upd();
      });
    };
    bindPhotos();
    RB.ACTIONS['sell-photo-remove'] = (el) => { d.photos.splice(Number(el.dataset.i), 1); $('#photoGrid').innerHTML = photoGrid(d); bindPhotos(); upd(); };
    RB.ACTIONS['sell-change-book'] = () => { d.book_id = null; refresh(); };
    f.price.addEventListener('input', () => {
      const v = f.price.value.replace(/\D/g, '').slice(0, 9);
      d.price = v ? Number(v) : '';
      f.price.value = v ? Number(v).toLocaleString('id-ID') : '';
    });
    f.addEventListener('input', () => {
      d.condition = f.condition.value;
      d.defects = $$('input[name=defects]:checked', f).map((x) => x.value);
      d.shipping = $$('input[name=shipping]:checked', f).map((x) => x.value);
      d.negotiable = f.negotiable.checked;
      d.city = f.city.value; d.whatsapp = f.whatsapp.value; d.description = f.description.value;
      upd();
    });
    f.addEventListener('change', () => f.dispatchEvent(new Event('input')));
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = $('#sellErr');
      if (!d.book_id || !getBook(d.book_id)) return (err.textContent = 'Pilih buku yang dijual terlebih dahulu.');
      if (!d.photos.length) return (err.textContent = 'Tambahkan minimal 1 foto asli buku.');
      if (!d.price || d.price < 1000) return (err.textContent = 'Harga minimal Rp1.000.');
      if (!d.city.trim()) return (err.textContent = 'Isi kota agar pembeli tahu lokasimu.');
      if (!d.shipping.length) return (err.textContent = 'Pilih minimal satu cara serah terima.');
      const row = { book_id: d.book_id, photos: d.photos, condition: d.condition, defects: d.defects, price: Number(d.price), negotiable: d.negotiable, city: d.city.trim(), shipping: d.shipping, whatsapp: d.whatsapp.trim(), description: d.description.trim() };
      let id;
      if (ex) { S.update('listings', ex.id, { ...row, updated_at: new Date().toISOString() }); id = ex.id; }
      else id = S.insert('listings', { ...row, seller_id: me().id, status: 'available' }).id;
      delete drafts[key];
      window.FX.confetti();
      toast(ex ? 'Lapak diperbarui' : 'Lapak dipasang! 🎉 Semoga cepat laku.');
      go(`#/preloved/${id}`);
    });
  }

  /* ---------- pesan ---------- */
  function threads() {
    const m = me();
    if (!m) return [];
    const map = new Map();
    S.where('messages', (x) => x.sender_id === m.id || x.recipient_id === m.id).forEach((x) => {
      const other = x.sender_id === m.id ? x.recipient_id : x.sender_id;
      const k = `${x.listing_id}|${other}`;
      const t = map.get(k) || { listing_id: x.listing_id, other, msgs: [], unread: 0 };
      t.msgs.push(x);
      if (x.recipient_id === m.id && !x.is_read) t.unread++;
      map.set(k, t);
    });
    return [...map.values()].map((t) => { t.msgs.sort((a, b) => ts(a.created_at) - ts(b.created_at)); t.last = t.msgs[t.msgs.length - 1]; return t; }).sort((a, b) => ts(b.last.created_at) - ts(a.last.created_at));
  }
  function threadItem(t, active) {
    const u = getUser(t.other), l = listing(t.listing_id), b = l ? getBook(l.book_id) : null;
    if (!u) return '';
    return `<a href="#/pesan/${t.listing_id}/${t.other}" class="thread ${active ? 'on' : ''} ${t.unread ? 'unread' : ''}">${avatar(u, 'md', false)}
      <span class="th-body"><b>${esc(u.name)}</b><small class="th-book">${b ? esc(b.title) : 'Lapak dihapus'}</small><small class="th-last">${t.last.sender_id === me().id ? 'Kamu: ' : ''}${esc(t.last.body.slice(0, 60))}</small></span>
      <span class="th-side"><small>${timeAgo(t.last.created_at)}</small>${t.unread ? `<span class="badge static">${t.unread}</span>` : ''}</span></a>`;
  }
  function viewMessages([lid, uid]) {
    const m = me();
    if (!m) { onMount(() => RB.ACTIONS['open-auth']({ dataset: { tab: 'login' } })); return `<section class="wrap">${empty('Masuk untuk membuka pesan.', '', '', 'chat')}</section>`; }
    setTitle('Pesan');
    const ts_ = threads();
    const active = lid && uid ? { lid, uid } : null;
    if (active && uid === m.id) return RB.empty('Kamu tidak bisa mengirim pesan ke diri sendiri.', '#/pesan', 'Kembali', 'chat');
    return `<section class="wrap page-head"><p class="eyebrow">${ic('chat')} Pesan</p><h1 class="display sm">Obrolan preloved</h1></section>
    <section class="wrap inbox ${active ? 'has-active' : ''}">
      <div class="thread-list card flush">${ts_.length ? ts_.map((t) => threadItem(t, active && t.listing_id === lid && t.other === uid)).join('') : `<div class="empty slim">${ic('chat')}<p>Belum ada obrolan. Temukan buku di <a href="#/preloved">Preloved</a> lalu chat penjualnya.</p></div>`}</div>
      <div class="thread-pane card flush">${active ? threadPane(lid, uid) : `<div class="empty slim center-pane">${ic('chat')}<p>Pilih obrolan di sebelah kiri.</p></div>`}</div>
    </section>`;
  }
  function bubbles(lid, uid) {
    const m = me();
    const msgs = S.where('messages', (x) => x.listing_id === lid && ((x.sender_id === m.id && x.recipient_id === uid) || (x.sender_id === uid && x.recipient_id === m.id))).sort((a, b) => ts(a.created_at) - ts(b.created_at));
    let lastDay = '';
    return msgs.map((x) => {
      const day = fmtDate(x.created_at);
      const sep = day !== lastDay ? `<div class="day-sep"><span>${day}</span></div>` : '';
      lastDay = day;
      const t = new Date(x.created_at);
      return `${sep}<div class="bubble ${x.sender_id === m.id ? 'me' : 'them'}"><p>${esc(x.body).replace(/\n/g, '<br>')}</p><small>${RB.pad(t.getHours())}:${RB.pad(t.getMinutes())}${x.sender_id === m.id ? (x.is_read ? ' · dibaca' : ' · terkirim') : ''}</small></div>`;
    }).join('');
  }
  function threadPane(lid, uid) {
    const m = me(), u = getUser(uid), l = listing(lid), b = l ? getBook(l.book_id) : null;
    if (!u) return RB.empty('Pengguna tidak ditemukan.', '#/pesan', 'Kembali', 'chat');
    const hasMsgs = S.where('messages', (x) => x.listing_id === lid && (x.sender_id === m.id || x.recipient_id === m.id)).length;
    onMount(() => {
      const unread = S.where('messages', (x) => x.listing_id === lid && x.sender_id === uid && x.recipient_id === m.id && !x.is_read);
      unread.forEach((x) => S.update('messages', x.id, { is_read: true }));
      if (unread.length) RB.renderHeader('pesan');
      const box = $('#chatBox'); if (box) box.scrollTop = box.scrollHeight;
      const f = $('#chatForm');
      if (!f) return;
      const send = (text) => {
        text = text.trim();
        if (!text) return;
        const first = !S.where('messages', (x) => x.listing_id === lid && x.sender_id === m.id && x.recipient_id === uid).length;
        S.insert('messages', { listing_id: lid, sender_id: m.id, recipient_id: uid, body: text.slice(0, 2000), is_read: false });
        if (first) notify(uid, 'message', lid);
        f.body.value = '';
        $('#chatBox').innerHTML = bubbles(lid, uid);
        $('#chatBox').scrollTop = 1e9;
        $('.quick-replies')?.remove();
        const tl = $('.thread-list');
        if (tl) tl.innerHTML = threads().map((t) => threadItem(t, t.listing_id === lid && t.other === uid)).join('');
      };
      f.addEventListener('submit', (e) => { e.preventDefault(); send(f.body.value); f.body.focus(); });
      f.body.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(f.body.value); } });
      $$('.qr').forEach((q) => q.addEventListener('click', () => send(q.textContent)));
    });
    const own = l && l.seller_id === m.id;
    return `<div class="th-head">
        <a href="#/pesan" class="icon-btn back-btn" title="Kembali">${ic('left')}</a>
        ${avatar(u, 'sm')}<span><a href="#/u/${esc(u.username)}" class="by">${esc(u.name)}</a><small class="muted">${own ? 'Calon pembeli' : 'Penjual'}</small></span>
      </div>
      ${l && b ? `<a href="#/preloved/${l.id}" class="th-listing">${photoOf(l) ? `<img src="${esc(photoOf(l))}" alt="">` : cover(b, { size: 'xs', link: false })}<span><b>${esc(b.title)}</b><small>${rupiah(l.price)} · ${COND[l.condition]?.label}</small></span><span class="status-badge s-${l.status}">${STATUS[l.status]}</span></a>` : '<div class="th-listing gone">Lapak ini sudah dihapus.</div>'}
      <div class="chat-box" id="chatBox">${bubbles(lid, uid)}</div>
      ${!hasMsgs && l && !own ? `<div class="quick-replies">${['Halo, bukunya masih tersedia?', 'Boleh minta foto tambahan?', 'Bisa nego sedikit?', 'Bisa COD di mana?'].map((t) => `<button type="button" class="qr chip">${t}</button>`).join('')}</div>` : ''}
      ${l ? `<form id="chatForm" class="chat-form"><textarea name="body" class="input" rows="1" maxlength="2000" placeholder="Tulis pesan…" autocomplete="off"></textarea><button class="btn primary" aria-label="Kirim">${ic('send')}</button></form>` : ''}`;
  }
  RB.onRemoteWhileBusy = () => {
    const m = location.hash.match(/^#\/pesan\/([\w-]+)\/([\w-]+)/);
    const box = $('#chatBox');
    if (m && box && me()) {
      box.innerHTML = bubbles(m[1], m[2]);
      box.scrollTop = 1e9;
      S.where('messages', (x) => x.listing_id === m[1] && x.sender_id === m[2] && x.recipient_id === me().id && !x.is_read).forEach((x) => S.update('messages', x.id, { is_read: true }));
    }
  };

  /* ---------- lapak di profil ---------- */
  function profShop(p, own) {
    const list = S.where('listings', (l) => l.seller_id === p.id && (own || l.status !== 'sold')).sort((a, b) => (a.status === 'sold') - (b.status === 'sold') || ts(b.created_at) - ts(a.created_at));
    const saved = own ? S.where('listing_saves', (s) => s.user_id === p.id).map((s) => listing(s.listing_id)).filter(Boolean) : [];
    return `${own ? `<div class="row-end"><a href="#/jual" class="btn primary sm">${ic('tag')}Jual buku</a></div>` : ''}
      ${list.length ? `<div class="listing-grid">${list.map(listingCard).join('')}</div>` : empty(own ? 'Kamu belum menjual buku apa pun.' : 'Belum ada lapak.', own ? '#/jual' : '', 'Jual buku pertamamu', 'bag')}
      ${saved.length ? `<section>${secHead(`Lapak yang kamu simpan <span class="count">${saved.length}</span>`, '', 'heart')}<div class="listing-grid">${saved.map(listingCard).join('')}</div></section>` : ''}`;
  }

  /* ---------- aksi ---------- */
  Object.assign(RB.ACTIONS, {
    'save-listing': (el) => {
      if (!requireAuth()) return;
      const id = el.dataset.id, m = me(), l = listing(id);
      const ex = S.first('listing_saves', (s) => s.listing_id === id && s.user_id === m.id);
      if (ex) { S.remove('listing_saves', (s) => s.id === ex.id); toast('Dihapus dari simpanan', 'muted'); }
      else { S.insert('listing_saves', { user_id: m.id, listing_id: id }); notify(l.seller_id, 'listing_saved', id); window.FX.burstAt(el, 'heart', 12); toast(`${ic('heart')} Lapak disimpan`, 'like'); }
      refresh();
    },
    'delete-listing': (el) => {
      const id = el.dataset.id;
      confirmModal('Hapus lapak?', 'Lapak, simpanan, dan obrolan terkait akan dihapus.', 'Hapus', () => {
        S.remove('listing_saves', (s) => s.listing_id === id);
        S.remove('messages', (x) => x.listing_id === id);
        S.remove('listings', (x) => x.id === id);
        toast('Lapak dihapus', 'muted');
        if (location.hash.startsWith('#/preloved/')) go('#/preloved'); else refresh();
      });
    },
    'gal-show': (el) => {
      $('#galMain img') ? ($('#galMain img').src = el.dataset.src) : null;
      $$('.gal-t').forEach((t) => t.classList.toggle('on', t === el));
    },
    'need-login': () => requireAuth(),
  });
  document.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-listing-status]');
    if (!sel) return;
    S.update('listings', sel.dataset.listingStatus, { status: sel.value, updated_at: new Date().toISOString() });
    if (sel.value === 'sold') window.FX.confetti();
    toast(`Status lapak: <b>${STATUS[sel.value]}</b>`);
    refresh();
  });

  RB.listingMini = listingMini;
  RB.listingCard = listingCard;
  RB.profShop = profShop;
  RB.COND = COND;
  RB.route(/^\/preloved$/, viewPreloved, 'preloved');
  RB.route(/^\/preloved\/([\w-]+)$/, viewListing, 'preloved');
  RB.route(/^\/jual(?:\/([\w-]+))?$/, viewSell, 'preloved');
  RB.route(/^\/pesan(?:\/([\w-]+)\/([\w-]+))?$/, viewMessages, 'pesan');
})();
