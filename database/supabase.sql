-- =========================================================================
--  ruangbaca — database Supabase (PostgreSQL)
--  Cara pakai: Supabase Dashboard → SQL Editor → New query → tempel seluruh
--  isi file ini → Run. Aman dijalankan ulang (tidak menghapus data).
--
--  Isi:
--   1. Tabel (profil, buku, rak, diary/ulasan, like, komentar, daftar,
--      follow, favorit, target, notifikasi, preloved, pesan)
--   2. Trigger: profil otomatis saat daftar (email maupun Google)
--      → akun PERTAMA yang mendaftar otomatis menjadi admin
--   3. Row Level Security: semua orang bisa membaca konten publik, tapi
--      hanya pemilik yang bisa mengubah/menghapus miliknya
--   4. Fungsi admin_list_users(): admin bisa melihat email & metode login
--   5. Storage bucket "media" untuk foto profil & foto buku preloved
--   6. Realtime: perubahan langsung muncul di semua perangkat
--   7. Katalog awal buku (tanpa rating/ulasan palsu)
-- =========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tabel --
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null check (username ~ '^[a-z0-9_.]{3,20}$'),
  name          text not null check (char_length(name) between 1 and 80),
  bio           text default '' check (char_length(bio) <= 300),
  location      text default '',
  website       text default '',
  avatar_color  text default '#5e8c93',
  avatar_url    text,
  provider      text default 'email',
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists public.books (
  id          text primary key,
  title       text not null,
  author      text not null default 'Tanpa nama',
  year        int,
  pages       int,
  genres      text[] not null default '{}',
  synopsis    text default '',
  cover_url   text,
  ol_key      text,
  source      text not null default 'katalog',
  rank        int,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists books_title_idx on public.books using gin (to_tsvector('simple', title || ' ' || author));
-- v3: ISBN, penerbit, bahasa, & penanda buku yang lagi ramai
alter table public.books add column if not exists isbn       text;
alter table public.books add column if not exists publisher  text;
alter table public.books add column if not exists language   text;
alter table public.books add column if not exists hot        boolean not null default false;
alter table public.books add column if not exists trend_note text;
alter table public.books add column if not exists fav        boolean not null default false;
alter table public.books add column if not exists intl       boolean not null default false;
create index if not exists books_isbn_idx on public.books(isbn);
create index if not exists books_hot_idx on public.books(hot) where hot;

create table if not exists public.user_books (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  book_id     text not null references public.books(id) on delete cascade,
  status      text check (status in ('read', 'reading', 'want')),
  rating      numeric(2,1) check (rating is null or rating between 0.5 and 5),
  liked       boolean not null default false,
  progress    int not null default 0,
  updated_at  timestamptz not null default now(),
  unique (user_id, book_id)
);
create index if not exists user_books_book_idx on public.user_books(book_id);

create table if not exists public.diary_entries (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  book_id           text not null references public.books(id) on delete cascade,
  read_date         date not null default current_date,
  rating            numeric(2,1) check (rating is null or rating between 0.5 and 5),
  liked             boolean not null default false,
  review            text default '' check (char_length(review) <= 5000),
  contains_spoiler  boolean not null default false,
  is_reread         boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists diary_user_idx on public.diary_entries(user_id, read_date desc);
create index if not exists diary_book_idx on public.diary_entries(book_id);

create table if not exists public.review_likes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  entry_id    uuid not null references public.diary_entries(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, entry_id)
);

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  entry_id    uuid not null references public.diary_entries(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now()
);

create table if not exists public.lists (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 80),
  description  text default '' check (char_length(description) <= 500),
  is_ranked    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.list_items (
  id        uuid primary key default gen_random_uuid(),
  list_id   uuid not null references public.lists(id) on delete cascade,
  book_id   text not null references public.books(id) on delete cascade,
  position  int not null default 1,
  unique (list_id, book_id)
);

create table if not exists public.list_likes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  list_id     uuid not null references public.lists(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, list_id)
);

create table if not exists public.follows (
  id            uuid primary key default gen_random_uuid(),
  follower_id   uuid not null references public.profiles(id) on delete cascade,
  following_id  uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.favorites (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles(id) on delete cascade,
  book_id   text not null references public.books(id) on delete cascade,
  position  int not null check (position between 1 and 4),
  created_at timestamptz not null default now()
);

create table if not exists public.reading_goals (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references public.profiles(id) on delete cascade,
  year     int not null,
  target   int not null check (target between 1 and 999),
  created_at timestamptz not null default now(),
  unique (user_id, year)
);

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  actor_id    uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in ('follow', 'like_review', 'comment', 'like_list', 'message', 'listing_saved')),
  ref_id      text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notif_user_idx on public.notifications(user_id, created_at desc);

-- Preloved: lapak buku bekas
create table if not exists public.listings (
  id           uuid primary key default gen_random_uuid(),
  seller_id    uuid not null references public.profiles(id) on delete cascade,
  book_id      text not null references public.books(id) on delete cascade,
  photos       text[] not null default '{}',
  condition    text not null check (condition in ('baru', 'seperti_baru', 'sangat_baik', 'baik', 'cukup')),
  defects      text[] not null default '{}',
  description  text default '' check (char_length(description) <= 1000),
  price        int not null check (price >= 1000),
  negotiable   boolean not null default true,
  city         text not null default '',
  shipping     text[] not null default '{}',
  whatsapp     text default '',
  status       text not null default 'available' check (status in ('available', 'reserved', 'sold')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists listings_book_idx on public.listings(book_id);

create table if not exists public.listing_saves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, listing_id)
);

create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings(id) on delete cascade,
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 2000),
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists messages_party_idx on public.messages(recipient_id, is_read);

-- --------------------------------------------------- fungsi & trigger --
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Profil otomatis untuk setiap akun baru (email maupun Google)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text;
  uname text;
  colors text[] := array['#5e8c93','#8e9a4b','#d6a648','#d98995','#7a9bb5','#a493bf','#6fa58a','#c28e6a'];
begin
  base := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'pembaca'));
  base := regexp_replace(base, '[^a-z0-9_.]', '', 'g');
  if char_length(base) < 3 then base := base || 'baca'; end if;
  base := left(base, 16);
  uname := base;
  while exists (select 1 from public.profiles where username = uname) loop
    uname := base || (floor(random() * 9000) + 1000)::int::text;
  end loop;
  insert into public.profiles (id, username, name, avatar_url, provider, avatar_color, is_admin)
  values (
    new.id, uname,
    left(coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', uname), 80),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    colors[1 + floor(random() * array_length(colors, 1))::int],
    not exists (select 1 from public.profiles)   -- akun pertama = admin
  );
  insert into public.reading_goals (user_id, year, target)
  values (new.id, extract(year from now())::int, 12)
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Pengguna tidak bisa menjadikan dirinya admin sendiri
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.is_admin := old.is_admin;
    new.provider := old.provider;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile();

-- Admin: daftar semua akun beserta email & metode login
create or replace function public.admin_list_users()
returns table (id uuid, email text, provider text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Khusus admin'; end if;
  return query
    select u.id, u.email::text, coalesce(u.raw_app_meta_data->>'provider', 'email'), u.created_at, u.last_sign_in_at
    from auth.users u order by u.created_at desc;
end $$;
revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- ------------------------------------------------- row level security --
alter table public.profiles enable row level security;
drop policy if exists "profil publik" on public.profiles;
drop policy if exists "ubah profil sendiri" on public.profiles;
create policy "profil publik" on public.profiles for select using (true);
create policy "ubah profil sendiri" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

alter table public.books enable row level security;
drop policy if exists "buku publik" on public.books;
drop policy if exists "tambah buku" on public.books;
drop policy if exists "admin ubah buku" on public.books;
drop policy if exists "admin hapus buku" on public.books;
create policy "buku publik" on public.books for select using (true);
create policy "tambah buku" on public.books for insert to authenticated with check (created_by = auth.uid());
create policy "admin ubah buku" on public.books for update to authenticated using (public.is_admin());
drop policy if exists "ubah buku tambahan sendiri" on public.books;
create policy "ubah buku tambahan sendiri" on public.books for update to authenticated using (created_by = auth.uid() and source = 'pengguna') with check (created_by = auth.uid() and source = 'pengguna');
create policy "admin hapus buku" on public.books for delete to authenticated using (public.is_admin());

-- Tabel milik pengguna: baca publik, tulis hanya pemilik (admin boleh menghapus)
do $$
declare r record;
begin
  for r in select * from (values
    ('user_books', 'user_id'), ('diary_entries', 'user_id'), ('review_likes', 'user_id'),
    ('comments', 'user_id'), ('lists', 'user_id'), ('list_likes', 'user_id'),
    ('follows', 'follower_id'), ('favorites', 'user_id'), ('reading_goals', 'user_id'),
    ('listings', 'seller_id'), ('listing_saves', 'user_id')
  ) as t(tbl, col) loop
    execute format('alter table public.%I enable row level security', r.tbl);
    execute format('drop policy if exists "baca publik" on public.%I', r.tbl);
    execute format('drop policy if exists "tulis sendiri" on public.%I', r.tbl);
    execute format('drop policy if exists "ubah sendiri" on public.%I', r.tbl);
    execute format('drop policy if exists "hapus sendiri" on public.%I', r.tbl);
    execute format('create policy "baca publik" on public.%I for select using (true)', r.tbl);
    execute format('create policy "tulis sendiri" on public.%I for insert to authenticated with check (%I = auth.uid())', r.tbl, r.col);
    execute format('create policy "ubah sendiri" on public.%I for update to authenticated using (%I = auth.uid()) with check (%I = auth.uid())', r.tbl, r.col, r.col);
    execute format('create policy "hapus sendiri" on public.%I for delete to authenticated using (%I = auth.uid() or public.is_admin())', r.tbl, r.col);
  end loop;
end $$;

alter table public.list_items enable row level security;
drop policy if exists "baca publik" on public.list_items;
drop policy if exists "kelola isi daftar sendiri" on public.list_items;
create policy "baca publik" on public.list_items for select using (true);
create policy "kelola isi daftar sendiri" on public.list_items for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and (l.user_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()));

alter table public.notifications enable row level security;
drop policy if exists "lihat notifikasi sendiri" on public.notifications;
drop policy if exists "kirim notifikasi" on public.notifications;
drop policy if exists "tandai dibaca" on public.notifications;
drop policy if exists "hapus notifikasi" on public.notifications;
create policy "lihat notifikasi sendiri" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "kirim notifikasi" on public.notifications for insert to authenticated with check (actor_id = auth.uid());
create policy "tandai dibaca" on public.notifications for update to authenticated using (user_id = auth.uid());
create policy "hapus notifikasi" on public.notifications for delete to authenticated using (user_id = auth.uid() or actor_id = auth.uid());

alter table public.messages enable row level security;
drop policy if exists "lihat pesan sendiri" on public.messages;
drop policy if exists "kirim pesan" on public.messages;
drop policy if exists "tandai pesan dibaca" on public.messages;
drop policy if exists "hapus pesan" on public.messages;
create policy "lihat pesan sendiri" on public.messages for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin());
create policy "kirim pesan" on public.messages for insert to authenticated with check (sender_id = auth.uid() and sender_id <> recipient_id);
create policy "tandai pesan dibaca" on public.messages for update to authenticated using (recipient_id = auth.uid());
create policy "hapus pesan" on public.messages for delete to authenticated using (sender_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));

