# ruangbaca v3

Jejaring sosial untuk pembaca buku, seperti Letterboxd tapi untuk buku. Kamu bisa mencatat diary bacaan, memberi rating, menulis ulasan, mengikuti teman, menjual buku preloved, dan melihat **Reading Wrap** bulanan maupun tahunan ala Spotify.

---

## 1. Coba langsung (mode demo)

Buka `index.html` di browser. Tidak perlu server. Di mode ini:

- Akun dan data tersimpan di **browser itu saja** (localStorage).
- Sampul buku, pencarian buku dunia, dan trending tetap memakai internet (Open Library & Google Books).
- Login Google belum aktif.

Mode ini cocok untuk mencoba tampilan dan fitur. Agar benar-benar jadi medsos, ikuti langkah di bagian 2.

## 2. Jadikan medsos sungguhan (mode online, Supabase, gratis)

Di mode online, pengguna dari HP dan laptop mana pun bisa saling melihat ulasan, follow, like, komentar, dan chat preloved secara **real-time**, termasuk login dengan **email** dan **Google**.

1. Buat akun dan proyek baru di <https://supabase.com> (paket gratis cukup).
2. Buka **SQL Editor → New query**, tempel seluruh isi `database/supabase.sql`, lalu klik **Run**.
   File ini aman dijalankan ulang dan tidak menghapus data.
3. Buka **Project Settings → API**, lalu salin **Project URL** dan **anon public key** ke `js/config.js`:
   ```js
   window.RUANGBACA_CONFIG = {
     supabaseUrl: 'https://xxxx.supabase.co',
     supabaseAnonKey: 'eyJhbGciOi...',
   };
   ```
4. **Hosting.** Unggah folder ini ke Netlify (cukup drag & drop di app.netlify.com/drop), Vercel, atau GitHub Pages.
   Login Google tidak berjalan dari `file://`, jadi harus lewat alamat `https://`.
5. Di Supabase, buka **Authentication → URL Configuration**. Isi *Site URL* dan *Redirect URLs* dengan alamat situsmu, misalnya `https://ruangbaca.netlify.app`.

### Mengaktifkan login Google

1. Buka <https://console.cloud.google.com> → **APIs & Services → Credentials → Create credentials → OAuth client ID** (tipe *Web application*).
2. Pada *Authorized redirect URIs*, isi `https://<id-proyek>.supabase.co/auth/v1/callback`.
3. Salin **Client ID** dan **Client Secret** ke Supabase: **Authentication → Providers → Google → Enable**.

Setelah itu, tombol **"Lanjutkan dengan Google"** di ruangbaca langsung berfungsi. Nama dan foto profil Google otomatis dipakai.

## 3. Cara melihat siapa saja yang login (email/Google)

Ada tiga cara:

| Di mana | Yang terlihat |
|---|---|
| **Halaman Admin di ruangbaca** (`#/admin`, menu avatar → Admin) | Semua pengguna, email, login via email/Google, tanggal daftar, terakhir masuk, jumlah catatan, serta moderasi ulasan & lapak |
| **Supabase → Authentication → Users** | Semua akun, email, provider, waktu daftar, dan terakhir login |
| **Supabase → Table Editor → profiles** | Data profil publik (username, nama, bio, provider) |

**Akun pertama yang mendaftar otomatis menjadi admin.** Untuk menambah admin lain, jalankan di SQL Editor:

```sql
update public.profiles set is_admin = true where username = 'username_temanmu';
```

## 4. Fitur

