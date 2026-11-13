/* =========================================================================
   ruangbaca — konfigurasi
   -------------------------------------------------------------------------
   KOSONG  → Mode demo: langsung jalan, data tersimpan di browser ini saja.
   DIISI   → Mode online (Supabase): login email + Google, semua pengguna
             saling melihat ulasan, follow, like, chat preloved secara real-time.

   Cara mengisi (5 menit, lihat README bagian "Mode Online"):
   1. Buat proyek gratis di https://supabase.com
   2. SQL Editor → jalankan database/supabase.sql
   3. Project Settings → API → salin "Project URL" dan "anon public key" ke bawah
   ========================================================================= */
window.RUANGBACA_CONFIG = {
  supabaseUrl: 'https://guokhfuardessgssnqhn.supabase.co',      // contoh: 'https://abcdefgh.supabase.co'
  supabaseAnonKey: 'sb_publishable_MnyOGRYmZp70X0K5o7ikKw_crSGp_P9',  // contoh: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...'
  googleBooksKey: '',   // opsional: API key Google Books bila trafik sudah besar
};
