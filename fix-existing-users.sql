-- Bu SQL'i Supabase SQL Editor'da çalıştırın
-- Mevcut kullanıcılar için profil oluşturur

INSERT INTO profiles (user_id, email, is_active, profile_completed)
SELECT 
  id as user_id,
  email,
  true as is_active,
  false as profile_completed
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM profiles)
ON CONFLICT (user_id) DO NOTHING;