- **Sampul asli** untuk setiap buku, diambil otomatis dari Open Library / Google Books. Jika tidak ada, tampil sampul ilustrasi.
- **Cari buku apa saja (v3).** Pencarian langsung ke tiga sumber sekaligus: Open Library (±30 juta judul), Google Books, dan Google Books khusus **terbitan berbahasa Indonesia**. Bisa cari pakai judul, penulis, penerbit, atau **ISBN** (10/13 digit, dengan atau tanpa tanda hubung — digit periksanya divalidasi).
- **Scan barcode ISBN** dengan kamera ponsel (Chrome Android, lewat BarcodeDetector). Di browser yang belum mendukung, ISBN cukup diketik.
- **Tambah buku manual.** Kalau sebuah buku benar-benar tidak ada di mana pun (misalnya terbitan indie), anggota bisa menambahkannya: isi ISBN → tombol *Isi otomatis* mencoba mengisi data, sisanya (judul, penulis, penerbit, tahun, halaman, bahasa, genre, sinopsis, foto sampul) diisi sendiri. Ada pengecekan duplikat ISBN/judul.
- **Kolofon** di setiap halaman buku: penulis, penerbit, tahun, tebal, ISBN, bahasa, genre, dan sumber data. Sinopsis yang belum ada diambil otomatis dari Google Books / Open Library.
- **Katalog awal 285 buku yang familiar.** Seluruh serial Bumi & novel populer Tere Liye, Brian Khrisna, Valerie Patkar, J.S. Khairen, Ika Natassa, Fiersa Besari, Dee Lestari, Andrea Hirata, Pramoedya, Funiculi Funicula, Keigo Higashino, buku Korea yang hits, BookTok, Harry Potter, manga populer, dan lainnya. Sinopsis yang kosong diisi otomatis dari Google Books / Open Library saat halaman bukunya dibuka (tidak ada sinopsis karangan).
- **Terhubung penuh ke Open Library (v3.2).** Setiap buku di Open Library otomatis punya halaman di ruangbaca dan bisa dicatat, diulas, atau dijual. Hasil pencarian bisa dimuat terus (*Muat lebih banyak*), halaman penulis memuat **semua** karyanya, setiap genre punya rak subjek Open Library tanpa batas, halaman buku menampilkan **edisi lain** (ISBN, penerbit, bahasa), dan link `openlibrary.org/works/…` yang ditempel di pencarian langsung membuka bukunya. Data baru disimpan ke database hanya saat dipakai, jadi database tetap kecil.
- **ISBN ketat.** Pencarian & scan ISBN hanya menerima buku yang benar-benar memuat ISBN itu (ISBN-10 dan ISBN-13 disamakan). Kalau tidak ada yang cocok persis, muncul "ISBN tidak ditemukan" + tombol tambah buku — tidak pernah menampilkan buku "mirip".
- **Sampul terverifikasi.** Sampul hanya dipakai bila judul **dan** penulisnya cocok, gambarnya benar-benar bisa dimuat, dan belum dipakai buku lain (tidak ada lagi sampul ganda/tertukar).
- **Beranda hanya menampilkan buku yang bersampul**, diambil dari buku hits & penulis hits (Brian Khrisna, Tere Liye, Leila S. Chudori, Dee Lestari, Andrea Hirata, Ika Natassa, dll.). Pada kunjungan pertama, rak terisi bertahap sambil sampul dicari; setelah itu tersimpan di browser dan langsung tampil.
- **Ganti tema terang/gelap yang mulus**: seluruh halaman memudar bersamaan (View Transitions API), tanpa memuat ulang halaman.
- **Pembuka beranda berupa sampul buku**: sorotan buku yang lagi ramai/favorit (berganti otomatis) dan dinding sampul yang bergerak. Statistik pribadi dipindah ke samping.
- **Halaman penulis** (`#/penulis/Nama`): semua bukunya di ruangbaca, semua karyanya dari Google Books + Open Library, biografi singkat dari Open Library, jumlah pembaca & rating komunitas. Nama penulis di mana pun bisa diklik.
- **Rak penerbit Indonesia** (`#/penerbit/Nama`): Gramedia Pustaka Utama, KPG, Elex Media, Bentang, Mizan, GagasMedia, Republika, Sabak Grip, Noura, Falcon, Haru, BIP, Grasindo, Marjin Kiri, Kompas, Bukune, Mojok, dll. Datanya diambil langsung dari Google Books (terbitan berbahasa Indonesia), bisa dimuat terus sampai ratusan judul per penerbit.
- **Tombol "Cek di Gramedia.com"** di setiap buku (mencari ISBN/judulnya di Gramedia.com) dan "Cari karyanya di Gramedia.com" di halaman penulis.
- **Trending = buku zaman sekarang.** "Lagi ramai sekarang" berisi buku-buku hits terbaru (mis. *Seporsi Mie Ayam Sebelum Mati*, *Setelah Melompat Aku Ingin Hidup*, *Pareidolia*, *Setiap Hari, Hari Ini*, *Sunrise on the Reaping*) yang dikurasi dari daftar best seller Gramedia & Publishers Weekly 2025–2026, ditambah aktivitas nyata di ruangbaca. Trending tidak lagi memakai data acak Open Library — isinya hanya buku hits yang familiar, favorit pembaca Indonesia, penulis yang lagi dicari, dan aktivitas nyata anggota. Halaman Trending punya tab Semua / Indonesia / Internasional.
- Fitur trending lain: hangat di ruangbaca 7 & 30 hari, paling banyak dibaca, rating tertinggi, paling banyak diulas.
- **Tanpa ulasan palsu.** Tidak ada rating, ulasan, atau pengguna bawaan. Semua penilaian datang dari pengguna asli.
- **Preloved**: jual buku bekas dengan 1–5 foto asli, 5 tingkat kondisi plus catatan cacat, harga (bisa nego), kota, cara serah terima, dan WhatsApp (opsional). Ada status Tersedia/Dipesan/Terjual, simpan lapak, dan **chat langsung** penjual–pembeli.
- **Medsos sungguhan**: follow, feed "Mengikuti" dan "Semua", like dan komentar ulasan, like daftar, notifikasi, serta **edit profil** (foto, nama, username, bio, lokasi, situs, warna avatar).
- **Reading Wrap** bulanan & tahunan, berupa cerita layar penuh ala Spotify. Isinya: total buku, halaman & jam baca, **genre yang lagi kamu suka**, **genre yang paling sering kamu ulas**, **penulis favorit**, buku terbaik, ritme baca, statistik ulasan, dan persona baca. Ada juga **kartu gambar** 1080×1920 yang bisa diunduh atau dibagikan.
- **Efek pop di setiap klik**: riak dan efek tekan pada tombol, ledakan hati saat menyukai, bintang saat memberi rating, dan confetti saat target tercapai atau lapak dipasang.
- Fitur lain: diary, rating setengah bintang, penanda spoiler, progres halaman, tantangan baca tahunan, 4 buku favorit, daftar berperingkat, statistik, tema Linen (terang) dan Senja (gelap), tampilan ponsel dengan navigasi bawah, serta pintasan `/` cari, `L` catat, dan `Esc` tutup.

