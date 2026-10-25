-- Storage: uploads only through the backend (2026-10-25).
--
-- Every upload in the app goes through the backend (POST /api/storage/upload and the
-- posts / materials / support routes), which checks the bytes, the type and the size and
-- then writes with the service role. These four browser upload policies are left over from
-- before that and let a browser skip those checks and put any file, HTML included, into a
-- public bucket. "Allow Insert AI User Uploads" didn't even need a login. No code uses them
-- (checked frontend, admin and backend on 2026-10-25). The last object stored under a
-- user's token is an avatar from 2026-08-09, from before the backend's shared client
-- stopped switching to user tokens; existing files are untouched.
--
-- Kept in its own file: if Supabase refuses a statement here, the picture move in
-- 20261025150000_move_question_images.sql is not rolled back with it.

drop policy if exists "Allow Insert AI User Uploads" on storage.objects;
drop policy if exists "Authenticated users can upload avatars" on storage.objects;
drop policy if exists "Authenticated users can upload post images" on storage.objects;
drop policy if exists "Creator Upload Materials" on storage.objects;

-- Study Materials was removed on 2026-10-25 (20261025150200_study_materials_removed.sql).
-- Its 22 files stay, but private: no public link, no listing, no browser deletes. Nothing
-- links to them (checked tests, posts, avatars and notifications on 2026-10-25).
update storage.buckets set public = false where id = 'materials';
drop policy if exists "Public Access Materials" on storage.objects;
drop policy if exists "Creator Delete Materials" on storage.objects;

-- test-images now holds every question picture: images only, 10 MB each (the same
-- limits the backend applies), so even a service-role mistake can't store a page there.
update storage.buckets
   set allowed_mime_types = array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'],
       file_size_limit = 10485760
 where id = 'test-images';
