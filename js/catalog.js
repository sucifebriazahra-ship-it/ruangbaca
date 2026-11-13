/* =========================================================================
   ruangbaca — katalog awal
   Buku-buku populer & klasik sebagai titik awal. Sampul diambil otomatis
   dari Open Library / Google Books. Buku lain dari seluruh dunia bisa dicari
   langsung lewat fitur pencarian (Open Library ±30 juta judul + Google Books).
   TIDAK ADA rating / ulasan bawaan: semua penilaian datang dari pengguna asli.
   ========================================================================= */
(function (global) {
  'use strict';

  const GENRES = [
    'Fiksi', 'Sastra Indonesia', 'Sastra Dunia', 'Klasik', 'Romansa', 'Fantasi', 'Fiksi Ilmiah',
    'Misteri & Thriller', 'Horor', 'Young Adult', 'Fiksi Sejarah', 'Non-Fiksi', 'Pengembangan Diri',
    'Psikologi', 'Bisnis & Keuangan', 'Sejarah', 'Filsafat', 'Memoar', 'Sains', 'Puisi', 'Komik & Manga',
  ];

  /* ---------------------------------------------------------------------
     LAGI RAMAI SEKARANG (2025–2026)
     Disusun dari daftar best seller Gramedia.com (Des 2025 – Okt 2026),
     "Buku Paling Dicari" Gramedia April 2026, dan daftar bestseller
     Publishers Weekly 2026. Sinopsis yang dikosongkan akan diisi otomatis
     dari Google Books / Open Library saat halaman buku dibuka.
     [judul, penulis, tahun, [genre], sinopsis, catatan tren, bahasa]
     --------------------------------------------------------------------- */
  const HOT = [
    ['Seporsi Mie Ayam Sebelum Mati', 'Brian Khrisna', 2025, ['Sastra Indonesia', 'Fiksi'], 'Ale, 37 tahun, merasa tak pernah dianggap — oleh rekan kerja, tetangga, bahkan keluarganya. Ia memutuskan pergi dalam 24 jam, tapi sebelum itu ingin makan seporsi mie ayam terakhir. Kisah tentang kesehatan mental dan alasan-alasan kecil untuk bertahan.', 'Novel terlaris · cetak ulang 100+ kali', 'id'],
    ['Setelah Melompat Aku Ingin Hidup', 'Brian Khrisna', 2026, ['Sastra Indonesia', 'Fantasi'], 'Di tahun terakhir dari 999 tahun tugasnya, Mori sang pencabut nyawa menyaksikan seseorang yang tiba-tiba ingin hidup sedetik setelah melompat. Dari situ ia mulai mencari tahu siapa dirinya sebelum menjadi pencabut nyawa.', 'Best seller Gramedia · Jun 2026', 'id'],
    ['Pareidolia', 'Tere Liye', 2026, ['Sastra Indonesia', 'Fiksi'], 'Novel tentang ilusi, sudut pandang, dan pemujaan semu manusia — tentang hal-hal yang tampak indah namun berujung pahit.', 'Best seller Gramedia · Sep 2026', 'id'],
    ['Setiap Hari, Hari Ini', 'Valerie Patkar', 2026, ['Sastra Indonesia', 'Romansa'], 'Kisah tentang waktu, cinta, dan kesempatan kedua — ajakan untuk hadir sepenuhnya dan berhenti menunda bahagia.', 'Paling dicari · Apr 2026', 'id'],
    ['Seorang Wanita yang Ingin Menjadi Pohon Semangka di Kehidupan Berikutnya', 'Andreas Kurniawan', 2025, ['Non-Fiksi', 'Psikologi'], 'Seorang psikiater menuturkan kisah pasiennya yang ingin terlahir kembali sebagai pohon semangka — renungan hangat tentang ketidaksempurnaan, penyesalan, dan berdamai dengan diri sendiri.', 'Best seller Gramedia · Mar 2026', 'id'],
    ['Seorang Anak yang Bersembunyi di Balik Topeng Superhero', 'Andreas Kurniawan', null, ['Non-Fiksi', 'Psikologi'], 'Dari sudut pandang psikiater: anak yang tampak kuat bisa saja menyembunyikan luka emosional, dan kehadiran emosional orang tua sangat berarti.', 'Paling dicari · Apr 2026', 'id'],
    ['Sisi Tergelap Surga', 'Brian Khrisna', 2023, ['Sastra Indonesia', 'Fiksi'], '', 'Best seller Gramedia · Mei 2026', 'id'],
    ['KHW: Kisah Horor Wawak', 'Nadia Omara', null, ['Horor', 'Sastra Indonesia'], '', 'Best seller Gramedia · Okt 2026', 'id'],
    ['Dream Notes: Kilau & Gadang di Dunia Imaji', 'J.S. Khairen', null, ['Sastra Indonesia', 'Fantasi'], '', 'Best seller Gramedia · Okt 2026', 'id'],
    ['3726 MDPL', 'Nurwina Sari', null, ['Sastra Indonesia', 'Romansa'], '', 'Best seller Gramedia · Sep 2026', 'id'],
    ['Memburu Muhammad', 'Feby Indirani', null, ['Sastra Indonesia', 'Fiksi'], '', 'Best seller Gramedia · Sep 2026', 'id'],
    ['Makanya, Mikir', 'Abigail Limuria & Cania Citta', null, ['Non-Fiksi', 'Filsafat'], '', 'Best seller Gramedia · Mei 2026', 'id'],
    ['What It Takes: Asia Tenggara, Dari Tepi Menuju Inti Kesadaran Global', 'Gita Wirjawan', null, ['Non-Fiksi', 'Sejarah'], '', 'Best seller Gramedia · Agu 2026', 'id'],
    ['Dompet Ayah Sepatu Ibu', 'J.S. Khairen', null, ['Sastra Indonesia', 'Fiksi'], '', 'Best seller Gramedia · Apr 2026', 'id'],
    ['Tukar Takdir', 'Valiant Budi', 2019, ['Sastra Indonesia', 'Fiksi'], 'Dua belas cerita tentang nasib — perkara yang kita takuti dan pasti terjadi, salah satunya mungkin pernah, sedang, atau akan jadi milikmu.', 'Diadaptasi ke film 2025', 'id'],
    ['Buy Yourself the Damn Flowers', 'Tam Kaur', null, ['Pengembangan Diri', 'Psikologi'], '', 'Best seller Gramedia · Okt 2026', 'en'],
    ['The Correspondent', 'Virginia Evans', 2025, ['Sastra Dunia', 'Fiksi'], '', 'Bestseller Publishers Weekly 2026', 'en'],
    ['Yesteryear', 'Caro Claire Burke', 2026, ['Fiksi'], '', 'Bestseller Publishers Weekly 2026', 'en'],
    ['The Calamity Club', 'Kathryn Stockett', 2026, ['Fiksi Sejarah'], '', 'Bestseller Publishers Weekly · Agu 2026', 'en'],
    ['Whistler', 'Ann Patchett', 2026, ['Sastra Dunia', 'Fiksi'], '', 'Bestseller Publishers Weekly 2026', 'en'],
    ['Kin', 'Tayari Jones', 2026, ['Sastra Dunia', 'Fiksi'], '', 'Bestseller Publishers Weekly · Mar 2026', 'en'],
    ['The Astral Library', 'Kate Quinn', 2026, ['Fantasi', 'Fiksi Sejarah'], '', 'Bestseller Publishers Weekly · Feb 2026', 'en'],
    ['Theo of Golden', 'Allen Levi', null, ['Fiksi'], '', 'Bestseller Publishers Weekly 2026', 'en'],
    ['Daggermouth', 'H.M. Wolfe', 2026, ['Fantasi', 'Romansa'], '', 'Bestseller Publishers Weekly · Agu 2026', 'en'],
    ['Sea of Charms', 'Sarah Beth Durst', 2026, ['Fantasi', 'Romansa'], '', 'Bestseller Publishers Weekly · Agu 2026', 'en'],
    ['Strangers', 'Belle Burden', 2026, ['Memoar', 'Non-Fiksi'], '', 'Bestseller Publishers Weekly 2026', 'en'],
    ['Naoko', 'Keigo Higashino', null, ['Misteri & Thriller', 'Sastra Dunia'], 'Setelah kecelakaan bus, jiwa seorang istri terbangun di tubuh putrinya — kisah keluarga yang ganjil sekaligus menyentuh.', 'Best seller Gramedia · Mei 2026', 'ja'],
    ['Teka-Teki Gambar Aneh', 'Uketsu', null, ['Misteri & Thriller', 'Sastra Dunia'], 'Misteri yang dipecahkan lewat serangkaian gambar ganjil — setiap sketsa menyimpan petunjuk.', 'Best seller Gramedia · Feb 2026', 'ja'],
    ['Goodbye, Eri', 'Tatsuki Fujimoto', null, ['Komik & Manga'], '', 'Best seller Gramedia · Jun 2026', 'ja'],
    ['As Long as the Lemon Trees Grow', 'Zoulfa Katouh', 2022, ['Sastra Dunia', 'Romansa'], '', 'Best seller Gramedia · Mei 2026', 'en'],
  ];
  const HOT_EXTRA = {
    // buku di katalog lama yang juga sedang ramai lagi
    'Project Hail Mary': 'Paling dicari · Apr 2026',
    'Laut Bercerita': 'Best seller Gramedia · Agu 2026',
    'The Let Them Theory': 'Best seller Gramedia · Feb 2026',
    'Onyx Storm': 'Fantasi paling viral 2025',
    'Sunrise on the Reaping': 'Best seller Gramedia Digital · Nov 2025',
    'The Housemaid': 'Masih di daftar bestseller 2026',
  };

  // [judul, penulis, tahun, [genre], sinopsis singkat]
  const RAW = [
    // ---------- Indonesia ----------
    ['Laskar Pelangi', 'Andrea Hirata', 2005, ['Sastra Indonesia', 'Fiksi'], 'Sepuluh anak dari keluarga miskin di Belitong berjuang bersekolah di SD yang nyaris ditutup, ditemani guru yang tak pernah menyerah.'],
    ['Sang Pemimpi', 'Andrea Hirata', 2006, ['Sastra Indonesia', 'Fiksi'], 'Ikal, Arai, dan Jimbron menjalani masa SMA di Belitong dengan kerja keras, kenakalan, dan mimpi besar untuk sekolah ke Prancis.'],
    ['Orang-Orang Biasa', 'Andrea Hirata', 2019, ['Sastra Indonesia', 'Fiksi'], 'Sekelompok sahabat yang serba biasa merencanakan aksi nekat demi membiayai kuliah anak salah satu dari mereka.'],
    ['Bumi Manusia', 'Pramoedya Ananta Toer', 1980, ['Sastra Indonesia', 'Fiksi Sejarah', 'Klasik'], 'Minke, pemuda pribumi terpelajar di akhir abad ke-19, jatuh cinta pada Annelies dan berhadapan dengan hukum kolonial yang timpang.'],
    ['Anak Semua Bangsa', 'Pramoedya Ananta Toer', 1980, ['Sastra Indonesia', 'Fiksi Sejarah', 'Klasik'], 'Lanjutan kisah Minke yang mulai belajar melihat penderitaan bangsanya sendiri di bawah kolonialisme.'],
    ['Cantik Itu Luka', 'Eka Kurniawan', 2002, ['Sastra Indonesia', 'Fiksi Sejarah'], 'Dewi Ayu bangkit dari kubur setelah dua puluh satu tahun, membuka saga keluarga yang liar dan getir di kota fiktif Halimunda.'],
    ['Lelaki Harimau', 'Eka Kurniawan', 2004, ['Sastra Indonesia', 'Fiksi'], 'Seorang pemuda desa melakukan pembunuhan brutal dan mengaku ada harimau putih bersemayam di dalam tubuhnya.'],
    ['Seperti Dendam, Rindu Harus Dibayar Tuntas', 'Eka Kurniawan', 2014, ['Sastra Indonesia', 'Fiksi'], 'Ajo Kawir, jagoan kampung yang gemar berkelahi, menyimpan rahasia yang memalukan sekaligus mengubah hidupnya.'],
    ['Laut Bercerita', 'Leila S. Chudori', 2017, ['Sastra Indonesia', 'Fiksi Sejarah'], 'Biru Laut, mahasiswa aktivis, hilang menjelang 1998. Keluarganya terus menunggu jawaban yang tak kunjung datang.'],
    ['Pulang', 'Leila S. Chudori', 2012, ['Sastra Indonesia', 'Fiksi Sejarah'], 'Para eksil politik membuka restoran di Paris. Puluhan tahun kemudian, putri salah satu dari mereka pergi ke Jakarta yang sedang bergolak.'],
    ['Ronggeng Dukuh Paruk', 'Ahmad Tohari', 1982, ['Sastra Indonesia', 'Klasik'], 'Srintil dinobatkan menjadi ronggeng di dukuh kecil yang miskin, sementara sahabat masa kecilnya memilih pergi.'],
    ['Negeri 5 Menara', 'Ahmad Fuadi', 2009, ['Sastra Indonesia', 'Fiksi'], 'Alif merantau ke pesantren dan bersahabat dengan lima kawan. Berbekal “man jadda wajada”, mereka menggantungkan mimpi setinggi menara.'],
    ['Perahu Kertas', 'Dee Lestari', 2009, ['Sastra Indonesia', 'Romansa'], 'Kugy si calon penulis dongeng dan Keenan si calon pelukis bertemu di Bandung, lalu takdir terus mempertemukan dan memisahkan mereka.'],
    ['Supernova: Ksatria, Puteri, dan Bintang Jatuh', 'Dee Lestari', 2001, ['Sastra Indonesia', 'Fiksi Ilmiah'], 'Sepasang penulis merancang kisah cinta segitiga yang perlahan bersinggungan dengan kehidupan nyata, dibalut sains dan filsafat.'],
    ['Saman', 'Ayu Utami', 1998, ['Sastra Indonesia', 'Fiksi'], 'Kisah seorang mantan pastor yang membela petani dan empat sahabat perempuan yang menantang batas-batas di akhir Orde Baru.'],
    ['Gadis Kretek', 'Ratih Kumala', 2012, ['Sastra Indonesia', 'Fiksi Sejarah', 'Romansa'], 'Seorang juragan kretek yang sekarat menyebut nama perempuan misterius. Anak-anaknya menelusuri masa lalu dan sejarah keluarga mereka.'],
    ['Amba', 'Laksmi Pamuntjak', 2012, ['Sastra Indonesia', 'Fiksi Sejarah', 'Romansa'], 'Amba menempuh perjalanan ke Pulau Buru untuk mencari jejak kekasih yang hilang setelah 1965.'],
    ['Hujan', 'Tere Liye', 2016, ['Sastra Indonesia', 'Fiksi Ilmiah', 'Romansa'], 'Di masa depan setelah bencana besar, Lail tumbuh dewasa bersama Esok, sosok yang menyelamatkannya — tentang cinta dan keinginan untuk melupakan.'],
    ['Bumi', 'Tere Liye', 2014, ['Sastra Indonesia', 'Fantasi', 'Young Adult'], 'Raib, remaja lima belas tahun, bisa menghilang. Bersama dua sahabatnya ia terseret ke petualangan di dunia paralel.'],
    ['Rindu', 'Tere Liye', 2014, ['Sastra Indonesia', 'Fiksi Sejarah'], 'Sebuah kapal haji berlayar dari Makassar pada masa kolonial, membawa penumpang dengan pertanyaan-pertanyaan hidup yang belum terjawab.'],
    ['Dilan: Dia adalah Dilanku Tahun 1990', 'Pidi Baiq', 2014, ['Sastra Indonesia', 'Romansa', 'Young Adult'], 'Milea, siswi pindahan di Bandung tahun 1990, didekati Dilan — anak geng motor yang ternyata puitis dan penuh kejutan.'],
    ['Ayat-Ayat Cinta', 'Habiburrahman El Shirazy', 2004, ['Sastra Indonesia', 'Romansa'], 'Fahri, mahasiswa Indonesia di Kairo, menjalani hidup sederhana yang tiba-tiba diwarnai cinta, fitnah, dan ujian iman.'],
    ['Home Sweet Loan', 'Almira Bastari', 2022, ['Sastra Indonesia', 'Fiksi'], 'Kaluna menabung mati-matian demi rumah impian sendiri, sambil tinggal berdesakan dengan keluarga besarnya di Jakarta.'],
    ['Garis Waktu', 'Fiersa Besari', 2016, ['Sastra Indonesia', 'Puisi', 'Romansa'], 'Kumpulan tulisan tentang perjalanan mencintai, kehilangan, dan belajar mengikhlaskan.'],
    ['Filosofi Teras', 'Henry Manampiring', 2018, ['Non-Fiksi', 'Filsafat', 'Pengembangan Diri'], 'Pengantar filsafat Stoa yang ringan dan membumi untuk menghadapi kecemasan dan hal-hal di luar kendali kita.'],
    ['Sebuah Seni untuk Bersikap Bodo Amat', 'Mark Manson', 2016, ['Non-Fiksi', 'Pengembangan Diri'], 'Ajakan jujur untuk berhenti mengejar semua hal, dan memilih dengan sadar apa yang benar-benar layak dipedulikan.'],

    // ---------- Hits internasional 2022–2025 ----------
    ['Fourth Wing', 'Rebecca Yarros', 2023, ['Fantasi', 'Romansa', 'Young Adult'], 'Violet Sorrengail dipaksa masuk akademi militer penunggang naga, tempat gagal berarti mati.'],
    ['Iron Flame', 'Rebecca Yarros', 2023, ['Fantasi', 'Romansa'], 'Tahun kedua di akademi penunggang naga: rahasia kerajaan terkuak dan perang semakin dekat.'],
    ['Onyx Storm', 'Rebecca Yarros', 2025, ['Fantasi', 'Romansa'], 'Buku ketiga seri Empyrean. Violet mencari sekutu di luar batas negerinya saat ancaman makin gelap.'],
    ['A Court of Thorns and Roses', 'Sarah J. Maas', 2015, ['Fantasi', 'Romansa'], 'Feyre, pemburu muda, membunuh seekor serigala dan dibawa ke negeri peri yang memikat sekaligus berbahaya.'],
    ['It Ends with Us', 'Colleen Hoover', 2016, ['Romansa', 'Fiksi'], 'Lily jatuh cinta pada seorang ahli bedah karismatik, sampai masa lalu dan cinta pertamanya kembali muncul.'],
    ['Verity', 'Colleen Hoover', 2018, ['Misteri & Thriller'], 'Seorang penulis yang kesulitan diminta menyelesaikan seri novel penulis terkenal — dan menemukan naskah otobiografi yang mengerikan.'],
    ['The Housemaid', 'Freida McFadden', 2022, ['Misteri & Thriller'], 'Millie mendapat pekerjaan sebagai asisten rumah tangga di rumah keluarga kaya. Pintu kamarnya terkunci dari luar.'],
    ['The Seven Husbands of Evelyn Hugo', 'Taylor Jenkins Reid', 2017, ['Fiksi', 'Romansa', 'Fiksi Sejarah'], 'Ikon Hollywood yang tertutup akhirnya menceritakan kisah hidup dan tujuh pernikahannya kepada seorang jurnalis muda.'],
    ['Funny Story', 'Emily Henry', 2024, ['Romansa'], 'Dua orang yang ditinggal pasangannya — yang kini saling berpacaran — memutuskan tinggal serumah dan berpura-pura bahagia.'],
    ['Great Big Beautiful Life', 'Emily Henry', 2025, ['Romansa', 'Fiksi'], 'Dua penulis bersaing untuk menulis biografi seorang pewaris kaya yang misterius, dan masing-masing hanya mendengar separuh cerita.'],
    ['Tomorrow, and Tomorrow, and Tomorrow', 'Gabrielle Zevin', 2022, ['Fiksi', 'Sastra Dunia'], 'Persahabatan dua pembuat video game selama tiga puluh tahun: tentang kreativitas, kegagalan, dan cinta yang tak bernama.'],
    ['Lessons in Chemistry', 'Bonnie Garmus', 2022, ['Fiksi', 'Fiksi Sejarah'], 'Ahli kimia brilian di tahun 1960-an yang diremehkan dunia sains justru menjadi bintang acara memasak di televisi.'],
    ['Yellowface', 'R. F. Kuang', 2023, ['Fiksi', 'Misteri & Thriller'], 'Seorang penulis mencuri naskah sahabatnya yang meninggal dan menerbitkannya atas nama sendiri. Satire tajam dunia penerbitan.'],
    ['Babel', 'R. F. Kuang', 2022, ['Fantasi', 'Fiksi Sejarah'], 'Di Oxford abad ke-19, penerjemahan adalah sihir dan kekuasaan. Seorang mahasiswa mulai mempertanyakan untuk siapa ia bekerja.'],
    ['James', 'Percival Everett', 2024, ['Sastra Dunia', 'Fiksi Sejarah'], 'Kisah petualangan Huckleberry Finn diceritakan ulang dari sudut pandang Jim, dengan suara yang cerdas dan tajam.'],
    ['Intermezzo', 'Sally Rooney', 2024, ['Sastra Dunia', 'Fiksi'], 'Dua kakak beradik yang sangat berbeda berusaha menjalani hidup dan cinta setelah kematian ayah mereka.'],
    ['Normal People', 'Sally Rooney', 2018, ['Sastra Dunia', 'Romansa'], 'Connell dan Marianne tumbuh dari sekolah di kota kecil Irlandia hingga kuliah, saling tarik-menarik selama bertahun-tahun.'],
    ['The Women', 'Kristin Hannah', 2024, ['Fiksi Sejarah'], 'Seorang perawat muda bertugas di Perang Vietnam, lalu pulang ke negeri yang tak ingin mendengar kisahnya.'],
    ['Demon Copperhead', 'Barbara Kingsolver', 2022, ['Sastra Dunia'], 'David Copperfield diceritakan ulang di pegunungan Appalachia modern, di tengah krisis opioid.'],
    ['Orbital', 'Samantha Harvey', 2023, ['Sastra Dunia'], 'Satu hari di stasiun luar angkasa: enam astronaut, enam belas kali mengorbit Bumi, dan renungan tentang planet kita.'],
    ['Sunrise on the Reaping', 'Suzanne Collins', 2025, ['Fiksi Ilmiah', 'Young Adult', 'Fantasi'], 'Kembali ke Panem: kisah Hunger Games yang diikuti Haymitch muda, jauh sebelum ia menjadi mentor.'],
    ['The Let Them Theory', 'Mel Robbins', 2024, ['Pengembangan Diri', 'Psikologi'], 'Dua kata sederhana untuk berhenti mengendalikan orang lain dan mengembalikan energi pada hal yang bisa kita kendalikan.'],
    ['The Anxious Generation', 'Jonathan Haidt', 2024, ['Non-Fiksi', 'Psikologi'], 'Bagaimana ponsel pintar dan media sosial mengubah masa kanak-kanak dan memicu krisis kesehatan mental remaja.'],
    ['Butter', 'Asako Yuzuki', 2017, ['Sastra Dunia', 'Misteri & Thriller'], 'Seorang jurnalis mewawancarai juru masak yang dipenjara atas tuduhan pembunuhan — dan perlahan terhanyut oleh obsesinya pada makanan.'],
    ['Remarkably Bright Creatures', 'Shelby Van Pelt', 2022, ['Fiksi'], 'Seorang janda yang bekerja malam di akuarium bersahabat dengan gurita yang sangat cerdas.'],

    // ---------- Populer sepanjang masa ----------
    ['Atomic Habits', 'James Clear', 2018, ['Pengembangan Diri', 'Non-Fiksi'], 'Panduan praktis membangun kebiasaan baik dan menghentikan kebiasaan buruk lewat perubahan kecil yang konsisten.'],
    ['The Psychology of Money', 'Morgan Housel', 2020, ['Bisnis & Keuangan', 'Psikologi'], 'Kumpulan kisah pendek tentang mengapa perilaku kita terhadap uang lebih penting daripada kecerdasan finansial.'],
    ['Rich Dad Poor Dad', 'Robert T. Kiyosaki', 1997, ['Bisnis & Keuangan', 'Pengembangan Diri'], 'Pelajaran keuangan dari dua sosok ayah dengan cara pandang yang sangat berbeda tentang uang dan aset.'],
    ['Sapiens', 'Yuval Noah Harari', 2011, ['Sejarah', 'Non-Fiksi'], 'Riwayat singkat umat manusia, dari revolusi kognitif hingga revolusi ilmiah.'],
    ['Thinking, Fast and Slow', 'Daniel Kahneman', 2011, ['Psikologi', 'Non-Fiksi'], 'Dua sistem berpikir manusia — yang cepat dan intuitif, dan yang lambat dan logis — serta bias-bias yang menyertainya.'],
    ["Man's Search for Meaning", 'Viktor E. Frankl', 1946, ['Psikologi', 'Memoar', 'Filsafat'], 'Pengalaman seorang psikiater di kamp konsentrasi dan gagasannya bahwa makna hidup bisa ditemukan bahkan dalam penderitaan.'],
    ['Educated', 'Tara Westover', 2018, ['Memoar', 'Non-Fiksi'], 'Tumbuh tanpa sekolah formal di pegunungan Idaho, seorang perempuan menempuh jalan panjang hingga meraih gelar doktor.'],
    ['Becoming', 'Michelle Obama', 2018, ['Memoar', 'Non-Fiksi'], 'Memoar tentang masa kecil di Chicago, karier, keluarga, hingga tahun-tahun di Gedung Putih.'],
    ['Ikigai', 'Héctor García & Francesc Miralles', 2016, ['Pengembangan Diri', 'Filsafat'], 'Menjelajahi konsep Jepang tentang alasan untuk bangun setiap pagi, terinspirasi dari kebiasaan orang-orang berumur panjang.'],
    ['Deep Work', 'Cal Newport', 2016, ['Pengembangan Diri', 'Bisnis & Keuangan'], 'Kemampuan fokus mendalam tanpa distraksi semakin langka — dan semakin berharga.'],
    ['Mindset', 'Carol S. Dweck', 2006, ['Psikologi', 'Pengembangan Diri'], 'Perbedaan pola pikir tetap dan pola pikir bertumbuh, serta dampaknya pada belajar dan kesuksesan.'],
    ['The 48 Laws of Power', 'Robert Greene', 1998, ['Non-Fiksi', 'Sejarah'], 'Empat puluh delapan prinsip tentang kekuasaan, diambil dari kisah tokoh-tokoh sejarah.'],
    ['Project Hail Mary', 'Andy Weir', 2021, ['Fiksi Ilmiah'], 'Seorang guru sains terbangun sendirian di pesawat antariksa tanpa ingatan, dengan misi menyelamatkan Bumi.'],
    ['Dune', 'Frank Herbert', 1965, ['Fiksi Ilmiah', 'Klasik'], 'Paul Atreides dan keluarganya mengambil alih planet gurun Arrakis, satu-satunya sumber rempah paling berharga di jagat raya.'],
    ['The Midnight Library', 'Matt Haig', 2020, ['Fiksi', 'Fantasi'], 'Di antara hidup dan mati, Nora menemukan perpustakaan berisi semua kemungkinan hidup yang bisa ia jalani.'],
    ['Klara and the Sun', 'Kazuo Ishiguro', 2021, ['Fiksi Ilmiah', 'Sastra Dunia'], 'Klara, sahabat buatan yang sangat pengamat, menunggu dipilih oleh seorang anak. Renungan tenang tentang cinta.'],
    ['Piranesi', 'Susanna Clarke', 2020, ['Fantasi', 'Misteri & Thriller'], 'Piranesi tinggal di sebuah Rumah berisi aula tanpa ujung dan laut yang pasang-surut, hingga ia mulai meragukan dunianya.'],
    ['The Silent Patient', 'Alex Michaelides', 2019, ['Misteri & Thriller'], 'Seorang pelukis menembak suaminya lalu berhenti bicara. Seorang psikoterapis bertekad membuatnya bersuara.'],
    ['Where the Crawdads Sing', 'Delia Owens', 2018, ['Fiksi', 'Misteri & Thriller'], 'Gadis yang tumbuh sendirian di rawa-rawa Carolina Utara menjadi tersangka ketika seorang pemuda ditemukan tewas.'],
    ['Funiculi Funicula', 'Toshikazu Kawaguchi', 2015, ['Sastra Dunia', 'Fantasi'], 'Di sebuah kafe kecil di Tokyo, kamu bisa kembali ke masa lalu — asal kembali sebelum kopimu dingin.'],
    ['Convenience Store Woman', 'Sayaka Murata', 2016, ['Sastra Dunia'], 'Keiko sudah delapan belas tahun bekerja di minimarket dan merasa utuh di sana, meski dunia menuntutnya jadi “normal”.'],
    ['Almond', 'Sohn Won-pyung', 2017, ['Sastra Dunia', 'Young Adult'], 'Remaja yang sulit merasakan emosi menjalin persahabatan tak terduga setelah tragedi mengubah hidupnya.'],
    ['Kafka on the Shore', 'Haruki Murakami', 2002, ['Sastra Dunia', 'Fantasi'], 'Seorang remaja kabur dari rumah, sementara seorang kakek yang bisa bicara dengan kucing memulai perjalanan misterius.'],
    ['Norwegian Wood', 'Haruki Murakami', 1987, ['Sastra Dunia', 'Romansa'], 'Toru Watanabe mengenang masa kuliahnya di Tokyo akhir 1960-an, terbelah antara dua perempuan yang sangat berbeda.'],
    ['The Song of Achilles', 'Madeline Miller', 2011, ['Fantasi', 'Romansa', 'Fiksi Sejarah'], 'Kisah Patroclus dan Achilles, dari masa kecil hingga Perang Troya.'],
    ['Circe', 'Madeline Miller', 2018, ['Fantasi', 'Sastra Dunia'], 'Putri dewa matahari yang diasingkan ke sebuah pulau menemukan kekuatannya sendiri sebagai penyihir.'],
    ['Six of Crows', 'Leigh Bardugo', 2015, ['Fantasi', 'Young Adult'], 'Enam remaja buangan direkrut untuk perampokan yang mustahil.'],
    ['The Hunger Games', 'Suzanne Collins', 2008, ['Fiksi Ilmiah', 'Young Adult'], 'Katniss Everdeen menggantikan adiknya dalam ajang bertahan hidup yang disiarkan ke seluruh negeri.'],
    ["Harry Potter and the Philosopher's Stone", 'J.K. Rowling', 1997, ['Fantasi', 'Young Adult'], 'Di ulang tahun ke-11, Harry mengetahui bahwa ia seorang penyihir dan diundang ke Sekolah Hogwarts.'],
    ['The Hobbit', 'J.R.R. Tolkien', 1937, ['Fantasi', 'Klasik'], 'Bilbo Baggins yang cinta kenyamanan ikut petualangan sekelompok kurcaci untuk merebut kembali harta dari seekor naga.'],
    ['The Book Thief', 'Markus Zusak', 2005, ['Fiksi Sejarah', 'Young Adult'], 'Di Jerman masa Nazi, seorang gadis kecil mencuri buku dan berbagi kata-kata dengan orang-orang di sekitarnya.'],
    ['The Kite Runner', 'Khaled Hosseini', 2003, ['Sastra Dunia', 'Fiksi Sejarah'], 'Persahabatan dua anak laki-laki di Kabul, pengkhianatan, dan perjalanan panjang menuju penebusan.'],
    ['The Alchemist', 'Paulo Coelho', 1988, ['Sastra Dunia', 'Fiksi'], 'Seorang gembala muda menempuh perjalanan mencari harta karun dan menemukan makna takdirnya sendiri.'],
    ['The Little Prince', 'Antoine de Saint-Exupéry', 1943, ['Klasik', 'Fantasi'], 'Seorang pilot yang terdampar di gurun bertemu pangeran kecil dari asteroid yang jauh.'],
    ['1984', 'George Orwell', 1949, ['Klasik', 'Fiksi Ilmiah'], 'Winston Smith hidup di bawah Partai yang mengendalikan sejarah, bahasa, bahkan pikiran.'],
    ['Animal Farm', 'George Orwell', 1945, ['Klasik', 'Fiksi'], 'Hewan-hewan di sebuah peternakan memberontak terhadap pemiliknya — lalu kekuasaan perlahan mengubah segalanya.'],
    ['To Kill a Mockingbird', 'Harper Lee', 1960, ['Klasik', 'Sastra Dunia'], 'Lewat mata Scout kecil, kita menyaksikan ayahnya membela seorang pria kulit hitam yang dituduh secara tidak adil.'],
    ['Pride and Prejudice', 'Jane Austen', 1813, ['Klasik', 'Romansa'], 'Elizabeth Bennet dan Mr. Darcy belajar melampaui kesan pertama, gengsi, dan prasangka.'],
    ['The Great Gatsby', 'F. Scott Fitzgerald', 1925, ['Klasik', 'Sastra Dunia'], 'Pesta-pesta mewah Jay Gatsby menyimpan satu kerinduan: cinta lama yang tinggal di seberang teluk.'],
    ['One Hundred Years of Solitude', 'Gabriel García Márquez', 1967, ['Klasik', 'Sastra Dunia'], 'Tujuh generasi keluarga Buendía di kota Macondo, dalam kisah realisme magis yang legendaris.'],
    ['Crime and Punishment', 'Fyodor Dostoevsky', 1866, ['Klasik', 'Sastra Dunia', 'Filsafat'], 'Seorang mahasiswa miskin di St. Petersburg melakukan pembunuhan dan bergulat dengan rasa bersalahnya.'],
    ['Little Women', 'Louisa May Alcott', 1868, ['Klasik', 'Fiksi'], 'Empat saudari March tumbuh dewasa dengan mimpi dan jalan hidup masing-masing.'],
    ['One Piece, Vol. 1', 'Eiichiro Oda', 1997, ['Komik & Manga', 'Fantasi'], 'Monkey D. Luffy, bocah bertubuh karet, berlayar untuk menjadi Raja Bajak Laut.'],
  ];

  /* ---------------------------------------------------------------------
     FAVORIT PEMBACA INDONESIA — buku yang familiar & terus dicari
     (serial Tere Liye, Funiculi Funicula, Keigo Higashino, Dee, Andrea
     Hirata, Ika Natassa, Fiersa Besari, BookTok, manga populer, dll.)
     Sinopsis sengaja dikosongkan: diisi otomatis dari Google Books /
     Open Library, supaya tidak ada deskripsi karangan.
     [judul, penulis, tahun, [genre], bahasa]
     --------------------------------------------------------------------- */
  const S_ID = ['Sastra Indonesia', 'Fiksi'];
  const MORE = [
    // Tere Liye
    ['Bulan', 'Tere Liye', 2015, ['Sastra Indonesia', 'Fantasi'], 'id'],
    ['Matahari', 'Tere Liye', 2016, ['Sastra Indonesia', 'Fantasi'], 'id'],
    ['Bintang', 'Tere Liye', 2017, ['Sastra Indonesia', 'Fantasi'], 'id'],
    ['Ceros dan Batozar', 'Tere Liye', 2018, ['Sastra Indonesia', 'Fantasi'], 'id'],
    ['Komet', 'Tere Liye', 2018, ['Sastra Indonesia', 'Fantasi'], 'id'],
    ['Komet Minor', 'Tere Liye', 2019, ['Sastra Indonesia', 'Fantasi'], 'id'],
    ['Selena', 'Tere Liye', 2020, ['Sastra Indonesia', 'Fantasi'], 'id'],
    ['Nebula', 'Tere Liye', 2020, ['Sastra Indonesia', 'Fantasi'], 'id'],
    ['Si Putih', 'Tere Liye', 2021, ['Sastra Indonesia', 'Fantasi'], 'id'],
    ['Lumpu', 'Tere Liye', 2021, ['Sastra Indonesia', 'Fantasi'], 'id'],
    ['Bibi Gill', 'Tere Liye', 2022, ['Sastra Indonesia', 'Fantasi'], 'id'],
    ['Sagaras', 'Tere Liye', 2022, ['Sastra Indonesia', 'Fantasi'], 'id'],
    ['Pulang', 'Tere Liye', 2015, ['Sastra Indonesia', 'Misteri & Thriller'], 'id'],
    ['Pergi', 'Tere Liye', 2018, ['Sastra Indonesia', 'Misteri & Thriller'], 'id'],
    ['Pulang-Pergi', 'Tere Liye', 2021, ['Sastra Indonesia', 'Misteri & Thriller'], 'id'],
    ['Negeri Para Bedebah', 'Tere Liye', 2012, ['Sastra Indonesia', 'Misteri & Thriller'], 'id'],
    ['Negeri di Ujung Tanduk', 'Tere Liye', 2013, ['Sastra Indonesia', 'Misteri & Thriller'], 'id'],
    ['Bedebah di Ujung Tanduk', 'Tere Liye', 2021, ['Sastra Indonesia', 'Misteri & Thriller'], 'id'],
    ['Tentang Kamu', 'Tere Liye', 2016, S_ID, 'id'],
    ['Hafalan Shalat Delisa', 'Tere Liye', 2005, S_ID, 'id'],
    ['Rembulan Tenggelam di Wajahmu', 'Tere Liye', 2009, S_ID, 'id'],
    ['Daun yang Jatuh Tak Pernah Membenci Angin', 'Tere Liye', 2010, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['Ayahku (Bukan) Pembohong', 'Tere Liye', 2011, S_ID, 'id'],
    ['Sunset Bersama Rosie', 'Tere Liye', 2008, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['Kau, Aku & Sepucuk Angpau Merah', 'Tere Liye', 2012, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['Moga Bunda Disayang Allah', 'Tere Liye', 2006, S_ID, 'id'],
    ['Selamat Tinggal', 'Tere Liye', 2020, S_ID, 'id'],
    ['Janji', 'Tere Liye', 2021, S_ID, 'id'],
    ['Tanah Para Bandit', 'Tere Liye', 2023, ['Sastra Indonesia', 'Misteri & Thriller'], 'id'],
    ['Teruslah Bodoh Jangan Pintar', 'Tere Liye', 2024, S_ID, 'id'],
    ['Eliana', 'Tere Liye', null, S_ID, 'id'],
    ['Pukat', 'Tere Liye', null, S_ID, 'id'],
    ['Burlian', 'Tere Liye', null, S_ID, 'id'],
    ['Amelia', 'Tere Liye', null, S_ID, 'id'],
    ['Si Anak Badai', 'Tere Liye', null, S_ID, 'id'],
    // Brian Khrisna, Valerie Patkar, J.S. Khairen & penulis muda
    ['Loversation', 'Valerie Patkar', null, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['Nonversation', 'Valerie Patkar', null, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['Claires', 'Valerie Patkar', null, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['Lukacita', 'Valerie Patkar', null, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['Game Over', 'Valerie Patkar', null, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['Kami (Bukan) Sarjana Kertas', 'J.S. Khairen', 2019, S_ID, 'id'],
    ['Kami (Bukan) Jongos Berdasi', 'J.S. Khairen', 2020, S_ID, 'id'],
    ['Melangkah', 'J.S. Khairen', 2020, ['Sastra Indonesia', 'Fantasi'], 'id'],
    ['Di Tanah Lada', 'Ziggy Zezsyazeoviennazabrizkie', 2015, S_ID, 'id'],
    ['Semua Ikan di Langit', 'Ziggy Zezsyazeoviennazabrizkie', 2017, ['Sastra Indonesia', 'Fantasi'], 'id'],
    ['Kita Pergi Hari Ini', 'Ziggy Zezsyazeoviennazabrizkie', 2021, ['Sastra Indonesia', 'Fantasi'], 'id'],
    ['Jika Kita Tak Pernah Jadi Apa-Apa', 'Alvi Syahrin', 2020, ['Pengembangan Diri', 'Non-Fiksi'], 'id'],
    ['Nanti Kita Cerita tentang Hari Ini', 'Marchella FP', 2018, ['Pengembangan Diri', 'Puisi'], 'id'],
    ['Geez & Ann', 'Rintik Sedu', 2017, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['Mantappu Jiwa', 'Jerome Polin Sijabat', 2019, ['Memoar', 'Pengembangan Diri'], 'id'],
    ['Catatan Najwa', 'Najwa Shihab', 2016, ['Non-Fiksi'], 'id'],
    ['Resign!', 'Almira Bastari', 2018, ['Sastra Indonesia', 'Romansa'], 'id'],
    // Ika Natassa, Fiersa Besari, Dee Lestari, Andrea Hirata, dkk.
    ['Critical Eleven', 'Ika Natassa', 2015, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['Antologi Rasa', 'Ika Natassa', 2011, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['The Architecture of Love', 'Ika Natassa', 2016, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['Heartbreak Motel', 'Ika Natassa', 2022, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['Divortiare', 'Ika Natassa', 2008, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['Konspirasi Alam Semesta', 'Fiersa Besari', 2017, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['Catatan Juang', 'Fiersa Besari', 2017, S_ID, 'id'],
    ['Arah Langkah', 'Fiersa Besari', 2018, ['Memoar', 'Non-Fiksi'], 'id'],
    ['11:11', 'Fiersa Besari', 2018, S_ID, 'id'],
    ['Filosofi Kopi', 'Dee Lestari', 2006, S_ID, 'id'],
    ['Madre', 'Dee Lestari', 2011, S_ID, 'id'],
    ['Supernova: Akar', 'Dee Lestari', 2002, ['Sastra Indonesia', 'Fiksi Ilmiah'], 'id'],
    ['Supernova: Petir', 'Dee Lestari', 2004, ['Sastra Indonesia', 'Fiksi Ilmiah'], 'id'],
    ['Supernova: Partikel', 'Dee Lestari', 2012, ['Sastra Indonesia', 'Fiksi Ilmiah'], 'id'],
    ['Supernova: Gelombang', 'Dee Lestari', 2014, ['Sastra Indonesia', 'Fiksi Ilmiah'], 'id'],
    ['Supernova: Inteligensi Embun Pagi', 'Dee Lestari', 2016, ['Sastra Indonesia', 'Fiksi Ilmiah'], 'id'],
    ['Aroma Karsa', 'Dee Lestari', 2018, ['Sastra Indonesia', 'Fantasi'], 'id'],
    ['Rapijali', 'Dee Lestari', 2021, S_ID, 'id'],
    ['Edensor', 'Andrea Hirata', 2007, S_ID, 'id'],
    ['Maryamah Karpov', 'Andrea Hirata', 2008, S_ID, 'id'],
    ['Padang Bulan', 'Andrea Hirata', 2010, S_ID, 'id'],
    ['Ayah', 'Andrea Hirata', 2015, S_ID, 'id'],
    ['Guru Aini', 'Andrea Hirata', 2020, S_ID, 'id'],
    ['Ranah 3 Warna', 'Ahmad Fuadi', 2011, S_ID, 'id'],
    ['Rantau 1 Muara', 'Ahmad Fuadi', 2013, S_ID, 'id'],
    ['Namaku Alam', 'Leila S. Chudori', 2023, ['Sastra Indonesia', 'Fiksi Sejarah'], 'id'],
    ['O', 'Eka Kurniawan', 2016, S_ID, 'id'],
    ['Jejak Langkah', 'Pramoedya Ananta Toer', 1985, ['Sastra Indonesia', 'Fiksi Sejarah'], 'id'],
    ['Rumah Kaca', 'Pramoedya Ananta Toer', 1988, ['Sastra Indonesia', 'Fiksi Sejarah'], 'id'],
    ['Gadis Pantai', 'Pramoedya Ananta Toer', 1987, ['Sastra Indonesia', 'Klasik'], 'id'],
    ['Arus Balik', 'Pramoedya Ananta Toer', 1995, ['Sastra Indonesia', 'Fiksi Sejarah'], 'id'],
    ['Tenggelamnya Kapal Van der Wijck', 'Hamka', 1938, ['Sastra Indonesia', 'Klasik', 'Romansa'], 'id'],
    ['Di Bawah Lindungan Ka\'bah', 'Hamka', 1938, ['Sastra Indonesia', 'Klasik'], 'id'],
    ['Hujan Bulan Juni', 'Sapardi Djoko Damono', 1994, ['Puisi', 'Sastra Indonesia'], 'id'],
    ['Aku Ini Binatang Jalang', 'Chairil Anwar', 1986, ['Puisi', 'Klasik'], 'id'],
    ['Entrok', 'Okky Madasari', 2010, S_ID, 'id'],
    ['Ketika Cinta Bertasbih', 'Habiburrahman El Shirazy', 2007, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['5 cm', 'Donny Dhirgantoro', 2005, S_ID, 'id'],
    ['Dilan: Dia adalah Dilanku Tahun 1991', 'Pidi Baiq', 2015, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['Milea: Suara dari Dilan', 'Pidi Baiq', 2016, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['Ancika: Dia yang Bersamaku Tahun 1995', 'Pidi Baiq', 2021, ['Sastra Indonesia', 'Romansa'], 'id'],
    ['Danur', 'Risa Saraswati', 2011, ['Horor', 'Sastra Indonesia'], 'id'],
    ['Kambing Jantan', 'Raditya Dika', 2005, ['Memoar', 'Sastra Indonesia'], 'id'],
    ['Marmut Merah Jambu', 'Raditya Dika', 2010, ['Memoar', 'Sastra Indonesia'], 'id'],
    ['Mariposa', 'Luluk HF', 2018, ['Young Adult', 'Romansa'], 'id'],
    ['Dear Nathan', 'Erisca Febriani', 2016, ['Young Adult', 'Romansa'], 'id'],
    // Asia: Jepang & Korea yang hits di Indonesia (judul edisi Indonesia)
    ['Tales from the Cafe', 'Toshikazu Kawaguchi', 2017, ['Sastra Dunia', 'Fantasi'], 'id'],
    ['Before Your Memory Fades', 'Toshikazu Kawaguchi', 2018, ['Sastra Dunia', 'Fantasi'], 'en'],
    ['Before We Say Goodbye', 'Toshikazu Kawaguchi', 2019, ['Sastra Dunia', 'Fantasi'], 'en'],
    ['Keajaiban Toko Kelontong Namiya', 'Keigo Higashino', 2012, ['Sastra Dunia', 'Fantasi'], 'id'],
    ['Kesetiaan Mr. X', 'Keigo Higashino', 2005, ['Misteri & Thriller', 'Sastra Dunia'], 'id'],
    ['Malice', 'Keigo Higashino', 1996, ['Misteri & Thriller', 'Sastra Dunia'], 'id'],
    ['Berani Tidak Disukai', 'Ichiro Kishimi & Fumitake Koga', 2013, ['Psikologi', 'Pengembangan Diri'], 'id'],
    ['Berani Bahagia', 'Ichiro Kishimi & Fumitake Koga', 2016, ['Psikologi', 'Pengembangan Diri'], 'id'],
    ['Jika Kucing Lenyap dari Dunia', 'Genki Kawamura', 2012, ['Sastra Dunia', 'Fiksi'], 'id'],
    ['Kim Ji-yeong, Lahir Tahun 1982', 'Cho Nam-joo', 2016, ['Sastra Dunia', 'Fiksi'], 'id'],
    ['I Want to Die but I Want to Eat Tteokbokki', 'Baek Se-hee', 2018, ['Psikologi', 'Memoar'], 'en'],
    ['Welcome to the Hyunam-dong Bookshop', 'Hwang Bo-reum', 2022, ['Sastra Dunia', 'Fiksi'], 'en'],
    ['The Dallergut Dream Department Store', 'Lee Mi-ye', 2020, ['Sastra Dunia', 'Fantasi'], 'en'],
    ['The Things You Can See Only When You Slow Down', 'Haemin Sunim', 2012, ['Pengembangan Diri', 'Filsafat'], 'en'],
    ['Dunia Sophie', 'Jostein Gaarder', 1991, ['Filsafat', 'Sastra Dunia'], 'id'],
    ['Detective Conan Vol. 1', 'Gosho Aoyama', 1994, ['Komik & Manga', 'Misteri & Thriller'], 'ja'],
    ['Doraemon Vol. 1', 'Fujiko F. Fujio', 1974, ['Komik & Manga'], 'ja'],
    ['Naruto Vol. 1', 'Masashi Kishimoto', 1999, ['Komik & Manga'], 'ja'],
    ['Attack on Titan Vol. 1', 'Hajime Isayama', 2010, ['Komik & Manga', 'Fantasi'], 'ja'],
    ['Jujutsu Kaisen Vol. 1', 'Gege Akutami', 2018, ['Komik & Manga', 'Fantasi'], 'ja'],
    ['Spy x Family Vol. 1', 'Tatsuya Endo', 2019, ['Komik & Manga'], 'ja'],
    ['Chainsaw Man Vol. 1', 'Tatsuki Fujimoto', 2019, ['Komik & Manga', 'Horor'], 'ja'],
    // BookTok & internasional yang familiar
    ['It Starts with Us', 'Colleen Hoover', 2022, ['Romansa', 'Fiksi'], 'en'],
    ['Ugly Love', 'Colleen Hoover', 2014, ['Romansa'], 'en'],
    ['Twisted Love', 'Ana Huang', 2021, ['Romansa'], 'en'],
    ['The Love Hypothesis', 'Ali Hazelwood', 2021, ['Romansa'], 'en'],
    ['Book Lovers', 'Emily Henry', 2022, ['Romansa'], 'en'],
    ['Beach Read', 'Emily Henry', 2020, ['Romansa'], 'en'],
    ['People We Meet on Vacation', 'Emily Henry', 2021, ['Romansa'], 'en'],
    ['Red, White & Royal Blue', 'Casey McQuiston', 2019, ['Romansa'], 'en'],
    ['Daisy Jones & The Six', 'Taylor Jenkins Reid', 2019, ['Fiksi'], 'en'],
    ['Atmosphere', 'Taylor Jenkins Reid', 2025, ['Fiksi Sejarah', 'Romansa'], 'en'],
    ['A Court of Mist and Fury', 'Sarah J. Maas', 2016, ['Fantasi', 'Romansa'], 'en'],
    ['Throne of Glass', 'Sarah J. Maas', 2012, ['Fantasi', 'Young Adult'], 'en'],
    ['The Cruel Prince', 'Holly Black', 2018, ['Fantasi', 'Young Adult'], 'en'],
    ['Powerless', 'Lauren Roberts', 2023, ['Fantasi', 'Young Adult'], 'en'],
    ['A Good Girl\'s Guide to Murder', 'Holly Jackson', 2019, ['Misteri & Thriller', 'Young Adult'], 'en'],
    ['The Inheritance Games', 'Jennifer Lynn Barnes', 2020, ['Misteri & Thriller', 'Young Adult'], 'en'],
    ['We Were Liars', 'E. Lockhart', 2014, ['Young Adult', 'Misteri & Thriller'], 'en'],
    ['Heartstopper Vol. 1', 'Alice Oseman', 2019, ['Komik & Manga', 'Young Adult'], 'en'],
    ['The Fault in Our Stars', 'John Green', 2012, ['Young Adult', 'Romansa'], 'en'],
    ['Twilight', 'Stephenie Meyer', 2005, ['Young Adult', 'Fantasi'], 'en'],
    ['The Lightning Thief', 'Rick Riordan', 2005, ['Fantasi', 'Young Adult'], 'en'],
    ['Catching Fire', 'Suzanne Collins', 2009, ['Young Adult', 'Fiksi Ilmiah'], 'en'],
    ['Mockingjay', 'Suzanne Collins', 2010, ['Young Adult', 'Fiksi Ilmiah'], 'en'],
    ['Harry Potter and the Chamber of Secrets', 'J.K. Rowling', 1998, ['Fantasi', 'Young Adult'], 'en'],
    ['Harry Potter and the Prisoner of Azkaban', 'J.K. Rowling', 1999, ['Fantasi', 'Young Adult'], 'en'],
    ['Harry Potter and the Goblet of Fire', 'J.K. Rowling', 2000, ['Fantasi', 'Young Adult'], 'en'],
    ['Harry Potter and the Order of the Phoenix', 'J.K. Rowling', 2003, ['Fantasi', 'Young Adult'], 'en'],
    ['Harry Potter and the Half-Blood Prince', 'J.K. Rowling', 2005, ['Fantasi', 'Young Adult'], 'en'],
    ['Harry Potter and the Deathly Hallows', 'J.K. Rowling', 2007, ['Fantasi', 'Young Adult'], 'en'],
    ['The Housemaid\'s Secret', 'Freida McFadden', 2023, ['Misteri & Thriller'], 'en'],
    ['Murder on the Orient Express', 'Agatha Christie', 1934, ['Misteri & Thriller', 'Klasik'], 'en'],
    ['And Then There Were None', 'Agatha Christie', 1939, ['Misteri & Thriller', 'Klasik'], 'en'],
    ['The Boy, the Mole, the Fox and the Horse', 'Charlie Mackesy', 2019, ['Fiksi', 'Pengembangan Diri'], 'en'],
    ['The Mountain Is You', 'Brianna Wiest', 2020, ['Pengembangan Diri', 'Psikologi'], 'en'],
    ['The 7 Habits of Highly Effective People', 'Stephen R. Covey', 1989, ['Pengembangan Diri', 'Bisnis & Keuangan'], 'en'],
    ['How to Win Friends and Influence People', 'Dale Carnegie', 1936, ['Pengembangan Diri', 'Klasik'], 'en'],
    ['The Power of Habit', 'Charles Duhigg', 2012, ['Pengembangan Diri', 'Psikologi'], 'en'],
    ['Can\'t Hurt Me', 'David Goggins', 2018, ['Memoar', 'Pengembangan Diri'], 'en'],
    ['Outliers', 'Malcolm Gladwell', 2008, ['Non-Fiksi', 'Psikologi'], 'en'],
    ['Homo Deus', 'Yuval Noah Harari', 2015, ['Sejarah', 'Non-Fiksi'], 'en'],
    ['Nexus', 'Yuval Noah Harari', 2024, ['Sejarah', 'Non-Fiksi'], 'en'],
  ];

  /* ---------------------------------------------------------------------
     SAMPUL MANUAL (opsional). Kalau sebuah buku tidak punya sampul di
     Google Books / Open Library, tempel link gambarnya di sini, contoh:
       'Pareidolia': 'https://…/pareidolia.jpg',
     Pakai gambar yang memang boleh kamu pakai (mis. foto sendiri atau
     dari penerbit yang mengizinkan). Kosong = dicari otomatis.
     --------------------------------------------------------------------- */
  const COVERS = {
  };

  /* buku yang selalu dicari — tampil di "Favorit pembaca Indonesia" */
  const FAV = {
    'Funiculi Funicula': 'Favorit pembaca Indonesia',
    'Keajaiban Toko Kelontong Namiya': 'Selalu dicari',
    'Bumi': 'Serial Bumi · terus dicetak ulang',
    'Pulang|Tere Liye': 'Tere Liye · selalu laris',
    'Hujan': 'Tere Liye · selalu laris',
    'Rindu': 'Tere Liye · selalu laris',
    'Tentang Kamu': 'Tere Liye · selalu laris',
    'Rembulan Tenggelam di Wajahmu': 'Tere Liye · klasik modern',
    'Laut Bercerita': 'Wajib baca',
    'Laskar Pelangi': 'Klasik modern Indonesia',
    'Cantik Itu Luka': 'Sastra Indonesia mendunia',
    'Filosofi Teras': 'Best seller sepanjang masa',
    'Atomic Habits': 'Best seller sepanjang masa',
    'Berani Tidak Disukai': 'Selalu dicari',
    'Critical Eleven': 'Favorit pembaca romansa',
    'Kim Ji-yeong, Lahir Tahun 1982': 'Hits Korea',
    'Perahu Kertas': 'Favorit sepanjang masa',
    'Nanti Kita Cerita tentang Hari Ini': 'Best seller fenomenal',
    'Kesetiaan Mr. X': 'Misteri favorit',
    'The Midnight Library': 'Favorit pembaca dunia',
    'Garis Waktu': 'Favorit pembaca muda',
    'Home Sweet Loan': 'Sudah difilmkan',
    'Dilan: Dia adalah Dilanku Tahun 1990': 'Ikon pop Indonesia',
    'Mantappu Jiwa': 'Best seller fenomenal',
  };

  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
  const base = (title, author, year, genres, synopsis, i) => ({
    id: 'b-' + slug(title), title, author, year, pages: null, genres, synopsis,
    cover_url: null, ol_key: null, isbn: null, publisher: null, language: null,
    hot: false, trend_note: null, source: 'katalog', rank: i + 1,
    created_by: null, created_at: '2026-01-01T00:00:00.000Z',
  });
  const BOOKS = [
    ...HOT.map(([t, a, y, g, s, note, lang], i) => ({ ...base(t, a, y, g, s, i), hot: true, trend_note: note, language: lang })),
    ...RAW.map(([t, a, y, g, s], i) => {
      const b = base(t, a, y, g, s, HOT.length + i);
      if (g.includes('Sastra Indonesia')) b.language = 'id';
      if (HOT_EXTRA[t]) { b.hot = true; b.trend_note = HOT_EXTRA[t]; b.rank = HOT.length + 1 + (i % 5); }
      return b;
    }),
    ...MORE.map(([t, a, y, g, lang], i) => ({ ...base(t, a, y, g, '', HOT.length + RAW.length + i), language: lang })),
  ];
  BOOKS.forEach((b) => {
    // bestseller luar negeri yang kurang dikenal pembaca Indonesia → hanya di tab "Dunia"
    if (b.hot && /Publishers Weekly/.test(b.trend_note || '')) { b.hot = false; b.intl = true; }
    const fv = FAV[b.title + '|' + b.author] || FAV[b.title];
    if (fv) { b.fav = true; if (!b.trend_note) b.trend_note = fv; }
    const cv = COVERS[b.title + '|' + b.author] || COVERS[b.title];
    if (cv) b.cover_url = cv;
  });
  const ids = new Set();
  BOOKS.forEach((b) => { if (ids.has(b.id)) b.id += '-2'; ids.add(b.id); });

  // Pemetaan subjek dari Open Library / Google Books ke genre ruangbaca
  const SUBJECT_MAP = [
    [/indonesia/i, 'Sastra Indonesia'],
    [/science fiction|sci-fi|dystop/i, 'Fiksi Ilmiah'],
    [/fantasy|magic|dragons|wizard/i, 'Fantasi'],
    [/romance|love stor/i, 'Romansa'],
    [/mystery|thriller|suspense|detective|crime/i, 'Misteri & Thriller'],
    [/horror|ghost/i, 'Horor'],
    [/young adult|juvenile|teen/i, 'Young Adult'],
    [/historical fiction/i, 'Fiksi Sejarah'],
    [/classic/i, 'Klasik'],
    [/self-help|self help|personal development|success|habit|motivation/i, 'Pengembangan Diri'],
    [/psycholog/i, 'Psikologi'],
    [/business|economics|finance|money|investing|management/i, 'Bisnis & Keuangan'],
    [/philosoph|stoic/i, 'Filsafat'],
    [/biography|memoir|autobiograph/i, 'Memoar'],
    [/^history|world history|history$/i, 'Sejarah'],
    [/science|physics|biology|astronomy|nature/i, 'Sains'],
    [/poetry|poems/i, 'Puisi'],
    [/comic|manga|graphic novel/i, 'Komik & Manga'],
    [/fiction|novel/i, 'Fiksi'],
  ];
  function mapGenres(subjects = []) {
    const out = [];
    subjects.slice(0, 40).forEach((s) => {
      for (const [re, g] of SUBJECT_MAP) { if (re.test(s) && !out.includes(g)) { out.push(g); break; } }
    });
    if (!out.length) out.push('Non-Fiksi');
    if (out.length > 1 && out.includes('Fiksi')) out.splice(out.indexOf('Fiksi'), 1);
    return out.slice(0, 3);
  }

  global.RB_CATALOG = { GENRES, BOOKS, mapGenres, slug };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.RB_CATALOG;
})(typeof window !== 'undefined' ? window : globalThis);