-- ------------------------------------------------------------ storage --
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do update set public = true;
drop policy if exists "media publik" on storage.objects;
drop policy if exists "unggah media sendiri" on storage.objects;
drop policy if exists "hapus media sendiri" on storage.objects;
create policy "media publik" on storage.objects for select using (bucket_id = 'media');
create policy "unggah media sendiri" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "hapus media sendiri" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ----------------------------------------------------------- realtime --
do $$
declare t text;
begin
  foreach t in array array['profiles','books','user_books','diary_entries','review_likes','comments','lists','list_items',
                           'list_likes','follows','favorites','reading_goals','notifications','listings','listing_saves','messages'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ------------------------------------------------------- view statistik --
create or replace view public.v_book_stats with (security_invoker = true) as
select b.id as book_id, b.title,
       count(ub.rating)                                 as rating_count,
       round(avg(ub.rating), 2)                         as avg_rating,
       count(*) filter (where ub.status = 'read')       as readers,
       count(*) filter (where ub.status = 'reading')    as reading_now,
       count(*) filter (where ub.status = 'want')       as want_to_read,
       count(*) filter (where ub.liked)                 as likes
from public.books b left join public.user_books ub on ub.book_id = b.id
group by b.id, b.title;

-- ------------------------------------------------- katalog buku awal --
-- (tanpa rating/ulasan bawaan — semua penilaian dari pengguna asli)
insert into public.books (id, title, author, year, pages, genres, synopsis, source, rank, isbn, publisher, language, hot, trend_note, fav, intl, cover_url) values
  ('b-seporsi-mie-ayam-sebelum-mati', 'Seporsi Mie Ayam Sebelum Mati', 'Brian Khrisna', 2025, null, array['Sastra Indonesia', 'Fiksi']::text[], 'Ale, 37 tahun, merasa tak pernah dianggap — oleh rekan kerja, tetangga, bahkan keluarganya. Ia memutuskan pergi dalam 24 jam, tapi sebelum itu ingin makan seporsi mie ayam terakhir. Kisah tentang kesehatan mental dan alasan-alasan kecil untuk bertahan.', 'katalog', 1, null, null, 'id', true, 'Novel terlaris · cetak ulang 100+ kali', false, false, null),
  ('b-setelah-melompat-aku-ingin-hidup', 'Setelah Melompat Aku Ingin Hidup', 'Brian Khrisna', 2026, null, array['Sastra Indonesia', 'Fantasi']::text[], 'Di tahun terakhir dari 999 tahun tugasnya, Mori sang pencabut nyawa menyaksikan seseorang yang tiba-tiba ingin hidup sedetik setelah melompat. Dari situ ia mulai mencari tahu siapa dirinya sebelum menjadi pencabut nyawa.', 'katalog', 2, null, null, 'id', true, 'Best seller Gramedia · Jun 2026', false, false, null),
  ('b-pareidolia', 'Pareidolia', 'Tere Liye', 2026, null, array['Sastra Indonesia', 'Fiksi']::text[], 'Novel tentang ilusi, sudut pandang, dan pemujaan semu manusia — tentang hal-hal yang tampak indah namun berujung pahit.', 'katalog', 3, null, null, 'id', true, 'Best seller Gramedia · Sep 2026', false, false, null),
  ('b-setiap-hari-hari-ini', 'Setiap Hari, Hari Ini', 'Valerie Patkar', 2026, null, array['Sastra Indonesia', 'Romansa']::text[], 'Kisah tentang waktu, cinta, dan kesempatan kedua — ajakan untuk hadir sepenuhnya dan berhenti menunda bahagia.', 'katalog', 4, null, null, 'id', true, 'Paling dicari · Apr 2026', false, false, null),
  ('b-seorang-wanita-yang-ingin-menjadi-pohon-semangka-di-kehidupa', 'Seorang Wanita yang Ingin Menjadi Pohon Semangka di Kehidupan Berikutnya', 'Andreas Kurniawan', 2025, null, array['Non-Fiksi', 'Psikologi']::text[], 'Seorang psikiater menuturkan kisah pasiennya yang ingin terlahir kembali sebagai pohon semangka — renungan hangat tentang ketidaksempurnaan, penyesalan, dan berdamai dengan diri sendiri.', 'katalog', 5, null, null, 'id', true, 'Best seller Gramedia · Mar 2026', false, false, null),
  ('b-seorang-anak-yang-bersembunyi-di-balik-topeng-superhero', 'Seorang Anak yang Bersembunyi di Balik Topeng Superhero', 'Andreas Kurniawan', null, null, array['Non-Fiksi', 'Psikologi']::text[], 'Dari sudut pandang psikiater: anak yang tampak kuat bisa saja menyembunyikan luka emosional, dan kehadiran emosional orang tua sangat berarti.', 'katalog', 6, null, null, 'id', true, 'Paling dicari · Apr 2026', false, false, null),
  ('b-sisi-tergelap-surga', 'Sisi Tergelap Surga', 'Brian Khrisna', 2023, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 7, null, null, 'id', true, 'Best seller Gramedia · Mei 2026', false, false, null),
  ('b-khw-kisah-horor-wawak', 'KHW: Kisah Horor Wawak', 'Nadia Omara', null, null, array['Horor', 'Sastra Indonesia']::text[], '', 'katalog', 8, null, null, 'id', true, 'Best seller Gramedia · Okt 2026', false, false, null),
  ('b-dream-notes-kilau-gadang-di-dunia-imaji', 'Dream Notes: Kilau & Gadang di Dunia Imaji', 'J.S. Khairen', null, null, array['Sastra Indonesia', 'Fantasi']::text[], '', 'katalog', 9, null, null, 'id', true, 'Best seller Gramedia · Okt 2026', false, false, null),
  ('b-3726-mdpl', '3726 MDPL', 'Nurwina Sari', null, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 10, null, null, 'id', true, 'Best seller Gramedia · Sep 2026', false, false, null),
  ('b-memburu-muhammad', 'Memburu Muhammad', 'Feby Indirani', null, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 11, null, null, 'id', true, 'Best seller Gramedia · Sep 2026', false, false, null),
  ('b-makanya-mikir', 'Makanya, Mikir', 'Abigail Limuria & Cania Citta', null, null, array['Non-Fiksi', 'Filsafat']::text[], '', 'katalog', 12, null, null, 'id', true, 'Best seller Gramedia · Mei 2026', false, false, null),
  ('b-what-it-takes-asia-tenggara-dari-tepi-menuju-inti-kesadaran-', 'What It Takes: Asia Tenggara, Dari Tepi Menuju Inti Kesadaran Global', 'Gita Wirjawan', null, null, array['Non-Fiksi', 'Sejarah']::text[], '', 'katalog', 13, null, null, 'id', true, 'Best seller Gramedia · Agu 2026', false, false, null),
  ('b-dompet-ayah-sepatu-ibu', 'Dompet Ayah Sepatu Ibu', 'J.S. Khairen', null, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 14, null, null, 'id', true, 'Best seller Gramedia · Apr 2026', false, false, null),
  ('b-tukar-takdir', 'Tukar Takdir', 'Valiant Budi', 2019, null, array['Sastra Indonesia', 'Fiksi']::text[], 'Dua belas cerita tentang nasib — perkara yang kita takuti dan pasti terjadi, salah satunya mungkin pernah, sedang, atau akan jadi milikmu.', 'katalog', 15, null, null, 'id', true, 'Diadaptasi ke film 2025', false, false, null),
  ('b-buy-yourself-the-damn-flowers', 'Buy Yourself the Damn Flowers', 'Tam Kaur', null, null, array['Pengembangan Diri', 'Psikologi']::text[], '', 'katalog', 16, null, null, 'en', true, 'Best seller Gramedia · Okt 2026', false, false, null),
  ('b-the-correspondent', 'The Correspondent', 'Virginia Evans', 2025, null, array['Sastra Dunia', 'Fiksi']::text[], '', 'katalog', 17, null, null, 'en', false, 'Bestseller Publishers Weekly 2026', false, true, null),
  ('b-yesteryear', 'Yesteryear', 'Caro Claire Burke', 2026, null, array['Fiksi']::text[], '', 'katalog', 18, null, null, 'en', false, 'Bestseller Publishers Weekly 2026', false, true, null),
  ('b-the-calamity-club', 'The Calamity Club', 'Kathryn Stockett', 2026, null, array['Fiksi Sejarah']::text[], '', 'katalog', 19, null, null, 'en', false, 'Bestseller Publishers Weekly · Agu 2026', false, true, null),
  ('b-whistler', 'Whistler', 'Ann Patchett', 2026, null, array['Sastra Dunia', 'Fiksi']::text[], '', 'katalog', 20, null, null, 'en', false, 'Bestseller Publishers Weekly 2026', false, true, null),
  ('b-kin', 'Kin', 'Tayari Jones', 2026, null, array['Sastra Dunia', 'Fiksi']::text[], '', 'katalog', 21, null, null, 'en', false, 'Bestseller Publishers Weekly · Mar 2026', false, true, null),
  ('b-the-astral-library', 'The Astral Library', 'Kate Quinn', 2026, null, array['Fantasi', 'Fiksi Sejarah']::text[], '', 'katalog', 22, null, null, 'en', false, 'Bestseller Publishers Weekly · Feb 2026', false, true, null),
  ('b-theo-of-golden', 'Theo of Golden', 'Allen Levi', null, null, array['Fiksi']::text[], '', 'katalog', 23, null, null, 'en', false, 'Bestseller Publishers Weekly 2026', false, true, null),
  ('b-daggermouth', 'Daggermouth', 'H.M. Wolfe', 2026, null, array['Fantasi', 'Romansa']::text[], '', 'katalog', 24, null, null, 'en', false, 'Bestseller Publishers Weekly · Agu 2026', false, true, null),
  ('b-sea-of-charms', 'Sea of Charms', 'Sarah Beth Durst', 2026, null, array['Fantasi', 'Romansa']::text[], '', 'katalog', 25, null, null, 'en', false, 'Bestseller Publishers Weekly · Agu 2026', false, true, null),
  ('b-strangers', 'Strangers', 'Belle Burden', 2026, null, array['Memoar', 'Non-Fiksi']::text[], '', 'katalog', 26, null, null, 'en', false, 'Bestseller Publishers Weekly 2026', false, true, null),
  ('b-naoko', 'Naoko', 'Keigo Higashino', null, null, array['Misteri & Thriller', 'Sastra Dunia']::text[], 'Setelah kecelakaan bus, jiwa seorang istri terbangun di tubuh putrinya — kisah keluarga yang ganjil sekaligus menyentuh.', 'katalog', 27, null, null, 'ja', true, 'Best seller Gramedia · Mei 2026', false, false, null),
  ('b-teka-teki-gambar-aneh', 'Teka-Teki Gambar Aneh', 'Uketsu', null, null, array['Misteri & Thriller', 'Sastra Dunia']::text[], 'Misteri yang dipecahkan lewat serangkaian gambar ganjil — setiap sketsa menyimpan petunjuk.', 'katalog', 28, null, null, 'ja', true, 'Best seller Gramedia · Feb 2026', false, false, null),
  ('b-goodbye-eri', 'Goodbye, Eri', 'Tatsuki Fujimoto', null, null, array['Komik & Manga']::text[], '', 'katalog', 29, null, null, 'ja', true, 'Best seller Gramedia · Jun 2026', false, false, null),
  ('b-as-long-as-the-lemon-trees-grow', 'As Long as the Lemon Trees Grow', 'Zoulfa Katouh', 2022, null, array['Sastra Dunia', 'Romansa']::text[], '', 'katalog', 30, null, null, 'en', true, 'Best seller Gramedia · Mei 2026', false, false, null),
  ('b-laskar-pelangi', 'Laskar Pelangi', 'Andrea Hirata', 2005, null, array['Sastra Indonesia', 'Fiksi']::text[], 'Sepuluh anak dari keluarga miskin di Belitong berjuang bersekolah di SD yang nyaris ditutup, ditemani guru yang tak pernah menyerah.', 'katalog', 31, null, null, 'id', false, 'Klasik modern Indonesia', true, false, null),
  ('b-sang-pemimpi', 'Sang Pemimpi', 'Andrea Hirata', 2006, null, array['Sastra Indonesia', 'Fiksi']::text[], 'Ikal, Arai, dan Jimbron menjalani masa SMA di Belitong dengan kerja keras, kenakalan, dan mimpi besar untuk sekolah ke Prancis.', 'katalog', 32, null, null, 'id', false, null, false, false, null),
  ('b-orang-orang-biasa', 'Orang-Orang Biasa', 'Andrea Hirata', 2019, null, array['Sastra Indonesia', 'Fiksi']::text[], 'Sekelompok sahabat yang serba biasa merencanakan aksi nekat demi membiayai kuliah anak salah satu dari mereka.', 'katalog', 33, null, null, 'id', false, null, false, false, null),
  ('b-bumi-manusia', 'Bumi Manusia', 'Pramoedya Ananta Toer', 1980, null, array['Sastra Indonesia', 'Fiksi Sejarah', 'Klasik']::text[], 'Minke, pemuda pribumi terpelajar di akhir abad ke-19, jatuh cinta pada Annelies dan berhadapan dengan hukum kolonial yang timpang.', 'katalog', 34, null, null, 'id', false, null, false, false, null),
  ('b-anak-semua-bangsa', 'Anak Semua Bangsa', 'Pramoedya Ananta Toer', 1980, null, array['Sastra Indonesia', 'Fiksi Sejarah', 'Klasik']::text[], 'Lanjutan kisah Minke yang mulai belajar melihat penderitaan bangsanya sendiri di bawah kolonialisme.', 'katalog', 35, null, null, 'id', false, null, false, false, null),
  ('b-cantik-itu-luka', 'Cantik Itu Luka', 'Eka Kurniawan', 2002, null, array['Sastra Indonesia', 'Fiksi Sejarah']::text[], 'Dewi Ayu bangkit dari kubur setelah dua puluh satu tahun, membuka saga keluarga yang liar dan getir di kota fiktif Halimunda.', 'katalog', 36, null, null, 'id', false, 'Sastra Indonesia mendunia', true, false, null),
  ('b-lelaki-harimau', 'Lelaki Harimau', 'Eka Kurniawan', 2004, null, array['Sastra Indonesia', 'Fiksi']::text[], 'Seorang pemuda desa melakukan pembunuhan brutal dan mengaku ada harimau putih bersemayam di dalam tubuhnya.', 'katalog', 37, null, null, 'id', false, null, false, false, null),
  ('b-seperti-dendam-rindu-harus-dibayar-tuntas', 'Seperti Dendam, Rindu Harus Dibayar Tuntas', 'Eka Kurniawan', 2014, null, array['Sastra Indonesia', 'Fiksi']::text[], 'Ajo Kawir, jagoan kampung yang gemar berkelahi, menyimpan rahasia yang memalukan sekaligus mengubah hidupnya.', 'katalog', 38, null, null, 'id', false, null, false, false, null),
  ('b-laut-bercerita', 'Laut Bercerita', 'Leila S. Chudori', 2017, null, array['Sastra Indonesia', 'Fiksi Sejarah']::text[], 'Biru Laut, mahasiswa aktivis, hilang menjelang 1998. Keluarganya terus menunggu jawaban yang tak kunjung datang.', 'katalog', 34, null, null, 'id', true, 'Best seller Gramedia · Agu 2026', true, false, null),
  ('b-pulang', 'Pulang', 'Leila S. Chudori', 2012, null, array['Sastra Indonesia', 'Fiksi Sejarah']::text[], 'Para eksil politik membuka restoran di Paris. Puluhan tahun kemudian, putri salah satu dari mereka pergi ke Jakarta yang sedang bergolak.', 'katalog', 40, null, null, 'id', false, null, false, false, null),
  ('b-ronggeng-dukuh-paruk', 'Ronggeng Dukuh Paruk', 'Ahmad Tohari', 1982, null, array['Sastra Indonesia', 'Klasik']::text[], 'Srintil dinobatkan menjadi ronggeng di dukuh kecil yang miskin, sementara sahabat masa kecilnya memilih pergi.', 'katalog', 41, null, null, 'id', false, null, false, false, null),
  ('b-negeri-5-menara', 'Negeri 5 Menara', 'Ahmad Fuadi', 2009, null, array['Sastra Indonesia', 'Fiksi']::text[], 'Alif merantau ke pesantren dan bersahabat dengan lima kawan. Berbekal “man jadda wajada”, mereka menggantungkan mimpi setinggi menara.', 'katalog', 42, null, null, 'id', false, null, false, false, null),
  ('b-perahu-kertas', 'Perahu Kertas', 'Dee Lestari', 2009, null, array['Sastra Indonesia', 'Romansa']::text[], 'Kugy si calon penulis dongeng dan Keenan si calon pelukis bertemu di Bandung, lalu takdir terus mempertemukan dan memisahkan mereka.', 'katalog', 43, null, null, 'id', false, 'Favorit sepanjang masa', true, false, null),
  ('b-supernova-ksatria-puteri-dan-bintang-jatuh', 'Supernova: Ksatria, Puteri, dan Bintang Jatuh', 'Dee Lestari', 2001, null, array['Sastra Indonesia', 'Fiksi Ilmiah']::text[], 'Sepasang penulis merancang kisah cinta segitiga yang perlahan bersinggungan dengan kehidupan nyata, dibalut sains dan filsafat.', 'katalog', 44, null, null, 'id', false, null, false, false, null),
  ('b-saman', 'Saman', 'Ayu Utami', 1998, null, array['Sastra Indonesia', 'Fiksi']::text[], 'Kisah seorang mantan pastor yang membela petani dan empat sahabat perempuan yang menantang batas-batas di akhir Orde Baru.', 'katalog', 45, null, null, 'id', false, null, false, false, null),
  ('b-gadis-kretek', 'Gadis Kretek', 'Ratih Kumala', 2012, null, array['Sastra Indonesia', 'Fiksi Sejarah', 'Romansa']::text[], 'Seorang juragan kretek yang sekarat menyebut nama perempuan misterius. Anak-anaknya menelusuri masa lalu dan sejarah keluarga mereka.', 'katalog', 46, null, null, 'id', false, null, false, false, null),
  ('b-amba', 'Amba', 'Laksmi Pamuntjak', 2012, null, array['Sastra Indonesia', 'Fiksi Sejarah', 'Romansa']::text[], 'Amba menempuh perjalanan ke Pulau Buru untuk mencari jejak kekasih yang hilang setelah 1965.', 'katalog', 47, null, null, 'id', false, null, false, false, null),
  ('b-hujan', 'Hujan', 'Tere Liye', 2016, null, array['Sastra Indonesia', 'Fiksi Ilmiah', 'Romansa']::text[], 'Di masa depan setelah bencana besar, Lail tumbuh dewasa bersama Esok, sosok yang menyelamatkannya — tentang cinta dan keinginan untuk melupakan.', 'katalog', 48, null, null, 'id', false, 'Tere Liye · selalu laris', true, false, null),
  ('b-bumi', 'Bumi', 'Tere Liye', 2014, null, array['Sastra Indonesia', 'Fantasi', 'Young Adult']::text[], 'Raib, remaja lima belas tahun, bisa menghilang. Bersama dua sahabatnya ia terseret ke petualangan di dunia paralel.', 'katalog', 49, null, null, 'id', false, 'Serial Bumi · terus dicetak ulang', true, false, null),
  ('b-rindu', 'Rindu', 'Tere Liye', 2014, null, array['Sastra Indonesia', 'Fiksi Sejarah']::text[], 'Sebuah kapal haji berlayar dari Makassar pada masa kolonial, membawa penumpang dengan pertanyaan-pertanyaan hidup yang belum terjawab.', 'katalog', 50, null, null, 'id', false, 'Tere Liye · selalu laris', true, false, null),
  ('b-dilan-dia-adalah-dilanku-tahun-1990', 'Dilan: Dia adalah Dilanku Tahun 1990', 'Pidi Baiq', 2014, null, array['Sastra Indonesia', 'Romansa', 'Young Adult']::text[], 'Milea, siswi pindahan di Bandung tahun 1990, didekati Dilan — anak geng motor yang ternyata puitis dan penuh kejutan.', 'katalog', 51, null, null, 'id', false, 'Ikon pop Indonesia', true, false, null),
  ('b-ayat-ayat-cinta', 'Ayat-Ayat Cinta', 'Habiburrahman El Shirazy', 2004, null, array['Sastra Indonesia', 'Romansa']::text[], 'Fahri, mahasiswa Indonesia di Kairo, menjalani hidup sederhana yang tiba-tiba diwarnai cinta, fitnah, dan ujian iman.', 'katalog', 52, null, null, 'id', false, null, false, false, null),
  ('b-home-sweet-loan', 'Home Sweet Loan', 'Almira Bastari', 2022, null, array['Sastra Indonesia', 'Fiksi']::text[], 'Kaluna menabung mati-matian demi rumah impian sendiri, sambil tinggal berdesakan dengan keluarga besarnya di Jakarta.', 'katalog', 53, null, null, 'id', false, 'Sudah difilmkan', true, false, null),
  ('b-garis-waktu', 'Garis Waktu', 'Fiersa Besari', 2016, null, array['Sastra Indonesia', 'Puisi', 'Romansa']::text[], 'Kumpulan tulisan tentang perjalanan mencintai, kehilangan, dan belajar mengikhlaskan.', 'katalog', 54, null, null, 'id', false, 'Favorit pembaca muda', true, false, null),
  ('b-filosofi-teras', 'Filosofi Teras', 'Henry Manampiring', 2018, null, array['Non-Fiksi', 'Filsafat', 'Pengembangan Diri']::text[], 'Pengantar filsafat Stoa yang ringan dan membumi untuk menghadapi kecemasan dan hal-hal di luar kendali kita.', 'katalog', 55, null, null, null, false, 'Best seller sepanjang masa', true, false, null),
  ('b-sebuah-seni-untuk-bersikap-bodo-amat', 'Sebuah Seni untuk Bersikap Bodo Amat', 'Mark Manson', 2016, null, array['Non-Fiksi', 'Pengembangan Diri']::text[], 'Ajakan jujur untuk berhenti mengejar semua hal, dan memilih dengan sadar apa yang benar-benar layak dipedulikan.', 'katalog', 56, null, null, null, false, null, false, false, null),
  ('b-fourth-wing', 'Fourth Wing', 'Rebecca Yarros', 2023, null, array['Fantasi', 'Romansa', 'Young Adult']::text[], 'Violet Sorrengail dipaksa masuk akademi militer penunggang naga, tempat gagal berarti mati.', 'katalog', 57, null, null, null, false, null, false, false, null),
  ('b-iron-flame', 'Iron Flame', 'Rebecca Yarros', 2023, null, array['Fantasi', 'Romansa']::text[], 'Tahun kedua di akademi penunggang naga: rahasia kerajaan terkuak dan perang semakin dekat.', 'katalog', 58, null, null, null, false, null, false, false, null),
  ('b-onyx-storm', 'Onyx Storm', 'Rebecca Yarros', 2025, null, array['Fantasi', 'Romansa']::text[], 'Buku ketiga seri Empyrean. Violet mencari sekutu di luar batas negerinya saat ancaman makin gelap.', 'katalog', 34, null, null, null, true, 'Fantasi paling viral 2025', false, false, null),
  ('b-a-court-of-thorns-and-roses', 'A Court of Thorns and Roses', 'Sarah J. Maas', 2015, null, array['Fantasi', 'Romansa']::text[], 'Feyre, pemburu muda, membunuh seekor serigala dan dibawa ke negeri peri yang memikat sekaligus berbahaya.', 'katalog', 60, null, null, null, false, null, false, false, null),
  ('b-it-ends-with-us', 'It Ends with Us', 'Colleen Hoover', 2016, null, array['Romansa', 'Fiksi']::text[], 'Lily jatuh cinta pada seorang ahli bedah karismatik, sampai masa lalu dan cinta pertamanya kembali muncul.', 'katalog', 61, null, null, null, false, null, false, false, null),
  ('b-verity', 'Verity', 'Colleen Hoover', 2018, null, array['Misteri & Thriller']::text[], 'Seorang penulis yang kesulitan diminta menyelesaikan seri novel penulis terkenal — dan menemukan naskah otobiografi yang mengerikan.', 'katalog', 62, null, null, null, false, null, false, false, null),
  ('b-the-housemaid', 'The Housemaid', 'Freida McFadden', 2022, null, array['Misteri & Thriller']::text[], 'Millie mendapat pekerjaan sebagai asisten rumah tangga di rumah keluarga kaya. Pintu kamarnya terkunci dari luar.', 'katalog', 33, null, null, null, true, 'Masih di daftar bestseller 2026', false, false, null),
  ('b-the-seven-husbands-of-evelyn-hugo', 'The Seven Husbands of Evelyn Hugo', 'Taylor Jenkins Reid', 2017, null, array['Fiksi', 'Romansa', 'Fiksi Sejarah']::text[], 'Ikon Hollywood yang tertutup akhirnya menceritakan kisah hidup dan tujuh pernikahannya kepada seorang jurnalis muda.', 'katalog', 64, null, null, null, false, null, false, false, null),
  ('b-funny-story', 'Funny Story', 'Emily Henry', 2024, null, array['Romansa']::text[], 'Dua orang yang ditinggal pasangannya — yang kini saling berpacaran — memutuskan tinggal serumah dan berpura-pura bahagia.', 'katalog', 65, null, null, null, false, null, false, false, null),
  ('b-great-big-beautiful-life', 'Great Big Beautiful Life', 'Emily Henry', 2025, null, array['Romansa', 'Fiksi']::text[], 'Dua penulis bersaing untuk menulis biografi seorang pewaris kaya yang misterius, dan masing-masing hanya mendengar separuh cerita.', 'katalog', 66, null, null, null, false, null, false, false, null),
  ('b-tomorrow-and-tomorrow-and-tomorrow', 'Tomorrow, and Tomorrow, and Tomorrow', 'Gabrielle Zevin', 2022, null, array['Fiksi', 'Sastra Dunia']::text[], 'Persahabatan dua pembuat video game selama tiga puluh tahun: tentang kreativitas, kegagalan, dan cinta yang tak bernama.', 'katalog', 67, null, null, null, false, null, false, false, null),
  ('b-lessons-in-chemistry', 'Lessons in Chemistry', 'Bonnie Garmus', 2022, null, array['Fiksi', 'Fiksi Sejarah']::text[], 'Ahli kimia brilian di tahun 1960-an yang diremehkan dunia sains justru menjadi bintang acara memasak di televisi.', 'katalog', 68, null, null, null, false, null, false, false, null),
  ('b-yellowface', 'Yellowface', 'R. F. Kuang', 2023, null, array['Fiksi', 'Misteri & Thriller']::text[], 'Seorang penulis mencuri naskah sahabatnya yang meninggal dan menerbitkannya atas nama sendiri. Satire tajam dunia penerbitan.', 'katalog', 69, null, null, null, false, null, false, false, null),
  ('b-babel', 'Babel', 'R. F. Kuang', 2022, null, array['Fantasi', 'Fiksi Sejarah']::text[], 'Di Oxford abad ke-19, penerjemahan adalah sihir dan kekuasaan. Seorang mahasiswa mulai mempertanyakan untuk siapa ia bekerja.', 'katalog', 70, null, null, null, false, null, false, false, null),
  ('b-james', 'James', 'Percival Everett', 2024, null, array['Sastra Dunia', 'Fiksi Sejarah']::text[], 'Kisah petualangan Huckleberry Finn diceritakan ulang dari sudut pandang Jim, dengan suara yang cerdas dan tajam.', 'katalog', 71, null, null, null, false, null, false, false, null),
  ('b-intermezzo', 'Intermezzo', 'Sally Rooney', 2024, null, array['Sastra Dunia', 'Fiksi']::text[], 'Dua kakak beradik yang sangat berbeda berusaha menjalani hidup dan cinta setelah kematian ayah mereka.', 'katalog', 72, null, null, null, false, null, false, false, null),
  ('b-normal-people', 'Normal People', 'Sally Rooney', 2018, null, array['Sastra Dunia', 'Romansa']::text[], 'Connell dan Marianne tumbuh dari sekolah di kota kecil Irlandia hingga kuliah, saling tarik-menarik selama bertahun-tahun.', 'katalog', 73, null, null, null, false, null, false, false, null),
  ('b-the-women', 'The Women', 'Kristin Hannah', 2024, null, array['Fiksi Sejarah']::text[], 'Seorang perawat muda bertugas di Perang Vietnam, lalu pulang ke negeri yang tak ingin mendengar kisahnya.', 'katalog', 74, null, null, null, false, null, false, false, null),
  ('b-demon-copperhead', 'Demon Copperhead', 'Barbara Kingsolver', 2022, null, array['Sastra Dunia']::text[], 'David Copperfield diceritakan ulang di pegunungan Appalachia modern, di tengah krisis opioid.', 'katalog', 75, null, null, null, false, null, false, false, null),
  ('b-orbital', 'Orbital', 'Samantha Harvey', 2023, null, array['Sastra Dunia']::text[], 'Satu hari di stasiun luar angkasa: enam astronaut, enam belas kali mengorbit Bumi, dan renungan tentang planet kita.', 'katalog', 76, null, null, null, false, null, false, false, null),
  ('b-sunrise-on-the-reaping', 'Sunrise on the Reaping', 'Suzanne Collins', 2025, null, array['Fiksi Ilmiah', 'Young Adult', 'Fantasi']::text[], 'Kembali ke Panem: kisah Hunger Games yang diikuti Haymitch muda, jauh sebelum ia menjadi mentor.', 'katalog', 32, null, null, null, true, 'Best seller Gramedia Digital · Nov 2025', false, false, null),
  ('b-the-let-them-theory', 'The Let Them Theory', 'Mel Robbins', 2024, null, array['Pengembangan Diri', 'Psikologi']::text[], 'Dua kata sederhana untuk berhenti mengendalikan orang lain dan mengembalikan energi pada hal yang bisa kita kendalikan.', 'katalog', 33, null, null, null, true, 'Best seller Gramedia · Feb 2026', false, false, null),
  ('b-the-anxious-generation', 'The Anxious Generation', 'Jonathan Haidt', 2024, null, array['Non-Fiksi', 'Psikologi']::text[], 'Bagaimana ponsel pintar dan media sosial mengubah masa kanak-kanak dan memicu krisis kesehatan mental remaja.', 'katalog', 79, null, null, null, false, null, false, false, null),
  ('b-butter', 'Butter', 'Asako Yuzuki', 2017, null, array['Sastra Dunia', 'Misteri & Thriller']::text[], 'Seorang jurnalis mewawancarai juru masak yang dipenjara atas tuduhan pembunuhan — dan perlahan terhanyut oleh obsesinya pada makanan.', 'katalog', 80, null, null, null, false, null, false, false, null),
  ('b-remarkably-bright-creatures', 'Remarkably Bright Creatures', 'Shelby Van Pelt', 2022, null, array['Fiksi']::text[], 'Seorang janda yang bekerja malam di akuarium bersahabat dengan gurita yang sangat cerdas.', 'katalog', 81, null, null, null, false, null, false, false, null),
  ('b-atomic-habits', 'Atomic Habits', 'James Clear', 2018, null, array['Pengembangan Diri', 'Non-Fiksi']::text[], 'Panduan praktis membangun kebiasaan baik dan menghentikan kebiasaan buruk lewat perubahan kecil yang konsisten.', 'katalog', 82, null, null, null, false, 'Best seller sepanjang masa', true, false, null),
  ('b-the-psychology-of-money', 'The Psychology of Money', 'Morgan Housel', 2020, null, array['Bisnis & Keuangan', 'Psikologi']::text[], 'Kumpulan kisah pendek tentang mengapa perilaku kita terhadap uang lebih penting daripada kecerdasan finansial.', 'katalog', 83, null, null, null, false, null, false, false, null),
  ('b-rich-dad-poor-dad', 'Rich Dad Poor Dad', 'Robert T. Kiyosaki', 1997, null, array['Bisnis & Keuangan', 'Pengembangan Diri']::text[], 'Pelajaran keuangan dari dua sosok ayah dengan cara pandang yang sangat berbeda tentang uang dan aset.', 'katalog', 84, null, null, null, false, null, false, false, null),
  ('b-sapiens', 'Sapiens', 'Yuval Noah Harari', 2011, null, array['Sejarah', 'Non-Fiksi']::text[], 'Riwayat singkat umat manusia, dari revolusi kognitif hingga revolusi ilmiah.', 'katalog', 85, null, null, null, false, null, false, false, null),
  ('b-thinking-fast-and-slow', 'Thinking, Fast and Slow', 'Daniel Kahneman', 2011, null, array['Psikologi', 'Non-Fiksi']::text[], 'Dua sistem berpikir manusia — yang cepat dan intuitif, dan yang lambat dan logis — serta bias-bias yang menyertainya.', 'katalog', 86, null, null, null, false, null, false, false, null),
  ('b-man-s-search-for-meaning', 'Man''s Search for Meaning', 'Viktor E. Frankl', 1946, null, array['Psikologi', 'Memoar', 'Filsafat']::text[], 'Pengalaman seorang psikiater di kamp konsentrasi dan gagasannya bahwa makna hidup bisa ditemukan bahkan dalam penderitaan.', 'katalog', 87, null, null, null, false, null, false, false, null),
  ('b-educated', 'Educated', 'Tara Westover', 2018, null, array['Memoar', 'Non-Fiksi']::text[], 'Tumbuh tanpa sekolah formal di pegunungan Idaho, seorang perempuan menempuh jalan panjang hingga meraih gelar doktor.', 'katalog', 88, null, null, null, false, null, false, false, null),
  ('b-becoming', 'Becoming', 'Michelle Obama', 2018, null, array['Memoar', 'Non-Fiksi']::text[], 'Memoar tentang masa kecil di Chicago, karier, keluarga, hingga tahun-tahun di Gedung Putih.', 'katalog', 89, null, null, null, false, null, false, false, null),
  ('b-ikigai', 'Ikigai', 'Héctor García & Francesc Miralles', 2016, null, array['Pengembangan Diri', 'Filsafat']::text[], 'Menjelajahi konsep Jepang tentang alasan untuk bangun setiap pagi, terinspirasi dari kebiasaan orang-orang berumur panjang.', 'katalog', 90, null, null, null, false, null, false, false, null),
  ('b-deep-work', 'Deep Work', 'Cal Newport', 2016, null, array['Pengembangan Diri', 'Bisnis & Keuangan']::text[], 'Kemampuan fokus mendalam tanpa distraksi semakin langka — dan semakin berharga.', 'katalog', 91, null, null, null, false, null, false, false, null),
  ('b-mindset', 'Mindset', 'Carol S. Dweck', 2006, null, array['Psikologi', 'Pengembangan Diri']::text[], 'Perbedaan pola pikir tetap dan pola pikir bertumbuh, serta dampaknya pada belajar dan kesuksesan.', 'katalog', 92, null, null, null, false, null, false, false, null),
  ('b-the-48-laws-of-power', 'The 48 Laws of Power', 'Robert Greene', 1998, null, array['Non-Fiksi', 'Sejarah']::text[], 'Empat puluh delapan prinsip tentang kekuasaan, diambil dari kisah tokoh-tokoh sejarah.', 'katalog', 93, null, null, null, false, null, false, false, null),
  ('b-project-hail-mary', 'Project Hail Mary', 'Andy Weir', 2021, null, array['Fiksi Ilmiah']::text[], 'Seorang guru sains terbangun sendirian di pesawat antariksa tanpa ingatan, dengan misi menyelamatkan Bumi.', 'katalog', 34, null, null, null, true, 'Paling dicari · Apr 2026', false, false, null),
  ('b-dune', 'Dune', 'Frank Herbert', 1965, null, array['Fiksi Ilmiah', 'Klasik']::text[], 'Paul Atreides dan keluarganya mengambil alih planet gurun Arrakis, satu-satunya sumber rempah paling berharga di jagat raya.', 'katalog', 95, null, null, null, false, null, false, false, null),
  ('b-the-midnight-library', 'The Midnight Library', 'Matt Haig', 2020, null, array['Fiksi', 'Fantasi']::text[], 'Di antara hidup dan mati, Nora menemukan perpustakaan berisi semua kemungkinan hidup yang bisa ia jalani.', 'katalog', 96, null, null, null, false, 'Favorit pembaca dunia', true, false, null),
  ('b-klara-and-the-sun', 'Klara and the Sun', 'Kazuo Ishiguro', 2021, null, array['Fiksi Ilmiah', 'Sastra Dunia']::text[], 'Klara, sahabat buatan yang sangat pengamat, menunggu dipilih oleh seorang anak. Renungan tenang tentang cinta.', 'katalog', 97, null, null, null, false, null, false, false, null),
  ('b-piranesi', 'Piranesi', 'Susanna Clarke', 2020, null, array['Fantasi', 'Misteri & Thriller']::text[], 'Piranesi tinggal di sebuah Rumah berisi aula tanpa ujung dan laut yang pasang-surut, hingga ia mulai meragukan dunianya.', 'katalog', 98, null, null, null, false, null, false, false, null),
  ('b-the-silent-patient', 'The Silent Patient', 'Alex Michaelides', 2019, null, array['Misteri & Thriller']::text[], 'Seorang pelukis menembak suaminya lalu berhenti bicara. Seorang psikoterapis bertekad membuatnya bersuara.', 'katalog', 99, null, null, null, false, null, false, false, null),
  ('b-where-the-crawdads-sing', 'Where the Crawdads Sing', 'Delia Owens', 2018, null, array['Fiksi', 'Misteri & Thriller']::text[], 'Gadis yang tumbuh sendirian di rawa-rawa Carolina Utara menjadi tersangka ketika seorang pemuda ditemukan tewas.', 'katalog', 100, null, null, null, false, null, false, false, null),
  ('b-funiculi-funicula', 'Funiculi Funicula', 'Toshikazu Kawaguchi', 2015, null, array['Sastra Dunia', 'Fantasi']::text[], 'Di sebuah kafe kecil di Tokyo, kamu bisa kembali ke masa lalu — asal kembali sebelum kopimu dingin.', 'katalog', 101, null, null, null, false, 'Favorit pembaca Indonesia', true, false, null),
  ('b-convenience-store-woman', 'Convenience Store Woman', 'Sayaka Murata', 2016, null, array['Sastra Dunia']::text[], 'Keiko sudah delapan belas tahun bekerja di minimarket dan merasa utuh di sana, meski dunia menuntutnya jadi “normal”.', 'katalog', 102, null, null, null, false, null, false, false, null),
  ('b-almond', 'Almond', 'Sohn Won-pyung', 2017, null, array['Sastra Dunia', 'Young Adult']::text[], 'Remaja yang sulit merasakan emosi menjalin persahabatan tak terduga setelah tragedi mengubah hidupnya.', 'katalog', 103, null, null, null, false, null, false, false, null),
  ('b-kafka-on-the-shore', 'Kafka on the Shore', 'Haruki Murakami', 2002, null, array['Sastra Dunia', 'Fantasi']::text[], 'Seorang remaja kabur dari rumah, sementara seorang kakek yang bisa bicara dengan kucing memulai perjalanan misterius.', 'katalog', 104, null, null, null, false, null, false, false, null),
  ('b-norwegian-wood', 'Norwegian Wood', 'Haruki Murakami', 1987, null, array['Sastra Dunia', 'Romansa']::text[], 'Toru Watanabe mengenang masa kuliahnya di Tokyo akhir 1960-an, terbelah antara dua perempuan yang sangat berbeda.', 'katalog', 105, null, null, null, false, null, false, false, null),
  ('b-the-song-of-achilles', 'The Song of Achilles', 'Madeline Miller', 2011, null, array['Fantasi', 'Romansa', 'Fiksi Sejarah']::text[], 'Kisah Patroclus dan Achilles, dari masa kecil hingga Perang Troya.', 'katalog', 106, null, null, null, false, null, false, false, null),
  ('b-circe', 'Circe', 'Madeline Miller', 2018, null, array['Fantasi', 'Sastra Dunia']::text[], 'Putri dewa matahari yang diasingkan ke sebuah pulau menemukan kekuatannya sendiri sebagai penyihir.', 'katalog', 107, null, null, null, false, null, false, false, null),
  ('b-six-of-crows', 'Six of Crows', 'Leigh Bardugo', 2015, null, array['Fantasi', 'Young Adult']::text[], 'Enam remaja buangan direkrut untuk perampokan yang mustahil.', 'katalog', 108, null, null, null, false, null, false, false, null),
  ('b-the-hunger-games', 'The Hunger Games', 'Suzanne Collins', 2008, null, array['Fiksi Ilmiah', 'Young Adult']::text[], 'Katniss Everdeen menggantikan adiknya dalam ajang bertahan hidup yang disiarkan ke seluruh negeri.', 'katalog', 109, null, null, null, false, null, false, false, null),
  ('b-harry-potter-and-the-philosopher-s-stone', 'Harry Potter and the Philosopher''s Stone', 'J.K. Rowling', 1997, null, array['Fantasi', 'Young Adult']::text[], 'Di ulang tahun ke-11, Harry mengetahui bahwa ia seorang penyihir dan diundang ke Sekolah Hogwarts.', 'katalog', 110, null, null, null, false, null, false, false, null),
  ('b-the-hobbit', 'The Hobbit', 'J.R.R. Tolkien', 1937, null, array['Fantasi', 'Klasik']::text[], 'Bilbo Baggins yang cinta kenyamanan ikut petualangan sekelompok kurcaci untuk merebut kembali harta dari seekor naga.', 'katalog', 111, null, null, null, false, null, false, false, null),
  ('b-the-book-thief', 'The Book Thief', 'Markus Zusak', 2005, null, array['Fiksi Sejarah', 'Young Adult']::text[], 'Di Jerman masa Nazi, seorang gadis kecil mencuri buku dan berbagi kata-kata dengan orang-orang di sekitarnya.', 'katalog', 112, null, null, null, false, null, false, false, null),
  ('b-the-kite-runner', 'The Kite Runner', 'Khaled Hosseini', 2003, null, array['Sastra Dunia', 'Fiksi Sejarah']::text[], 'Persahabatan dua anak laki-laki di Kabul, pengkhianatan, dan perjalanan panjang menuju penebusan.', 'katalog', 113, null, null, null, false, null, false, false, null),
  ('b-the-alchemist', 'The Alchemist', 'Paulo Coelho', 1988, null, array['Sastra Dunia', 'Fiksi']::text[], 'Seorang gembala muda menempuh perjalanan mencari harta karun dan menemukan makna takdirnya sendiri.', 'katalog', 114, null, null, null, false, null, false, false, null),
  ('b-the-little-prince', 'The Little Prince', 'Antoine de Saint-Exupéry', 1943, null, array['Klasik', 'Fantasi']::text[], 'Seorang pilot yang terdampar di gurun bertemu pangeran kecil dari asteroid yang jauh.', 'katalog', 115, null, null, null, false, null, false, false, null),
  ('b-1984', '1984', 'George Orwell', 1949, null, array['Klasik', 'Fiksi Ilmiah']::text[], 'Winston Smith hidup di bawah Partai yang mengendalikan sejarah, bahasa, bahkan pikiran.', 'katalog', 116, null, null, null, false, null, false, false, null),
  ('b-animal-farm', 'Animal Farm', 'George Orwell', 1945, null, array['Klasik', 'Fiksi']::text[], 'Hewan-hewan di sebuah peternakan memberontak terhadap pemiliknya — lalu kekuasaan perlahan mengubah segalanya.', 'katalog', 117, null, null, null, false, null, false, false, null),
  ('b-to-kill-a-mockingbird', 'To Kill a Mockingbird', 'Harper Lee', 1960, null, array['Klasik', 'Sastra Dunia']::text[], 'Lewat mata Scout kecil, kita menyaksikan ayahnya membela seorang pria kulit hitam yang dituduh secara tidak adil.', 'katalog', 118, null, null, null, false, null, false, false, null),
  ('b-pride-and-prejudice', 'Pride and Prejudice', 'Jane Austen', 1813, null, array['Klasik', 'Romansa']::text[], 'Elizabeth Bennet dan Mr. Darcy belajar melampaui kesan pertama, gengsi, dan prasangka.', 'katalog', 119, null, null, null, false, null, false, false, null),
  ('b-the-great-gatsby', 'The Great Gatsby', 'F. Scott Fitzgerald', 1925, null, array['Klasik', 'Sastra Dunia']::text[], 'Pesta-pesta mewah Jay Gatsby menyimpan satu kerinduan: cinta lama yang tinggal di seberang teluk.', 'katalog', 120, null, null, null, false, null, false, false, null),
  ('b-one-hundred-years-of-solitude', 'One Hundred Years of Solitude', 'Gabriel García Márquez', 1967, null, array['Klasik', 'Sastra Dunia']::text[], 'Tujuh generasi keluarga Buendía di kota Macondo, dalam kisah realisme magis yang legendaris.', 'katalog', 121, null, null, null, false, null, false, false, null),
  ('b-crime-and-punishment', 'Crime and Punishment', 'Fyodor Dostoevsky', 1866, null, array['Klasik', 'Sastra Dunia', 'Filsafat']::text[], 'Seorang mahasiswa miskin di St. Petersburg melakukan pembunuhan dan bergulat dengan rasa bersalahnya.', 'katalog', 122, null, null, null, false, null, false, false, null),
  ('b-little-women', 'Little Women', 'Louisa May Alcott', 1868, null, array['Klasik', 'Fiksi']::text[], 'Empat saudari March tumbuh dewasa dengan mimpi dan jalan hidup masing-masing.', 'katalog', 123, null, null, null, false, null, false, false, null),
  ('b-one-piece-vol-1', 'One Piece, Vol. 1', 'Eiichiro Oda', 1997, null, array['Komik & Manga', 'Fantasi']::text[], 'Monkey D. Luffy, bocah bertubuh karet, berlayar untuk menjadi Raja Bajak Laut.', 'katalog', 124, null, null, null, false, null, false, false, null),
  ('b-bulan', 'Bulan', 'Tere Liye', 2015, null, array['Sastra Indonesia', 'Fantasi']::text[], '', 'katalog', 125, null, null, 'id', false, null, false, false, null),
  ('b-matahari', 'Matahari', 'Tere Liye', 2016, null, array['Sastra Indonesia', 'Fantasi']::text[], '', 'katalog', 126, null, null, 'id', false, null, false, false, null),
  ('b-bintang', 'Bintang', 'Tere Liye', 2017, null, array['Sastra Indonesia', 'Fantasi']::text[], '', 'katalog', 127, null, null, 'id', false, null, false, false, null),
  ('b-ceros-dan-batozar', 'Ceros dan Batozar', 'Tere Liye', 2018, null, array['Sastra Indonesia', 'Fantasi']::text[], '', 'katalog', 128, null, null, 'id', false, null, false, false, null),
  ('b-komet', 'Komet', 'Tere Liye', 2018, null, array['Sastra Indonesia', 'Fantasi']::text[], '', 'katalog', 129, null, null, 'id', false, null, false, false, null),
  ('b-komet-minor', 'Komet Minor', 'Tere Liye', 2019, null, array['Sastra Indonesia', 'Fantasi']::text[], '', 'katalog', 130, null, null, 'id', false, null, false, false, null),
  ('b-selena', 'Selena', 'Tere Liye', 2020, null, array['Sastra Indonesia', 'Fantasi']::text[], '', 'katalog', 131, null, null, 'id', false, null, false, false, null),
  ('b-nebula', 'Nebula', 'Tere Liye', 2020, null, array['Sastra Indonesia', 'Fantasi']::text[], '', 'katalog', 132, null, null, 'id', false, null, false, false, null),
  ('b-si-putih', 'Si Putih', 'Tere Liye', 2021, null, array['Sastra Indonesia', 'Fantasi']::text[], '', 'katalog', 133, null, null, 'id', false, null, false, false, null),
  ('b-lumpu', 'Lumpu', 'Tere Liye', 2021, null, array['Sastra Indonesia', 'Fantasi']::text[], '', 'katalog', 134, null, null, 'id', false, null, false, false, null),
  ('b-bibi-gill', 'Bibi Gill', 'Tere Liye', 2022, null, array['Sastra Indonesia', 'Fantasi']::text[], '', 'katalog', 135, null, null, 'id', false, null, false, false, null),
  ('b-sagaras', 'Sagaras', 'Tere Liye', 2022, null, array['Sastra Indonesia', 'Fantasi']::text[], '', 'katalog', 136, null, null, 'id', false, null, false, false, null),
  ('b-pulang-2', 'Pulang', 'Tere Liye', 2015, null, array['Sastra Indonesia', 'Misteri & Thriller']::text[], '', 'katalog', 137, null, null, 'id', false, 'Tere Liye · selalu laris', true, false, null),
  ('b-pergi', 'Pergi', 'Tere Liye', 2018, null, array['Sastra Indonesia', 'Misteri & Thriller']::text[], '', 'katalog', 138, null, null, 'id', false, null, false, false, null),
  ('b-pulang-pergi', 'Pulang-Pergi', 'Tere Liye', 2021, null, array['Sastra Indonesia', 'Misteri & Thriller']::text[], '', 'katalog', 139, null, null, 'id', false, null, false, false, null),
  ('b-negeri-para-bedebah', 'Negeri Para Bedebah', 'Tere Liye', 2012, null, array['Sastra Indonesia', 'Misteri & Thriller']::text[], '', 'katalog', 140, null, null, 'id', false, null, false, false, null),
  ('b-negeri-di-ujung-tanduk', 'Negeri di Ujung Tanduk', 'Tere Liye', 2013, null, array['Sastra Indonesia', 'Misteri & Thriller']::text[], '', 'katalog', 141, null, null, 'id', false, null, false, false, null),
  ('b-bedebah-di-ujung-tanduk', 'Bedebah di Ujung Tanduk', 'Tere Liye', 2021, null, array['Sastra Indonesia', 'Misteri & Thriller']::text[], '', 'katalog', 142, null, null, 'id', false, null, false, false, null),
  ('b-tentang-kamu', 'Tentang Kamu', 'Tere Liye', 2016, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 143, null, null, 'id', false, 'Tere Liye · selalu laris', true, false, null),
  ('b-hafalan-shalat-delisa', 'Hafalan Shalat Delisa', 'Tere Liye', 2005, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 144, null, null, 'id', false, null, false, false, null),
  ('b-rembulan-tenggelam-di-wajahmu', 'Rembulan Tenggelam di Wajahmu', 'Tere Liye', 2009, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 145, null, null, 'id', false, 'Tere Liye · klasik modern', true, false, null),
  ('b-daun-yang-jatuh-tak-pernah-membenci-angin', 'Daun yang Jatuh Tak Pernah Membenci Angin', 'Tere Liye', 2010, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 146, null, null, 'id', false, null, false, false, null),
  ('b-ayahku-bukan-pembohong', 'Ayahku (Bukan) Pembohong', 'Tere Liye', 2011, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 147, null, null, 'id', false, null, false, false, null),
  ('b-sunset-bersama-rosie', 'Sunset Bersama Rosie', 'Tere Liye', 2008, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 148, null, null, 'id', false, null, false, false, null),
  ('b-kau-aku-sepucuk-angpau-merah', 'Kau, Aku & Sepucuk Angpau Merah', 'Tere Liye', 2012, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 149, null, null, 'id', false, null, false, false, null),
  ('b-moga-bunda-disayang-allah', 'Moga Bunda Disayang Allah', 'Tere Liye', 2006, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 150, null, null, 'id', false, null, false, false, null),
  ('b-selamat-tinggal', 'Selamat Tinggal', 'Tere Liye', 2020, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 151, null, null, 'id', false, null, false, false, null),
  ('b-janji', 'Janji', 'Tere Liye', 2021, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 152, null, null, 'id', false, null, false, false, null),
  ('b-tanah-para-bandit', 'Tanah Para Bandit', 'Tere Liye', 2023, null, array['Sastra Indonesia', 'Misteri & Thriller']::text[], '', 'katalog', 153, null, null, 'id', false, null, false, false, null),
  ('b-teruslah-bodoh-jangan-pintar', 'Teruslah Bodoh Jangan Pintar', 'Tere Liye', 2024, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 154, null, null, 'id', false, null, false, false, null),
  ('b-eliana', 'Eliana', 'Tere Liye', null, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 155, null, null, 'id', false, null, false, false, null),
  ('b-pukat', 'Pukat', 'Tere Liye', null, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 156, null, null, 'id', false, null, false, false, null),
  ('b-burlian', 'Burlian', 'Tere Liye', null, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 157, null, null, 'id', false, null, false, false, null),
  ('b-amelia', 'Amelia', 'Tere Liye', null, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 158, null, null, 'id', false, null, false, false, null),
  ('b-si-anak-badai', 'Si Anak Badai', 'Tere Liye', null, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 159, null, null, 'id', false, null, false, false, null),
  ('b-loversation', 'Loversation', 'Valerie Patkar', null, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 160, null, null, 'id', false, null, false, false, null),
  ('b-nonversation', 'Nonversation', 'Valerie Patkar', null, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 161, null, null, 'id', false, null, false, false, null),
  ('b-claires', 'Claires', 'Valerie Patkar', null, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 162, null, null, 'id', false, null, false, false, null),
  ('b-lukacita', 'Lukacita', 'Valerie Patkar', null, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 163, null, null, 'id', false, null, false, false, null),
  ('b-game-over', 'Game Over', 'Valerie Patkar', null, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 164, null, null, 'id', false, null, false, false, null),
  ('b-kami-bukan-sarjana-kertas', 'Kami (Bukan) Sarjana Kertas', 'J.S. Khairen', 2019, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 165, null, null, 'id', false, null, false, false, null),
  ('b-kami-bukan-jongos-berdasi', 'Kami (Bukan) Jongos Berdasi', 'J.S. Khairen', 2020, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 166, null, null, 'id', false, null, false, false, null),
  ('b-melangkah', 'Melangkah', 'J.S. Khairen', 2020, null, array['Sastra Indonesia', 'Fantasi']::text[], '', 'katalog', 167, null, null, 'id', false, null, false, false, null),
  ('b-di-tanah-lada', 'Di Tanah Lada', 'Ziggy Zezsyazeoviennazabrizkie', 2015, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 168, null, null, 'id', false, null, false, false, null),
  ('b-semua-ikan-di-langit', 'Semua Ikan di Langit', 'Ziggy Zezsyazeoviennazabrizkie', 2017, null, array['Sastra Indonesia', 'Fantasi']::text[], '', 'katalog', 169, null, null, 'id', false, null, false, false, null),
  ('b-kita-pergi-hari-ini', 'Kita Pergi Hari Ini', 'Ziggy Zezsyazeoviennazabrizkie', 2021, null, array['Sastra Indonesia', 'Fantasi']::text[], '', 'katalog', 170, null, null, 'id', false, null, false, false, null),
  ('b-jika-kita-tak-pernah-jadi-apa-apa', 'Jika Kita Tak Pernah Jadi Apa-Apa', 'Alvi Syahrin', 2020, null, array['Pengembangan Diri', 'Non-Fiksi']::text[], '', 'katalog', 171, null, null, 'id', false, null, false, false, null),
  ('b-nanti-kita-cerita-tentang-hari-ini', 'Nanti Kita Cerita tentang Hari Ini', 'Marchella FP', 2018, null, array['Pengembangan Diri', 'Puisi']::text[], '', 'katalog', 172, null, null, 'id', false, 'Best seller fenomenal', true, false, null),
  ('b-geez-ann', 'Geez & Ann', 'Rintik Sedu', 2017, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 173, null, null, 'id', false, null, false, false, null),
  ('b-mantappu-jiwa', 'Mantappu Jiwa', 'Jerome Polin Sijabat', 2019, null, array['Memoar', 'Pengembangan Diri']::text[], '', 'katalog', 174, null, null, 'id', false, 'Best seller fenomenal', true, false, null),
  ('b-catatan-najwa', 'Catatan Najwa', 'Najwa Shihab', 2016, null, array['Non-Fiksi']::text[], '', 'katalog', 175, null, null, 'id', false, null, false, false, null),
  ('b-resign', 'Resign!', 'Almira Bastari', 2018, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 176, null, null, 'id', false, null, false, false, null),
  ('b-critical-eleven', 'Critical Eleven', 'Ika Natassa', 2015, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 177, null, null, 'id', false, 'Favorit pembaca romansa', true, false, null),
  ('b-antologi-rasa', 'Antologi Rasa', 'Ika Natassa', 2011, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 178, null, null, 'id', false, null, false, false, null),
  ('b-the-architecture-of-love', 'The Architecture of Love', 'Ika Natassa', 2016, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 179, null, null, 'id', false, null, false, false, null),
  ('b-heartbreak-motel', 'Heartbreak Motel', 'Ika Natassa', 2022, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 180, null, null, 'id', false, null, false, false, null),
  ('b-divortiare', 'Divortiare', 'Ika Natassa', 2008, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 181, null, null, 'id', false, null, false, false, null),
  ('b-konspirasi-alam-semesta', 'Konspirasi Alam Semesta', 'Fiersa Besari', 2017, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 182, null, null, 'id', false, null, false, false, null),
  ('b-catatan-juang', 'Catatan Juang', 'Fiersa Besari', 2017, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 183, null, null, 'id', false, null, false, false, null),
  ('b-arah-langkah', 'Arah Langkah', 'Fiersa Besari', 2018, null, array['Memoar', 'Non-Fiksi']::text[], '', 'katalog', 184, null, null, 'id', false, null, false, false, null),
  ('b-11-11', '11:11', 'Fiersa Besari', 2018, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 185, null, null, 'id', false, null, false, false, null),
  ('b-filosofi-kopi', 'Filosofi Kopi', 'Dee Lestari', 2006, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 186, null, null, 'id', false, null, false, false, null),
  ('b-madre', 'Madre', 'Dee Lestari', 2011, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 187, null, null, 'id', false, null, false, false, null),
  ('b-supernova-akar', 'Supernova: Akar', 'Dee Lestari', 2002, null, array['Sastra Indonesia', 'Fiksi Ilmiah']::text[], '', 'katalog', 188, null, null, 'id', false, null, false, false, null),
  ('b-supernova-petir', 'Supernova: Petir', 'Dee Lestari', 2004, null, array['Sastra Indonesia', 'Fiksi Ilmiah']::text[], '', 'katalog', 189, null, null, 'id', false, null, false, false, null),
  ('b-supernova-partikel', 'Supernova: Partikel', 'Dee Lestari', 2012, null, array['Sastra Indonesia', 'Fiksi Ilmiah']::text[], '', 'katalog', 190, null, null, 'id', false, null, false, false, null),
  ('b-supernova-gelombang', 'Supernova: Gelombang', 'Dee Lestari', 2014, null, array['Sastra Indonesia', 'Fiksi Ilmiah']::text[], '', 'katalog', 191, null, null, 'id', false, null, false, false, null),
  ('b-supernova-inteligensi-embun-pagi', 'Supernova: Inteligensi Embun Pagi', 'Dee Lestari', 2016, null, array['Sastra Indonesia', 'Fiksi Ilmiah']::text[], '', 'katalog', 192, null, null, 'id', false, null, false, false, null),
  ('b-aroma-karsa', 'Aroma Karsa', 'Dee Lestari', 2018, null, array['Sastra Indonesia', 'Fantasi']::text[], '', 'katalog', 193, null, null, 'id', false, null, false, false, null),
  ('b-rapijali', 'Rapijali', 'Dee Lestari', 2021, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 194, null, null, 'id', false, null, false, false, null),
  ('b-edensor', 'Edensor', 'Andrea Hirata', 2007, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 195, null, null, 'id', false, null, false, false, null),
  ('b-maryamah-karpov', 'Maryamah Karpov', 'Andrea Hirata', 2008, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 196, null, null, 'id', false, null, false, false, null),
  ('b-padang-bulan', 'Padang Bulan', 'Andrea Hirata', 2010, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 197, null, null, 'id', false, null, false, false, null),
  ('b-ayah', 'Ayah', 'Andrea Hirata', 2015, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 198, null, null, 'id', false, null, false, false, null),
  ('b-guru-aini', 'Guru Aini', 'Andrea Hirata', 2020, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 199, null, null, 'id', false, null, false, false, null),
  ('b-ranah-3-warna', 'Ranah 3 Warna', 'Ahmad Fuadi', 2011, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 200, null, null, 'id', false, null, false, false, null),
  ('b-rantau-1-muara', 'Rantau 1 Muara', 'Ahmad Fuadi', 2013, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 201, null, null, 'id', false, null, false, false, null),
  ('b-namaku-alam', 'Namaku Alam', 'Leila S. Chudori', 2023, null, array['Sastra Indonesia', 'Fiksi Sejarah']::text[], '', 'katalog', 202, null, null, 'id', false, null, false, false, null),
  ('b-o', 'O', 'Eka Kurniawan', 2016, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 203, null, null, 'id', false, null, false, false, null),
  ('b-jejak-langkah', 'Jejak Langkah', 'Pramoedya Ananta Toer', 1985, null, array['Sastra Indonesia', 'Fiksi Sejarah']::text[], '', 'katalog', 204, null, null, 'id', false, null, false, false, null),
  ('b-rumah-kaca', 'Rumah Kaca', 'Pramoedya Ananta Toer', 1988, null, array['Sastra Indonesia', 'Fiksi Sejarah']::text[], '', 'katalog', 205, null, null, 'id', false, null, false, false, null),
  ('b-gadis-pantai', 'Gadis Pantai', 'Pramoedya Ananta Toer', 1987, null, array['Sastra Indonesia', 'Klasik']::text[], '', 'katalog', 206, null, null, 'id', false, null, false, false, null),
  ('b-arus-balik', 'Arus Balik', 'Pramoedya Ananta Toer', 1995, null, array['Sastra Indonesia', 'Fiksi Sejarah']::text[], '', 'katalog', 207, null, null, 'id', false, null, false, false, null),
  ('b-tenggelamnya-kapal-van-der-wijck', 'Tenggelamnya Kapal Van der Wijck', 'Hamka', 1938, null, array['Sastra Indonesia', 'Klasik', 'Romansa']::text[], '', 'katalog', 208, null, null, 'id', false, null, false, false, null),
  ('b-di-bawah-lindungan-ka-bah', 'Di Bawah Lindungan Ka''bah', 'Hamka', 1938, null, array['Sastra Indonesia', 'Klasik']::text[], '', 'katalog', 209, null, null, 'id', false, null, false, false, null),
  ('b-hujan-bulan-juni', 'Hujan Bulan Juni', 'Sapardi Djoko Damono', 1994, null, array['Puisi', 'Sastra Indonesia']::text[], '', 'katalog', 210, null, null, 'id', false, null, false, false, null),
  ('b-aku-ini-binatang-jalang', 'Aku Ini Binatang Jalang', 'Chairil Anwar', 1986, null, array['Puisi', 'Klasik']::text[], '', 'katalog', 211, null, null, 'id', false, null, false, false, null),
  ('b-entrok', 'Entrok', 'Okky Madasari', 2010, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 212, null, null, 'id', false, null, false, false, null),
  ('b-ketika-cinta-bertasbih', 'Ketika Cinta Bertasbih', 'Habiburrahman El Shirazy', 2007, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 213, null, null, 'id', false, null, false, false, null),
  ('b-5-cm', '5 cm', 'Donny Dhirgantoro', 2005, null, array['Sastra Indonesia', 'Fiksi']::text[], '', 'katalog', 214, null, null, 'id', false, null, false, false, null),
  ('b-dilan-dia-adalah-dilanku-tahun-1991', 'Dilan: Dia adalah Dilanku Tahun 1991', 'Pidi Baiq', 2015, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 215, null, null, 'id', false, null, false, false, null),
  ('b-milea-suara-dari-dilan', 'Milea: Suara dari Dilan', 'Pidi Baiq', 2016, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 216, null, null, 'id', false, null, false, false, null),
  ('b-ancika-dia-yang-bersamaku-tahun-1995', 'Ancika: Dia yang Bersamaku Tahun 1995', 'Pidi Baiq', 2021, null, array['Sastra Indonesia', 'Romansa']::text[], '', 'katalog', 217, null, null, 'id', false, null, false, false, null),
  ('b-danur', 'Danur', 'Risa Saraswati', 2011, null, array['Horor', 'Sastra Indonesia']::text[], '', 'katalog', 218, null, null, 'id', false, null, false, false, null),
  ('b-kambing-jantan', 'Kambing Jantan', 'Raditya Dika', 2005, null, array['Memoar', 'Sastra Indonesia']::text[], '', 'katalog', 219, null, null, 'id', false, null, false, false, null),
  ('b-marmut-merah-jambu', 'Marmut Merah Jambu', 'Raditya Dika', 2010, null, array['Memoar', 'Sastra Indonesia']::text[], '', 'katalog', 220, null, null, 'id', false, null, false, false, null),
  ('b-mariposa', 'Mariposa', 'Luluk HF', 2018, null, array['Young Adult', 'Romansa']::text[], '', 'katalog', 221, null, null, 'id', false, null, false, false, null),
  ('b-dear-nathan', 'Dear Nathan', 'Erisca Febriani', 2016, null, array['Young Adult', 'Romansa']::text[], '', 'katalog', 222, null, null, 'id', false, null, false, false, null),
  ('b-tales-from-the-cafe', 'Tales from the Cafe', 'Toshikazu Kawaguchi', 2017, null, array['Sastra Dunia', 'Fantasi']::text[], '', 'katalog', 223, null, null, 'id', false, null, false, false, null),
  ('b-before-your-memory-fades', 'Before Your Memory Fades', 'Toshikazu Kawaguchi', 2018, null, array['Sastra Dunia', 'Fantasi']::text[], '', 'katalog', 224, null, null, 'en', false, null, false, false, null),
  ('b-before-we-say-goodbye', 'Before We Say Goodbye', 'Toshikazu Kawaguchi', 2019, null, array['Sastra Dunia', 'Fantasi']::text[], '', 'katalog', 225, null, null, 'en', false, null, false, false, null),
  ('b-keajaiban-toko-kelontong-namiya', 'Keajaiban Toko Kelontong Namiya', 'Keigo Higashino', 2012, null, array['Sastra Dunia', 'Fantasi']::text[], '', 'katalog', 226, null, null, 'id', false, 'Selalu dicari', true, false, null),
  ('b-kesetiaan-mr-x', 'Kesetiaan Mr. X', 'Keigo Higashino', 2005, null, array['Misteri & Thriller', 'Sastra Dunia']::text[], '', 'katalog', 227, null, null, 'id', false, 'Misteri favorit', true, false, null),
  ('b-malice', 'Malice', 'Keigo Higashino', 1996, null, array['Misteri & Thriller', 'Sastra Dunia']::text[], '', 'katalog', 228, null, null, 'id', false, null, false, false, null),
  ('b-berani-tidak-disukai', 'Berani Tidak Disukai', 'Ichiro Kishimi & Fumitake Koga', 2013, null, array['Psikologi', 'Pengembangan Diri']::text[], '', 'katalog', 229, null, null, 'id', false, 'Selalu dicari', true, false, null),
  ('b-berani-bahagia', 'Berani Bahagia', 'Ichiro Kishimi & Fumitake Koga', 2016, null, array['Psikologi', 'Pengembangan Diri']::text[], '', 'katalog', 230, null, null, 'id', false, null, false, false, null),
  ('b-jika-kucing-lenyap-dari-dunia', 'Jika Kucing Lenyap dari Dunia', 'Genki Kawamura', 2012, null, array['Sastra Dunia', 'Fiksi']::text[], '', 'katalog', 231, null, null, 'id', false, null, false, false, null),
  ('b-kim-ji-yeong-lahir-tahun-1982', 'Kim Ji-yeong, Lahir Tahun 1982', 'Cho Nam-joo', 2016, null, array['Sastra Dunia', 'Fiksi']::text[], '', 'katalog', 232, null, null, 'id', false, 'Hits Korea', true, false, null),
  ('b-i-want-to-die-but-i-want-to-eat-tteokbokki', 'I Want to Die but I Want to Eat Tteokbokki', 'Baek Se-hee', 2018, null, array['Psikologi', 'Memoar']::text[], '', 'katalog', 233, null, null, 'en', false, null, false, false, null),
  ('b-welcome-to-the-hyunam-dong-bookshop', 'Welcome to the Hyunam-dong Bookshop', 'Hwang Bo-reum', 2022, null, array['Sastra Dunia', 'Fiksi']::text[], '', 'katalog', 234, null, null, 'en', false, null, false, false, null),
  ('b-the-dallergut-dream-department-store', 'The Dallergut Dream Department Store', 'Lee Mi-ye', 2020, null, array['Sastra Dunia', 'Fantasi']::text[], '', 'katalog', 235, null, null, 'en', false, null, false, false, null),
  ('b-the-things-you-can-see-only-when-you-slow-down', 'The Things You Can See Only When You Slow Down', 'Haemin Sunim', 2012, null, array['Pengembangan Diri', 'Filsafat']::text[], '', 'katalog', 236, null, null, 'en', false, null, false, false, null),
  ('b-dunia-sophie', 'Dunia Sophie', 'Jostein Gaarder', 1991, null, array['Filsafat', 'Sastra Dunia']::text[], '', 'katalog', 237, null, null, 'id', false, null, false, false, null),
  ('b-detective-conan-vol-1', 'Detective Conan Vol. 1', 'Gosho Aoyama', 1994, null, array['Komik & Manga', 'Misteri & Thriller']::text[], '', 'katalog', 238, null, null, 'ja', false, null, false, false, null),
  ('b-doraemon-vol-1', 'Doraemon Vol. 1', 'Fujiko F. Fujio', 1974, null, array['Komik & Manga']::text[], '', 'katalog', 239, null, null, 'ja', false, null, false, false, null),
  ('b-naruto-vol-1', 'Naruto Vol. 1', 'Masashi Kishimoto', 1999, null, array['Komik & Manga']::text[], '', 'katalog', 240, null, null, 'ja', false, null, false, false, null),
  ('b-attack-on-titan-vol-1', 'Attack on Titan Vol. 1', 'Hajime Isayama', 2010, null, array['Komik & Manga', 'Fantasi']::text[], '', 'katalog', 241, null, null, 'ja', false, null, false, false, null),
  ('b-jujutsu-kaisen-vol-1', 'Jujutsu Kaisen Vol. 1', 'Gege Akutami', 2018, null, array['Komik & Manga', 'Fantasi']::text[], '', 'katalog', 242, null, null, 'ja', false, null, false, false, null),
  ('b-spy-x-family-vol-1', 'Spy x Family Vol. 1', 'Tatsuya Endo', 2019, null, array['Komik & Manga']::text[], '', 'katalog', 243, null, null, 'ja', false, null, false, false, null),
  ('b-chainsaw-man-vol-1', 'Chainsaw Man Vol. 1', 'Tatsuki Fujimoto', 2019, null, array['Komik & Manga', 'Horor']::text[], '', 'katalog', 244, null, null, 'ja', false, null, false, false, null),
  ('b-it-starts-with-us', 'It Starts with Us', 'Colleen Hoover', 2022, null, array['Romansa', 'Fiksi']::text[], '', 'katalog', 245, null, null, 'en', false, null, false, false, null),
  ('b-ugly-love', 'Ugly Love', 'Colleen Hoover', 2014, null, array['Romansa']::text[], '', 'katalog', 246, null, null, 'en', false, null, false, false, null),
  ('b-twisted-love', 'Twisted Love', 'Ana Huang', 2021, null, array['Romansa']::text[], '', 'katalog', 247, null, null, 'en', false, null, false, false, null),
  ('b-the-love-hypothesis', 'The Love Hypothesis', 'Ali Hazelwood', 2021, null, array['Romansa']::text[], '', 'katalog', 248, null, null, 'en', false, null, false, false, null),
  ('b-book-lovers', 'Book Lovers', 'Emily Henry', 2022, null, array['Romansa']::text[], '', 'katalog', 249, null, null, 'en', false, null, false, false, null),
  ('b-beach-read', 'Beach Read', 'Emily Henry', 2020, null, array['Romansa']::text[], '', 'katalog', 250, null, null, 'en', false, null, false, false, null),
  ('b-people-we-meet-on-vacation', 'People We Meet on Vacation', 'Emily Henry', 2021, null, array['Romansa']::text[], '', 'katalog', 251, null, null, 'en', false, null, false, false, null),
  ('b-red-white-royal-blue', 'Red, White & Royal Blue', 'Casey McQuiston', 2019, null, array['Romansa']::text[], '', 'katalog', 252, null, null, 'en', false, null, false, false, null),
  ('b-daisy-jones-the-six', 'Daisy Jones & The Six', 'Taylor Jenkins Reid', 2019, null, array['Fiksi']::text[], '', 'katalog', 253, null, null, 'en', false, null, false, false, null),
  ('b-atmosphere', 'Atmosphere', 'Taylor Jenkins Reid', 2025, null, array['Fiksi Sejarah', 'Romansa']::text[], '', 'katalog', 254, null, null, 'en', false, null, false, false, null),
  ('b-a-court-of-mist-and-fury', 'A Court of Mist and Fury', 'Sarah J. Maas', 2016, null, array['Fantasi', 'Romansa']::text[], '', 'katalog', 255, null, null, 'en', false, null, false, false, null),
  ('b-throne-of-glass', 'Throne of Glass', 'Sarah J. Maas', 2012, null, array['Fantasi', 'Young Adult']::text[], '', 'katalog', 256, null, null, 'en', false, null, false, false, null),
  ('b-the-cruel-prince', 'The Cruel Prince', 'Holly Black', 2018, null, array['Fantasi', 'Young Adult']::text[], '', 'katalog', 257, null, null, 'en', false, null, false, false, null),
  ('b-powerless', 'Powerless', 'Lauren Roberts', 2023, null, array['Fantasi', 'Young Adult']::text[], '', 'katalog', 258, null, null, 'en', false, null, false, false, null),
  ('b-a-good-girl-s-guide-to-murder', 'A Good Girl''s Guide to Murder', 'Holly Jackson', 2019, null, array['Misteri & Thriller', 'Young Adult']::text[], '', 'katalog', 259, null, null, 'en', false, null, false, false, null),
  ('b-the-inheritance-games', 'The Inheritance Games', 'Jennifer Lynn Barnes', 2020, null, array['Misteri & Thriller', 'Young Adult']::text[], '', 'katalog', 260, null, null, 'en', false, null, false, false, null),
  ('b-we-were-liars', 'We Were Liars', 'E. Lockhart', 2014, null, array['Young Adult', 'Misteri & Thriller']::text[], '', 'katalog', 261, null, null, 'en', false, null, false, false, null),
  ('b-heartstopper-vol-1', 'Heartstopper Vol. 1', 'Alice Oseman', 2019, null, array['Komik & Manga', 'Young Adult']::text[], '', 'katalog', 262, null, null, 'en', false, null, false, false, null),
  ('b-the-fault-in-our-stars', 'The Fault in Our Stars', 'John Green', 2012, null, array['Young Adult', 'Romansa']::text[], '', 'katalog', 263, null, null, 'en', false, null, false, false, null),
  ('b-twilight', 'Twilight', 'Stephenie Meyer', 2005, null, array['Young Adult', 'Fantasi']::text[], '', 'katalog', 264, null, null, 'en', false, null, false, false, null),
  ('b-the-lightning-thief', 'The Lightning Thief', 'Rick Riordan', 2005, null, array['Fantasi', 'Young Adult']::text[], '', 'katalog', 265, null, null, 'en', false, null, false, false, null),
  ('b-catching-fire', 'Catching Fire', 'Suzanne Collins', 2009, null, array['Young Adult', 'Fiksi Ilmiah']::text[], '', 'katalog', 266, null, null, 'en', false, null, false, false, null),
  ('b-mockingjay', 'Mockingjay', 'Suzanne Collins', 2010, null, array['Young Adult', 'Fiksi Ilmiah']::text[], '', 'katalog', 267, null, null, 'en', false, null, false, false, null),
  ('b-harry-potter-and-the-chamber-of-secrets', 'Harry Potter and the Chamber of Secrets', 'J.K. Rowling', 1998, null, array['Fantasi', 'Young Adult']::text[], '', 'katalog', 268, null, null, 'en', false, null, false, false, null),
  ('b-harry-potter-and-the-prisoner-of-azkaban', 'Harry Potter and the Prisoner of Azkaban', 'J.K. Rowling', 1999, null, array['Fantasi', 'Young Adult']::text[], '', 'katalog', 269, null, null, 'en', false, null, false, false, null),
  ('b-harry-potter-and-the-goblet-of-fire', 'Harry Potter and the Goblet of Fire', 'J.K. Rowling', 2000, null, array['Fantasi', 'Young Adult']::text[], '', 'katalog', 270, null, null, 'en', false, null, false, false, null),
  ('b-harry-potter-and-the-order-of-the-phoenix', 'Harry Potter and the Order of the Phoenix', 'J.K. Rowling', 2003, null, array['Fantasi', 'Young Adult']::text[], '', 'katalog', 271, null, null, 'en', false, null, false, false, null),
  ('b-harry-potter-and-the-half-blood-prince', 'Harry Potter and the Half-Blood Prince', 'J.K. Rowling', 2005, null, array['Fantasi', 'Young Adult']::text[], '', 'katalog', 272, null, null, 'en', false, null, false, false, null),
  ('b-harry-potter-and-the-deathly-hallows', 'Harry Potter and the Deathly Hallows', 'J.K. Rowling', 2007, null, array['Fantasi', 'Young Adult']::text[], '', 'katalog', 273, null, null, 'en', false, null, false, false, null),
  ('b-the-housemaid-s-secret', 'The Housemaid''s Secret', 'Freida McFadden', 2023, null, array['Misteri & Thriller']::text[], '', 'katalog', 274, null, null, 'en', false, null, false, false, null),
  ('b-murder-on-the-orient-express', 'Murder on the Orient Express', 'Agatha Christie', 1934, null, array['Misteri & Thriller', 'Klasik']::text[], '', 'katalog', 275, null, null, 'en', false, null, false, false, null),
  ('b-and-then-there-were-none', 'And Then There Were None', 'Agatha Christie', 1939, null, array['Misteri & Thriller', 'Klasik']::text[], '', 'katalog', 276, null, null, 'en', false, null, false, false, null),
  ('b-the-boy-the-mole-the-fox-and-the-horse', 'The Boy, the Mole, the Fox and the Horse', 'Charlie Mackesy', 2019, null, array['Fiksi', 'Pengembangan Diri']::text[], '', 'katalog', 277, null, null, 'en', false, null, false, false, null),
  ('b-the-mountain-is-you', 'The Mountain Is You', 'Brianna Wiest', 2020, null, array['Pengembangan Diri', 'Psikologi']::text[], '', 'katalog', 278, null, null, 'en', false, null, false, false, null),
  ('b-the-7-habits-of-highly-effective-people', 'The 7 Habits of Highly Effective People', 'Stephen R. Covey', 1989, null, array['Pengembangan Diri', 'Bisnis & Keuangan']::text[], '', 'katalog', 279, null, null, 'en', false, null, false, false, null),
  ('b-how-to-win-friends-and-influence-people', 'How to Win Friends and Influence People', 'Dale Carnegie', 1936, null, array['Pengembangan Diri', 'Klasik']::text[], '', 'katalog', 280, null, null, 'en', false, null, false, false, null),
  ('b-the-power-of-habit', 'The Power of Habit', 'Charles Duhigg', 2012, null, array['Pengembangan Diri', 'Psikologi']::text[], '', 'katalog', 281, null, null, 'en', false, null, false, false, null),
  ('b-can-t-hurt-me', 'Can''t Hurt Me', 'David Goggins', 2018, null, array['Memoar', 'Pengembangan Diri']::text[], '', 'katalog', 282, null, null, 'en', false, null, false, false, null),
  ('b-outliers', 'Outliers', 'Malcolm Gladwell', 2008, null, array['Non-Fiksi', 'Psikologi']::text[], '', 'katalog', 283, null, null, 'en', false, null, false, false, null),
  ('b-homo-deus', 'Homo Deus', 'Yuval Noah Harari', 2015, null, array['Sejarah', 'Non-Fiksi']::text[], '', 'katalog', 284, null, null, 'en', false, null, false, false, null),
  ('b-nexus', 'Nexus', 'Yuval Noah Harari', 2024, null, array['Sejarah', 'Non-Fiksi']::text[], '', 'katalog', 285, null, null, 'en', false, null, false, false, null)
on conflict (id) do update set title = excluded.title, author = excluded.author, year = excluded.year,
  genres = excluded.genres, synopsis = excluded.synopsis, rank = excluded.rank,
  isbn = coalesce(excluded.isbn, public.books.isbn), publisher = coalesce(excluded.publisher, public.books.publisher),
  language = coalesce(excluded.language, public.books.language), hot = excluded.hot, trend_note = excluded.trend_note, fav = excluded.fav, intl = excluded.intl,
  cover_url = coalesce(excluded.cover_url, public.books.cover_url);

-- v3.1: judul lama yang diganti (Before the Coffee Gets Cold → Funiculi Funicula). Dihapus hanya bila belum dipakai siapa pun.
delete from public.books b where b.id = 'b-before-the-coffee-gets-cold'
  and not exists (select 1 from public.user_books x where x.book_id = b.id)
  and not exists (select 1 from public.diary_entries x where x.book_id = b.id)
  and not exists (select 1 from public.list_items x where x.book_id = b.id)
  and not exists (select 1 from public.listings x where x.book_id = b.id);