## 5. Tampilan "seperti buku" (v3)

- Latar kertas linen bertekstur halus; garis **pita kapital** (benang di punggung buku) di atas menu.
- Menu yang aktif ditandai **pita pembatas** yang menjuntai.
- Beranda tamu berbentuk **buku terbuka** dua halaman (lipatan tengah, nomor halaman, pita pembatas), dengan halaman kanan yang "membalik" saat dibuka; fitur ditulis sebagai *Bab I–IV*.
- Judul bagian bergaya kepala bab dengan ornamen ❦; deretan buku berdiri di atas **rak kayu**; setiap sampul punya **tepi halaman** seperti buku fisik.
- Halaman buku punya **kolofon**; ulasan memakai huruf baca Literata dan kertas bergaris; diary bergaya buku besar.
- Profil berbentuk **Kartu Anggota perpustakaan** lengkap dengan nomor anggota dan stempel tahun bergabung.
- Perpindahan halaman memakai animasi **balik halaman**; layar pembuka berupa buku yang terbuka; kaki halaman ditutup dengan "❦ Tamat ❦".

## 6. Palet warna

Palet ini diturunkan dari palet referensi, tetapi dibuat **adem dan netral**. Warna pastel hanya dipakai tipis sebagai aksen.

| Warna | Dipakai untuk | Kesan |
|---|---|---|
| Linen `#F7F5F0` | latar | netral hangat, tenang |
| Tinta `#26343B` | teks | lebih lembut dari hitam |
| Teal kabut `#4E7F87` (dari `#BAD6DA`) | tombol & aksi utama | tenang, tepercaya |
| Es `#E0F2F4` | sorotan lembut | sejuk |
| Sage `#DDDD7B` | sudah dibaca | pertumbuhan |
| Madu `#FFE797` | ingin dibaca, bintang | hangat, harapan |
| Mawar `#FFDBDF` / `#F791A9` | suka (hemat) | kasih sayang |

## 7. Struktur folder

```
ruangbaca/
├── index.html
├── css/style.css          tampilan, palet, animasi, responsif
├── js/config.js           ← isi URL & key Supabase di sini
├── js/catalog.js          katalog awal + daftar buku yang lagi ramai (HOT) + pemetaan genre
├── js/store.js            lapisan data: mode demo (localStorage) & online (Supabase)
├── js/api.js              Open Library & Google Books: sampul, pencarian (judul/ISBN), trending terbaru, metadata
├── js/fx.js               efek klik, partikel, confetti
├── js/app.js              halaman utama, buku, profil, daftar, admin, dll.
├── js/market.js           Preloved & chat
├── js/wrap.js             Reading Wrap
└── database/supabase.sql  tabel + keamanan (RLS) + trigger + storage + realtime + katalog
```

## 8. Catatan

- **Keamanan.** Setiap tabel dilindungi Row Level Security. Siapa pun bisa membaca konten publik, tetapi hanya pemilik yang bisa mengubah atau menghapus miliknya. Pengguna tidak bisa menjadikan dirinya admin. Pesan hanya bisa dibaca pengirim, penerima, dan admin.
- **Transaksi preloved** terjadi di luar ruangbaca (COD/transfer). Belum ada payment gateway.
- **Skala.** Aplikasi memuat data ke memori browser agar cepat dan real-time. Cara ini nyaman sampai ribuan pengguna. Jika komunitas sudah sangat besar, langkah berikutnya adalah paginasi per halaman.
- Jika trafik pencarian sudah besar, isi `googleBooksKey` di `config.js` (opsional).
- **Memperbarui daftar "Lagi ramai".** Daftar buku hits ada di `js/catalog.js` (array `HOT`, satu baris per buku: judul, penulis, tahun, genre, sinopsis, catatan tren, bahasa). Perbarui tiap 1–3 bulan mengikuti daftar best seller terbaru, lalu jalankan ulang bagian katalog di `database/supabase.sql` (untuk mode online). Sinopsis boleh dikosongkan — akan diisi otomatis dari Google Books / Open Library.
- **Upgrade dari v2 (mode online).** Jalankan ulang `database/supabase.sql` di SQL Editor Supabase. Skrip ini aman dijalankan berulang dan akan menambah kolom baru (`isbn`, `publisher`, `language`, `hot`, `trend_note`) tanpa menghapus data.
- **Soal data Gramedia.com.** Gramedia tidak menyediakan API publik, dan sinopsis/sampul di sana adalah konten mereka, jadi ruangbaca tidak menyalin katalog Gramedia. Sebagai gantinya: kurasi best seller dari daftar bulanan yang Gramedia umumkan, rak penerbit grup Gramedia lewat Google Books, dan tautan langsung ke Gramedia.com. Untuk data penuh, jalur resminya adalah kerja sama/afiliasi dengan Gramedia.
- **Menambah buku favorit.** Tambahkan baris di array `MORE` (`js/catalog.js`); untuk menandainya sebagai favorit, tambahkan judulnya ke `FAV`.
- **Sampul manual.** Buku yang tidak punya sampul di Google Books maupun Open Library tidak ditampilkan di rak beranda. Kalau mau tetap tampil, tempel link gambar sampulnya di objek `COVERS` (`js/catalog.js`).
- **Kunci Google Books (disarankan untuk produksi).** Tanpa kunci, Google Books membatasi jumlah permintaan per hari. Isi `googleBooksKey` di `js/config.js` (gratis dari Google Cloud Console → Books API) agar pencarian sampul tetap lancar saat pengunjung banyak.
